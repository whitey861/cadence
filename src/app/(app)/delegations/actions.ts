"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const instrumentSchema = z.object({
  title: z.string().min(3, "Title is required"),
  instrument_type: z.enum(["council_to_gm", "gm_to_staff"]),
});

export async function createInstrument(input: unknown): Promise<ActionResult> {
  const parsed = instrumentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return { ok: false, error: "No workspace" };

  const { data, error } = await supabase
    .from("delegation_instruments")
    .insert({ workspace_id: context.workspace.id, ...parsed.data })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/delegations");
  return { ok: true, id: data.id };
}

export async function renameInstrument(id: string, title: string): Promise<ActionResult> {
  if (title.trim().length < 3) return { ok: false, error: "Title is required" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("delegation_instruments")
    .update({ title: title.trim() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/delegations/${id}`);
  return { ok: true };
}

const adoptSchema = z.object({
  instrumentId: z.uuid(),
  adoptedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the adoption date"),
  resolutionReference: z.string().optional(),
});

export async function adoptInstrument(input: unknown): Promise<ActionResult> {
  const parsed = adoptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("adopt_delegation_instrument", {
    p_instrument_id: parsed.data.instrumentId,
    p_adopted_date: parsed.data.adoptedDate,
    p_resolution_reference: parsed.data.resolutionReference || undefined,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/delegations");
  revalidatePath(`/delegations/${parsed.data.instrumentId}`);
  return { ok: true };
}

export async function supersedeInstrument(instrumentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("supersede_delegation_instrument", {
    p_instrument_id: instrumentId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/delegations");
  return { ok: true, id: data ?? undefined };
}

export async function archiveInstrument(instrumentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("delegation_instruments")
    .update({ status: "archived" })
    .eq("id", instrumentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/delegations");
  return { ok: true };
}

const delegationSchema = z.object({
  instrumentId: z.uuid(),
  delegationId: z.uuid().optional(),
  function_title: z.string().min(3, "Function title is required"),
  function_description: z.string().optional(),
  conditions_limitations: z.string().optional(),
  provisionIds: z.array(z.uuid()).default([]),
  positionIds: z.array(z.uuid()).default([]),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function saveDelegation(input: unknown): Promise<ActionResult> {
  const parsed = delegationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const values = parsed.data;

  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return { ok: false, error: "No workspace" };
  const ws = context.workspace.id;

  let delegationId = values.delegationId;
  if (delegationId) {
    const { error } = await supabase
      .from("delegations")
      .update({
        function_title: values.function_title,
        function_description: values.function_description || null,
        conditions_limitations: values.conditions_limitations || null,
      })
      .eq("id", delegationId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("delegations")
      .insert({
        workspace_id: ws,
        delegation_instrument_id: values.instrumentId,
        function_title: values.function_title,
        function_description: values.function_description || null,
        conditions_limitations: values.conditions_limitations || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    delegationId = data.id;
  }

  // Reconcile provision links (draft instruments only, enforced by triggers)
  const { data: existingProvisions } = await supabase
    .from("delegation_provisions")
    .select("id, provision_id")
    .eq("delegation_id", delegationId);
  const current = new Set((existingProvisions ?? []).map((p) => p.provision_id));
  const wanted = new Set(values.provisionIds);

  const toRemove = (existingProvisions ?? []).filter((p) => !wanted.has(p.provision_id));
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("delegation_provisions")
      .delete()
      .in("id", toRemove.map((p) => p.id));
    if (error) return { ok: false, error: error.message };
  }
  const toAdd = values.provisionIds.filter((id) => !current.has(id));
  if (toAdd.length > 0) {
    const { error } = await supabase.from("delegation_provisions").insert(
      toAdd.map((provision_id) => ({
        workspace_id: ws,
        delegation_id: delegationId!,
        provision_id,
      }))
    );
    if (error) return { ok: false, error: error.message };
  }

  // Reconcile position assignments
  const { data: existingAssignments } = await supabase
    .from("delegation_assignments")
    .select("id, position_id")
    .eq("delegation_id", delegationId)
    .eq("status", "active");
  const currentPositions = new Set((existingAssignments ?? []).map((a) => a.position_id));
  const wantedPositions = new Set(values.positionIds);

  const assignmentsToRemove = (existingAssignments ?? []).filter(
    (a) => !wantedPositions.has(a.position_id)
  );
  if (assignmentsToRemove.length > 0) {
    const { error } = await supabase
      .from("delegation_assignments")
      .delete()
      .in("id", assignmentsToRemove.map((a) => a.id));
    if (error) return { ok: false, error: error.message };
  }
  const positionsToAdd = values.positionIds.filter((id) => !currentPositions.has(id));
  if (positionsToAdd.length > 0) {
    const { error } = await supabase.from("delegation_assignments").insert(
      positionsToAdd.map((position_id) => ({
        workspace_id: ws,
        delegation_id: delegationId!,
        position_id,
        effective_from: values.effective_from,
      }))
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/delegations/${values.instrumentId}`);
  return { ok: true, id: delegationId };
}

export async function deleteDelegation(delegationId: string, instrumentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("delegations").delete().eq("id", delegationId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/delegations/${instrumentId}`);
  return { ok: true };
}

export async function revokeAssignment(assignmentId: string, instrumentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const { error } = await supabase
    .from("delegation_assignments")
    .update({ status: "revoked", effective_to: today })
    .eq("id", assignmentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/delegations/${instrumentId}`);
  revalidatePath("/delegations/register");
  return { ok: true };
}

export async function acknowledgeDelegation(
  delegationAssignmentId: string,
  positionAssignmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("delegation_acknowledgments").insert({
    workspace_id: "00000000-0000-0000-0000-000000000000", // derived server-side by trigger
    delegation_assignment_id: delegationAssignmentId,
    position_assignment_id: positionAssignmentId,
    user_id: user.id,
    instrument_version: 0, // derived server-side by trigger
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/delegations/mine");
  revalidatePath("/delegations/register");
  revalidatePath("/dashboard");
  return { ok: true };
}
