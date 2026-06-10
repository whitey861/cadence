import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { PageHeader } from "@/components/shell/page-header";
import { RegisterTable } from "./register-table";

export default async function DelegationsRegisterPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const { data: rows } = await supabase
    .from("delegations_register")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("instrument_title")
    .order("function_title");

  return (
    <>
      <PageHeader
        title="Delegations register"
        description="Every function delegated under the instruments currently in force, by position and current occupant."
      />
      <RegisterTable rows={rows ?? []} />
    </>
  );
}
