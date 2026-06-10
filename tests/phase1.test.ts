/*
 * Phase 1 tests: delegations and policies. RLS denial paths, lifecycle state
 * machine, supersede copy semantics and acknowledgment predicates. Runs ONLY
 * against the local stack (.env.test); creates its own fixtures so repeated
 * runs do not interfere with the seeded demo rows.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

config({ path: ".env.test" });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1")) {
  throw new Error("Tests must run against the local Supabase stack (.env.test)");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

let governance: Client;
let staff: Client;
let readonly: Client;
let service: Client;
let workspaceId: string;
let staffUserId: string;
let staffPositionId: string; // POS-0006, occupied by staff@test.local

beforeAll(async () => {
  [governance, staff, readonly] = await Promise.all([
    signIn("governance@test.local"),
    signIn("staff@test.local"),
    signIn("readonly@test.local"),
  ]);
  service = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: ws } = await service
    .from("workspaces")
    .select("id")
    .eq("slug", "casuarina")
    .single();
  workspaceId = ws!.id;

  const { data: me } = await staff.auth.getUser();
  staffUserId = me.user!.id;

  const { data: pos } = await service
    .from("positions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("position_code", "POS-0006")
    .single();
  staffPositionId = pos!.id;
});

// Governance creates a draft instrument with one delegation assigned to the
// staff member's position; returns ids for downstream assertions.
async function createDraftInstrument(title: string) {
  const { data: instrument, error } = await governance
    .from("delegation_instruments")
    .insert({
      workspace_id: workspaceId,
      title,
      instrument_type: "gm_to_staff",
    })
    .select("id, family_id, version")
    .single();
  expect(error).toBeNull();

  const { data: delegation } = await governance
    .from("delegations")
    .insert({
      workspace_id: workspaceId,
      delegation_instrument_id: instrument!.id,
      function_title: `Test function for ${title}`,
      conditions_limitations: "Test only",
    })
    .select("id")
    .single();

  const { data: assignment } = await governance
    .from("delegation_assignments")
    .insert({
      workspace_id: workspaceId,
      delegation_id: delegation!.id,
      position_id: staffPositionId,
      effective_from: "2025-01-01",
    })
    .select("id")
    .single();

  return { instrument: instrument!, delegationId: delegation!.id, assignmentId: assignment!.id };
}

describe("legislative reference data", () => {
  it("is readable by every member", async () => {
    for (const client of [staff, readonly]) {
      const { data, error } = await client
        .from("legislative_provisions")
        .select("reference")
        .limit(5);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThan(0);
    }
  });

  it("is not writable by clients, even governance", async () => {
    const { error } = await governance
      .from("legislative_instruments")
      .insert({ name: "Fake Act 2026" });
    expect(error).not.toBeNull();
  });
});

describe("instrument lifecycle", () => {
  it("staff and readonly cannot create instruments", async () => {
    for (const client of [staff, readonly]) {
      const { error } = await client.from("delegation_instruments").insert({
        workspace_id: workspaceId,
        title: "Unauthorised instrument",
        instrument_type: "gm_to_staff",
      });
      expect(error).not.toBeNull();
    }
  });

  it("adopting requires an adopted date and freezes content", async () => {
    const { instrument } = await createDraftInstrument(`Lifecycle A ${Date.now()}`);

    const { error: adoptError } = await governance.rpc("adopt_delegation_instrument", {
      p_instrument_id: instrument.id,
      p_adopted_date: "2025-06-01",
    });
    expect(adoptError).toBeNull();

    // Content edits on the adopted instrument are rejected by trigger
    const { error: editError } = await governance
      .from("delegation_instruments")
      .update({ title: "Tampered title" })
      .eq("id", instrument.id);
    expect(editError).not.toBeNull();
    expect(editError!.message).toContain("immutable");

    // Child rows are frozen too
    const { error: childError } = await governance
      .from("delegations")
      .insert({
        workspace_id: workspaceId,
        delegation_instrument_id: instrument.id,
        function_title: "Late addition",
      });
    expect(childError).not.toBeNull();
  });

  it("staff cannot adopt via the RPC because RLS blocks the underlying update", async () => {
    const { instrument } = await createDraftInstrument(`Lifecycle B ${Date.now()}`);
    const { error } = await staff.rpc("adopt_delegation_instrument", {
      p_instrument_id: instrument.id,
      p_adopted_date: "2025-06-01",
    });
    expect(error).not.toBeNull();
  });

  it("assignments under an adopted instrument can only be revoked", async () => {
    const { instrument, assignmentId } = await createDraftInstrument(`Lifecycle C ${Date.now()}`);
    await governance.rpc("adopt_delegation_instrument", {
      p_instrument_id: instrument.id,
      p_adopted_date: "2025-06-01",
    });

    // Retargeting to a different position is blocked
    const { data: otherPos } = await service
      .from("positions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("position_code", "POS-0005")
      .single();
    const { error: retargetError } = await governance
      .from("delegation_assignments")
      .update({ position_id: otherPos!.id })
      .eq("id", assignmentId);
    expect(retargetError).not.toBeNull();

    // Revocation is allowed
    const { error: revokeError } = await governance
      .from("delegation_assignments")
      .update({ status: "revoked", effective_to: "2025-06-30" })
      .eq("id", assignmentId);
    expect(revokeError).toBeNull();

    // Reinstatement is blocked
    const { error: reinstateError } = await governance
      .from("delegation_assignments")
      .update({ status: "active" })
      .eq("id", assignmentId);
    expect(reinstateError).not.toBeNull();
  });
});

describe("supersede semantics", () => {
  it("copies delegations, provisions and assignments into a new draft and supersedes on adoption", async () => {
    const { instrument, delegationId } = await createDraftInstrument(`Supersede ${Date.now()}`);

    // Link a provision so the copy has something to carry over
    const { data: provision } = await service
      .from("legislative_provisions")
      .select("id")
      .limit(1)
      .single();
    await governance.from("delegation_provisions").insert({
      workspace_id: workspaceId,
      delegation_id: delegationId,
      provision_id: provision!.id,
    });

    await governance.rpc("adopt_delegation_instrument", {
      p_instrument_id: instrument.id,
      p_adopted_date: "2025-06-01",
    });

    const { data: draftId, error: supersedeError } = await governance.rpc(
      "supersede_delegation_instrument",
      { p_instrument_id: instrument.id }
    );
    expect(supersedeError).toBeNull();

    const { data: draft } = await governance
      .from("delegation_instruments")
      .select("id, version, status, supersedes_id, family_id")
      .eq("id", draftId!)
      .single();
    expect(draft!.version).toBe(instrument.version + 1);
    expect(draft!.status).toBe("draft");
    expect(draft!.supersedes_id).toBe(instrument.id);
    expect(draft!.family_id).toBe(instrument.family_id);

    // Deep copy carried the delegation, its provision link and the assignment
    const { data: copiedDelegations } = await governance
      .from("delegations")
      .select("id, delegation_provisions(id), delegation_assignments(id)")
      .eq("delegation_instrument_id", draftId!);
    expect(copiedDelegations).toHaveLength(1);
    expect(copiedDelegations![0].delegation_provisions).toHaveLength(1);
    expect(copiedDelegations![0].delegation_assignments).toHaveLength(1);

    // A second concurrent supersede of the same instrument fails (one draft per family)
    const { error: secondError } = await governance.rpc("supersede_delegation_instrument", {
      p_instrument_id: instrument.id,
    });
    expect(secondError).not.toBeNull();

    // Adopting the successor flips the predecessor to superseded
    await governance.rpc("adopt_delegation_instrument", {
      p_instrument_id: draftId!,
      p_adopted_date: "2025-07-01",
    });
    const { data: predecessor } = await governance
      .from("delegation_instruments")
      .select("status")
      .eq("id", instrument.id)
      .single();
    expect(predecessor!.status).toBe("superseded");
  });
});

describe("delegation acknowledgments", () => {
  async function adoptedAssignmentForStaff() {
    const { instrument, assignmentId } = await createDraftInstrument(`Acks ${Date.now()}`);
    await governance.rpc("adopt_delegation_instrument", {
      p_instrument_id: instrument.id,
      p_adopted_date: "2025-06-01",
    });
    const { data: occupancy } = await service
      .from("position_assignments")
      .select("id")
      .eq("position_id", staffPositionId)
      .eq("user_id", staffUserId)
      .single();
    return { assignmentId, occupancyId: occupancy!.id };
  }

  it("the occupant can acknowledge and the version is derived server-side", async () => {
    const { assignmentId, occupancyId } = await adoptedAssignmentForStaff();

    const { data: ack, error } = await staff
      .from("delegation_acknowledgments")
      .insert({
        workspace_id: workspaceId,
        delegation_assignment_id: assignmentId,
        position_assignment_id: occupancyId,
        user_id: staffUserId,
        instrument_version: 999, // ignored: trigger derives the real version
      })
      .select("instrument_version")
      .single();
    expect(error).toBeNull();
    expect(ack!.instrument_version).toBe(1);

    // Duplicate is rejected by the uniqueness constraint
    const { error: dupError } = await staff.from("delegation_acknowledgments").insert({
      workspace_id: workspaceId,
      delegation_assignment_id: assignmentId,
      position_assignment_id: occupancyId,
      user_id: staffUserId,
      instrument_version: 1,
    });
    expect(dupError).not.toBeNull();

    // Without an update policy RLS filters every row for governance: no rows touched
    const { data: govAttempt } = await governance
      .from("delegation_acknowledgments")
      .update({ instrument_version: 2 })
      .eq("delegation_assignment_id", assignmentId)
      .select("id");
    expect(govAttempt).toEqual([]);

    // And the block_mutation trigger stops even the service role
    const { error: updateError } = await service
      .from("delegation_acknowledgments")
      .update({ instrument_version: 2 })
      .eq("delegation_assignment_id", assignmentId);
    expect(updateError).not.toBeNull();
  });

  it("non-occupants cannot acknowledge someone else's assignment", async () => {
    const { assignmentId, occupancyId } = await adoptedAssignmentForStaff();

    // governance does not occupy POS-0006
    const { error } = await governance.from("delegation_acknowledgments").insert({
      workspace_id: workspaceId,
      delegation_assignment_id: assignmentId,
      position_assignment_id: occupancyId,
      user_id: staffUserId,
      instrument_version: 1,
    });
    expect(error).not.toBeNull();

    // readonly occupies nothing
    const { error: roError } = await readonly.from("delegation_acknowledgments").insert({
      workspace_id: workspaceId,
      delegation_assignment_id: assignmentId,
      position_assignment_id: occupancyId,
      user_id: staffUserId,
      instrument_version: 1,
    });
    expect(roError).not.toBeNull();
  });

  it("acknowledgments against a superseded version are impossible", async () => {
    const { assignmentId, occupancyId } = await adoptedAssignmentForStaff();

    const { data: assignment } = await service
      .from("delegation_assignments")
      .select("delegation_id, delegations(delegation_instrument_id)")
      .eq("id", assignmentId)
      .single();
    const instrumentId = assignment!.delegations!.delegation_instrument_id;

    const { data: draftId } = await governance.rpc("supersede_delegation_instrument", {
      p_instrument_id: instrumentId,
    });
    await governance.rpc("adopt_delegation_instrument", {
      p_instrument_id: draftId!,
      p_adopted_date: "2025-07-01",
    });

    // The old assignment now belongs to a superseded instrument
    const { error } = await staff.from("delegation_acknowledgments").insert({
      workspace_id: workspaceId,
      delegation_assignment_id: assignmentId,
      position_assignment_id: occupancyId,
      user_id: staffUserId,
      instrument_version: 1,
    });
    expect(error).not.toBeNull();
  });

  it("the register view is truthful for staff: member-wide ack visibility", async () => {
    const { data, error } = await staff
      .from("delegations_register")
      .select("acknowledgment_pending, occupant_user_id")
      .limit(200);
    expect(error).toBeNull();
    // Seeded data: governance/manager/admin/risk rows are acknowledged and
    // staff can see that, so not every occupied row reads pending.
    const occupied = data!.filter((r) => r.occupant_user_id !== null);
    expect(occupied.some((r) => r.acknowledgment_pending === false)).toBe(true);
  });
});

describe("policy lifecycle and acknowledgments", () => {
  async function createAdoptedPolicy(number: string, scope: "all_staff" | null = "all_staff") {
    const { data: policy } = await governance
      .from("policies")
      .insert({
        workspace_id: workspaceId,
        title: `Test Policy ${number}`,
        policy_number: number,
        category: "Test",
        review_cycle_months: 24,
      })
      .select("id, version")
      .single();

    let requirementId: string | null = null;
    if (scope) {
      const { data: requirement } = await governance
        .from("policy_ack_requirements")
        .insert({ workspace_id: workspaceId, policy_id: policy!.id, scope })
        .select("id")
        .single();
      requirementId = requirement!.id;
    }

    const { error } = await governance.rpc("adopt_policy", {
      p_policy_id: policy!.id,
      p_adopted_date: "2025-06-01",
    });
    expect(error).toBeNull();
    return { policyId: policy!.id, requirementId };
  }

  it("staff cannot create policies", async () => {
    const { error } = await staff.from("policies").insert({
      workspace_id: workspaceId,
      title: "Unauthorised policy",
    });
    expect(error).not.toBeNull();
  });

  it("adoption sets next_review_date and opens a review task", async () => {
    const { policyId } = await createAdoptedPolicy(`TST-${Date.now()}`);

    const { data: policy } = await governance
      .from("policies")
      .select("next_review_date, adopted_date")
      .eq("id", policyId)
      .single();
    expect(policy!.next_review_date).toBe("2027-06-01");

    const { data: tasks } = await governance
      .from("review_tasks")
      .select("id, due_date, status")
      .eq("entity_type", "policy")
      .eq("entity_id", policyId);
    expect(tasks).toHaveLength(1);
    expect(tasks![0].due_date).toBe("2027-06-01");
    expect(tasks![0].status).toBe("open");
  });

  it("adopted policy content is frozen; requirements are frozen too", async () => {
    const { policyId, requirementId } = await createAdoptedPolicy(`TST-F-${Date.now()}`);

    const { error: editError } = await governance
      .from("policies")
      .update({ title: "Tampered" })
      .eq("id", policyId);
    expect(editError).not.toBeNull();

    const { error: reqError } = await governance
      .from("policy_ack_requirements")
      .delete()
      .eq("id", requirementId!);
    expect(reqError).not.toBeNull();
  });

  it("staff can acknowledge an all_staff requirement; readonly cannot", async () => {
    const { requirementId } = await createAdoptedPolicy(`TST-A-${Date.now()}`);

    const { data: ack, error } = await staff
      .from("policy_acknowledgments")
      .insert({
        workspace_id: workspaceId,
        requirement_id: requirementId!,
        user_id: staffUserId,
        policy_version: 999,
      })
      .select("policy_version")
      .single();
    expect(error).toBeNull();
    expect(ack!.policy_version).toBe(1);

    const { data: ro } = await readonly.auth.getUser();
    const { error: roError } = await readonly.from("policy_acknowledgments").insert({
      workspace_id: workspaceId,
      requirement_id: requirementId!,
      user_id: ro.user!.id,
      policy_version: 1,
    });
    expect(roError).not.toBeNull();
  });

  it("supersede works from under_review and the predecessor is superseded on adoption", async () => {
    const { policyId } = await createAdoptedPolicy(`TST-S-${Date.now()}`, null);

    await governance.from("policies").update({ status: "under_review" }).eq("id", policyId);

    const { data: draftId, error } = await governance.rpc("supersede_policy", {
      p_policy_id: policyId,
    });
    expect(error).toBeNull();

    await governance.rpc("adopt_policy", {
      p_policy_id: draftId!,
      p_adopted_date: "2025-08-01",
    });

    const { data: predecessor } = await governance
      .from("policies")
      .select("status")
      .eq("id", policyId)
      .single();
    expect(predecessor!.status).toBe("superseded");
  });
});

describe("review tasks", () => {
  it("the assigned position occupant can complete; unrelated staff cannot", async () => {
    const { data: task } = await governance
      .from("review_tasks")
      .insert({
        workspace_id: workspaceId,
        entity_type: "policy",
        entity_id: crypto.randomUUID(),
        title: "Test review task",
        due_date: "2026-09-01",
        assigned_position_id: staffPositionId,
      })
      .select("id")
      .single();

    // readonly occupies no position and is not governance
    const { data: roAttempt } = await readonly
      .from("review_tasks")
      .update({ status: "complete" })
      .eq("id", task!.id)
      .select("id");
    expect(roAttempt).toEqual([]);

    // staff occupies the assigned position
    const { error } = await staff
      .from("review_tasks")
      .update({ status: "complete", completed_at: new Date().toISOString(), completed_by: staffUserId })
      .eq("id", task!.id);
    expect(error).toBeNull();
  });
});
