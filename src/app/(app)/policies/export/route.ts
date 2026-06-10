import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { toCsv, csvResponse, type CsvColumn } from "@/lib/csv";
import type { Database } from "@/lib/database.types";

type PolicyRow = Database["public"]["Views"]["policies_register"]["Row"];

const COLUMNS: CsvColumn<PolicyRow>[] = [
  { header: "Policy number", value: (r) => r.policy_number },
  { header: "Title", value: (r) => r.title },
  { header: "Category", value: (r) => r.category },
  { header: "Status", value: (r) => r.status?.replace("_", " ") },
  { header: "Version", value: (r) => r.version },
  { header: "Owner position", value: (r) => r.owner_position_title },
  { header: "Org unit", value: (r) => r.org_unit_name },
  { header: "Adopted", value: (r) => r.adopted_date },
  { header: "Review cycle (months)", value: (r) => r.review_cycle_months },
  { header: "Next review", value: (r) => r.next_review_date },
];

export async function GET() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return new Response("No workspace", { status: 403 });

  const { data, error } = await supabase
    .from("policies_register")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .order("policy_number");
  if (error) return new Response(error.message, { status: 500 });

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  return csvResponse(toCsv(data ?? [], COLUMNS), `policy-register-${today}.csv`);
}
