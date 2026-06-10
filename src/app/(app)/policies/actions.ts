"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const policySchema = z.object({
  policyId: z.uuid().optional(),
  title: z.string().min(3, "Title is required"),
  policy_number: z.string().optional(),
  category: z.string().optional(),
  owner_position_id: z.uuid().nullable().optional(),
  review_cycle_months: z.coerce.number().int().positive().nullable().optional(),
});

export async function savePolicy(input: unknown): Promise<ActionResult> {
  const parsed = policySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { policyId, ...values } = parsed.data;

  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return { ok: false, error: "No workspace" };

  if (policyId) {
    const { error } = await supabase.from("policies").update(values).eq("id", policyId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/policies/${policyId}`);
    return { ok: true, id: policyId };
  }

  const { data, error } = await supabase
    .from("policies")
    .insert({ workspace_id: context.workspace.id, ...values })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/policies");
  return { ok: true, id: data.id };
}

const transitionSchema = z.object({
  policyId: z.uuid(),
  status: z.enum(["draft", "consultation", "under_review", "adopted", "rescinded", "archived"]),
});

// Direct status transitions (consultation, review start and finish, rescind,
// archive). Adoption and supersession go through their RPCs instead.
export async function transitionPolicy(input: unknown): Promise<ActionResult> {
  const parsed = transitionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("policies")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.policyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/policies");
  revalidatePath(`/policies/${parsed.data.policyId}`);
  return { ok: true };
}

const adoptPolicySchema = z.object({
  policyId: z.uuid(),
  adoptedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the adoption date"),
});

export async function adoptPolicyAction(input: unknown): Promise<ActionResult> {
  const parsed = adoptPolicySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("adopt_policy", {
    p_policy_id: parsed.data.policyId,
    p_adopted_date: parsed.data.adoptedDate,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/policies");
  revalidatePath(`/policies/${parsed.data.policyId}`);
  revalidatePath("/reviews");
  return { ok: true };
}

export async function supersedePolicyAction(policyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("supersede_policy", { p_policy_id: policyId });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/policies");
  return { ok: true, id: data ?? undefined };
}

const requirementSchema = z.object({
  policyId: z.uuid(),
  scope: z.enum(["all_staff", "org_unit", "position"]),
  scopeRef: z.uuid().nullable().optional(),
});

export async function addRequirement(input: unknown): Promise<ActionResult> {
  const parsed = requirementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return { ok: false, error: "No workspace" };

  const { error } = await supabase.from("policy_ack_requirements").insert({
    workspace_id: context.workspace.id,
    policy_id: parsed.data.policyId,
    scope: parsed.data.scope,
    scope_ref: parsed.data.scope === "all_staff" ? null : parsed.data.scopeRef ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/policies/${parsed.data.policyId}`);
  return { ok: true };
}

export async function removeRequirement(requirementId: string, policyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("policy_ack_requirements")
    .delete()
    .eq("id", requirementId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/policies/${policyId}`);
  return { ok: true };
}

export async function acknowledgePolicy(requirementId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("policy_acknowledgments").insert({
    workspace_id: "00000000-0000-0000-0000-000000000000", // derived server-side by trigger
    requirement_id: requirementId,
    user_id: user.id,
    policy_version: 0, // derived server-side by trigger
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/policies/mine");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function uploadPolicyBody(formData: FormData): Promise<ActionResult> {
  const policyId = formData.get("policyId");
  const file = formData.get("file");
  if (typeof policyId !== "string" || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload" };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "File exceeds the 20 MB limit" };
  }

  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return { ok: false, error: "No workspace" };

  const path = `${context.workspace.id}/${policyId}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("policy-documents")
    .upload(path, file, { upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { error } = await supabase
    .from("policies")
    .update({ body_storage_path: path })
    .eq("id", policyId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/policies/${policyId}`);
  return { ok: true };
}

export async function policyBodyUrl(path: string): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("policy-documents")
    .createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: error?.message ?? "Could not sign URL" };
  return { ok: true, url: data.signedUrl };
}

export async function completeReviewTask(taskId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data, error } = await supabase
    .from("review_tasks")
    .update({
      status: "complete",
      completed_at: new Date().toISOString(),
      completed_by: user.id,
    })
    .eq("id", taskId)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "You are not authorised to complete this task" };
  }

  revalidatePath("/reviews");
  return { ok: true };
}
