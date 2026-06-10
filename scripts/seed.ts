/*
 * Seeds reference data and the six role test accounts.
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and
 * TEST_PASSWORD in the environment (.env.local is loaded automatically).
 * Idempotent: safe to run repeatedly.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const testPassword = process.env.TEST_PASSWORD;

if (!url || !serviceKey || !testPassword) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or TEST_PASSWORD"
  );
  process.exit(1);
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_ACCOUNTS = [
  { email: "admin@test.local", displayName: "Ada Admin", role: "admin" },
  { email: "governance@test.local", displayName: "Grace Governance", role: "governance_officer" },
  { email: "risk@test.local", displayName: "Rohan Risk", role: "risk_owner" },
  { email: "manager@test.local", displayName: "Mia Manager", role: "manager" },
  { email: "staff@test.local", displayName: "Sam Staff", role: "staff" },
  { email: "readonly@test.local", displayName: "Riley Readonly", role: "read_only" },
] as const;

async function ensureUser(email: string, displayName: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: testPassword!,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error || !data.user) {
    throw new Error(`Failed to create ${email}: ${error?.message}`);
  }
  return data.user.id;
}

async function main() {
  // Workspace
  const { data: existingWs } = await admin
    .from("workspaces")
    .select("id")
    .eq("slug", "casuarina")
    .maybeSingle();

  let wsId = existingWs?.id;
  if (!wsId) {
    const { data: ws, error } = await admin
      .from("workspaces")
      .insert({
        name: "Casuarina Shire Council",
        slug: "casuarina",
        state: "NSW",
        settings: { timezone: "Australia/Sydney" },
      })
      .select("id")
      .single();
    if (error) throw error;
    wsId = ws.id;
  }
  console.log(`Workspace: ${wsId}`);

  // Org units
  const unitSpecs = [
    { name: "Office of the General Manager", code: "OGM", unit_type: "directorate", parent: null },
    { name: "Corporate Services", code: "CS", unit_type: "directorate", parent: null },
    { name: "Infrastructure and Environment", code: "IE", unit_type: "directorate", parent: null },
    { name: "Community and Place", code: "CP", unit_type: "directorate", parent: null },
    { name: "Governance and Risk", code: "CS-GR", unit_type: "division", parent: "CS" },
  ] as const;

  const unitIds: Record<string, string> = {};
  for (const spec of unitSpecs) {
    const { data: existing } = await admin
      .from("org_units")
      .select("id")
      .eq("workspace_id", wsId)
      .eq("code", spec.code)
      .maybeSingle();
    if (existing) {
      unitIds[spec.code] = existing.id;
      continue;
    }
    const { data: unit, error } = await admin
      .from("org_units")
      .insert({
        workspace_id: wsId,
        name: spec.name,
        code: spec.code,
        unit_type: spec.unit_type,
        parent_id: spec.parent ? unitIds[spec.parent] : null,
      })
      .select("id")
      .single();
    if (error) throw error;
    unitIds[spec.code] = unit.id;
  }
  console.log(`Org units: ${Object.keys(unitIds).length}`);

  // Positions
  const positionSpecs = [
    { title: "General Manager", code: "POS-0001", unit: "OGM" },
    { title: "Director Corporate Services", code: "POS-0002", unit: "CS" },
    { title: "Manager Governance and Risk", code: "POS-0003", unit: "CS-GR" },
    { title: "Governance Officer", code: "POS-0004", unit: "CS-GR" },
    { title: "Risk and Audit Coordinator", code: "POS-0005", unit: "CS-GR" },
    { title: "Administration Officer", code: "POS-0006", unit: "CS" },
  ] as const;

  const positionIds: Record<string, string> = {};
  for (const spec of positionSpecs) {
    const { data: existing } = await admin
      .from("positions")
      .select("id")
      .eq("workspace_id", wsId)
      .eq("position_code", spec.code)
      .maybeSingle();
    if (existing) {
      positionIds[spec.code] = existing.id;
      continue;
    }
    const { data: position, error } = await admin
      .from("positions")
      .insert({
        workspace_id: wsId,
        title: spec.title,
        position_code: spec.code,
        org_unit_id: unitIds[spec.unit],
      })
      .select("id")
      .single();
    if (error) throw error;
    positionIds[spec.code] = position.id;
  }
  console.log(`Positions: ${Object.keys(positionIds).length}`);

  // Test users and memberships
  const assignments: Record<string, string> = {
    "admin@test.local": "POS-0002",
    "governance@test.local": "POS-0004",
    "risk@test.local": "POS-0005",
    "manager@test.local": "POS-0003",
    "staff@test.local": "POS-0006",
  };

  for (const account of TEST_ACCOUNTS) {
    const userId = await ensureUser(account.email, account.displayName);

    const { error: membershipError } = await admin
      .from("memberships")
      .upsert(
        { workspace_id: wsId, user_id: userId, role: account.role, status: "active" },
        { onConflict: "workspace_id,user_id" }
      );
    if (membershipError) throw membershipError;

    const positionCode = assignments[account.email];
    if (positionCode) {
      const { data: existing } = await admin
        .from("position_assignments")
        .select("id")
        .eq("workspace_id", wsId)
        .eq("position_id", positionIds[positionCode])
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        const { error } = await admin.from("position_assignments").insert({
          workspace_id: wsId,
          position_id: positionIds[positionCode],
          user_id: userId,
          assignment_type: "substantive",
          start_date: "2024-07-01",
        });
        if (error) throw error;
      }
    }
    console.log(`Seeded ${account.email} (${account.role})`);
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
