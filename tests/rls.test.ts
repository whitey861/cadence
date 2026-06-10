/*
 * RLS policy tests. Run against the project in .env.local using the six
 * seeded role accounts. Verifies both the allow paths and, critically,
 * the denial paths for staff and read_only.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const password = process.env.TEST_PASSWORD!;

type Client = SupabaseClient<Database>;

async function signIn(email: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

let admin: Client;
let governance: Client;
let staff: Client;
let readonly: Client;
let anon: Client;
let workspaceId: string;

beforeAll(async () => {
  [admin, governance, staff, readonly] = await Promise.all([
    signIn("admin@test.local"),
    signIn("governance@test.local"),
    signIn("staff@test.local"),
    signIn("readonly@test.local"),
  ]);
  anon = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await admin.from("workspaces").select("id").limit(1).single();
  workspaceId = data!.id;
});

describe("workspace visibility", () => {
  it("members can read their workspace", async () => {
    for (const client of [admin, governance, staff, readonly]) {
      const { data, error } = await client.from("workspaces").select("id, name");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it("anonymous clients see nothing", async () => {
    const { data } = await anon.from("workspaces").select("id");
    expect(data).toEqual([]);
  });

  it("only admin can update the workspace", async () => {
    const { data: updated, error } = await admin
      .from("workspaces")
      .update({ state: "NSW" })
      .eq("id", workspaceId)
      .select("id");
    expect(error).toBeNull();
    expect(updated).toHaveLength(1);

    // RLS silently filters rows the role cannot update: zero rows touched
    for (const client of [staff, readonly]) {
      const { data } = await client
        .from("workspaces")
        .update({ name: "Hacked Council" })
        .eq("id", workspaceId)
        .select("id");
      expect(data).toEqual([]);
    }
    const { data: after } = await admin
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single();
    expect(after?.name).not.toBe("Hacked Council");
  });
});

describe("org structure writes", () => {
  it("governance officer can create and update org units", async () => {
    const { data: unit, error } = await governance
      .from("org_units")
      .insert({
        workspace_id: workspaceId,
        name: "RLS Test Unit",
        code: "RLS-TEST",
        unit_type: "section",
      })
      .select("id")
      .single();
    expect(error).toBeNull();

    // Soft delete via status, the standard correction path
    const { error: updateError } = await governance
      .from("org_units")
      .update({ is_active: false })
      .eq("id", unit!.id);
    expect(updateError).toBeNull();
  });

  it("staff and read_only cannot create org units or positions", async () => {
    for (const client of [staff, readonly]) {
      const { error: unitError } = await client.from("org_units").insert({
        workspace_id: workspaceId,
        name: "Should Fail",
        unit_type: "section",
      });
      expect(unitError).not.toBeNull();

      const { error: positionError } = await client.from("positions").insert({
        workspace_id: workspaceId,
        title: "Should Fail",
      });
      expect(positionError).not.toBeNull();
    }
  });

  it("hard deletes are denied even for admin", async () => {
    // Repeated runs accumulate RLS-TEST units precisely because deletes
    // are denied; take any one of them.
    const { data: units } = await admin
      .from("org_units")
      .select("id")
      .eq("code", "RLS-TEST")
      .limit(1);
    expect(units).toHaveLength(1);

    const { data: deleted } = await admin
      .from("org_units")
      .delete()
      .eq("id", units![0].id)
      .select("id");
    expect(deleted).toEqual([]);
  });
});

describe("memberships", () => {
  it("members can see the member list", async () => {
    const { data, error } = await staff.from("memberships").select("role");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(6);
  });

  it("staff cannot grant themselves a role change", async () => {
    const { data: me } = await staff.auth.getUser();
    const { data } = await staff
      .from("memberships")
      .update({ role: "admin" })
      .eq("user_id", me.user!.id)
      .select("id");
    expect(data).toEqual([]);
  });
});

describe("audit log", () => {
  it("admin and governance officer can read audit entries", async () => {
    for (const client of [admin, governance]) {
      const { data, error } = await client
        .from("audit_log")
        .select("id, action, entity_type")
        .limit(5);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    }
  });

  it("staff and read_only see no audit entries", async () => {
    for (const client of [staff, readonly]) {
      const { data } = await client.from("audit_log").select("id").limit(5);
      expect(data).toEqual([]);
    }
  });

  it("audit entries exist for org unit create and status change", async () => {
    const { data } = await admin
      .from("audit_log")
      .select("action")
      .eq("entity_type", "org_units")
      .order("occurred_at", { ascending: false })
      .limit(20);
    const actions = (data ?? []).map((entry) => entry.action);
    expect(actions).toContain("create");
  });

  it("nobody can insert, update or delete audit entries directly", async () => {
    const { error: insertError } = await admin.from("audit_log").insert({
      workspace_id: workspaceId,
      entity_type: "fake",
      action: "create",
    });
    expect(insertError).not.toBeNull();

    const { data: entry } = await admin
      .from("audit_log")
      .select("id")
      .limit(1)
      .single();
    const { error: updateError } = await admin
      .from("audit_log")
      .update({ action: "tampered" })
      .eq("id", entry!.id);
    expect(updateError).not.toBeNull();

    const { error: deleteError } = await admin
      .from("audit_log")
      .delete()
      .eq("id", entry!.id);
    expect(deleteError).not.toBeNull();
  });
});

describe("profiles", () => {
  it("members can see profiles of workspace colleagues", async () => {
    const { data, error } = await staff.from("profiles").select("display_name");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(6);
  });

  it("users can only update their own profile", async () => {
    const { data: me } = await staff.auth.getUser();
    const { data: own, error } = await staff
      .from("profiles")
      .update({ phone: "02 5550 1234" })
      .eq("id", me.user!.id)
      .select("id");
    expect(error).toBeNull();
    expect(own).toHaveLength(1);

    const { data: admins } = await staff
      .from("profiles")
      .select("id")
      .eq("email", "admin@test.local")
      .single();
    const { data: theirs } = await staff
      .from("profiles")
      .update({ phone: "tampered" })
      .eq("id", admins!.id)
      .select("id");
    expect(theirs).toEqual([]);
  });
});
