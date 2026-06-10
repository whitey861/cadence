import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { toCsv, csvResponse, type CsvColumn } from "@/lib/csv";
import type { Database } from "@/lib/database.types";

type RegisterRow = Database["public"]["Views"]["delegations_register"]["Row"];

const COLUMNS: CsvColumn<RegisterRow>[] = [
  { header: "Position", value: (r) => r.position_title },
  { header: "Position code", value: (r) => r.position_code },
  { header: "Org unit", value: (r) => r.org_unit_name },
  { header: "Occupant", value: (r) => r.occupant_name ?? "Vacant" },
  { header: "Function", value: (r) => r.function_title },
  { header: "Description", value: (r) => r.function_description },
  { header: "Conditions and limitations", value: (r) => r.conditions_limitations },
  { header: "Provisions", value: (r) => r.provisions_text },
  { header: "Instrument", value: (r) => r.instrument_title },
  { header: "Version", value: (r) => r.instrument_version },
  { header: "Adopted", value: (r) => r.adopted_date },
  { header: "Resolution", value: (r) => r.resolution_reference },
  { header: "Effective from", value: (r) => r.effective_from },
  {
    header: "Acknowledged",
    value: (r) =>
      r.occupant_user_id === null ? "" : r.acknowledgment_pending ? "Pending" : "Yes",
  },
];

export async function GET(request: Request) {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return new Response("No workspace", { status: 403 });

  const by = new URL(request.url).searchParams.get("by") === "function" ? "function" : "position";

  // The user's own client: RLS applies to the export exactly as to the screen
  const query = supabase
    .from("delegations_register")
    .select("*")
    .eq("workspace_id", context.workspace.id);

  const { data, error } =
    by === "function"
      ? await query.order("function_title").order("position_title")
      : await query.order("position_title").order("function_title");

  if (error) return new Response(error.message, { status: 500 });

  const columns =
    by === "function"
      ? [...COLUMNS.slice(4, 8), ...COLUMNS.slice(0, 4), ...COLUMNS.slice(8)]
      : COLUMNS;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  return csvResponse(
    toCsv(data ?? [], columns),
    `delegations-register-by-${by}-${today}.csv`
  );
}
