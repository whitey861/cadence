import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export const WORKSPACE_COOKIE = "cadence-workspace";

export type WorkspaceContext = {
  workspace: Tables<"workspaces">;
  membership: Tables<"memberships">;
  memberships: Array<Tables<"memberships"> & { workspaces: Tables<"workspaces"> | null }>;
};

// Resolves the active workspace for the signed-in user: the one named by the
// workspace cookie when still valid, otherwise the first active membership.
export async function getWorkspaceContext(): Promise<WorkspaceContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("*, workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at");

  if (!memberships || memberships.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const membership =
    memberships.find((m) => m.workspace_id === preferred) ?? memberships[0];

  if (!membership.workspaces) return null;

  return {
    workspace: membership.workspaces,
    membership,
    memberships,
  };
}

export const ROLE_LABELS: Record<Tables<"memberships">["role"], string> = {
  admin: "Administrator",
  governance_officer: "Governance officer",
  risk_owner: "Risk owner",
  manager: "Manager",
  staff: "Staff",
  read_only: "Read only",
};
