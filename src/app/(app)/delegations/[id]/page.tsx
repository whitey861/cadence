import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { INSTRUMENT_STATUS_VARIANT } from "../page";
import { InstrumentActions } from "./instrument-actions";
import { DelegationsEditor } from "./delegations-editor";

export default async function InstrumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const { data: instrument } = await supabase
    .from("delegation_instruments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!instrument) notFound();

  const canWrite = ["admin", "governance_officer"].includes(context.membership.role);

  const [{ data: delegations }, { data: positions }, { data: provisions }, { data: successor }] =
    await Promise.all([
      supabase
        .from("delegations")
        .select(
          `*,
           delegation_provisions(id, provision_id,
             legislative_provisions(id, reference, description,
               legislative_instruments(name))),
           delegation_assignments(id, position_id, status, effective_from, effective_to,
             positions(title, position_code))`
        )
        .eq("delegation_instrument_id", id)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("positions")
        .select("id, title, position_code")
        .eq("workspace_id", context.workspace.id)
        .eq("status", "active")
        .order("position_code"),
      supabase
        .from("legislative_provisions")
        .select("id, reference, description, legislative_instruments(name)")
        .order("reference"),
      supabase
        .from("delegation_instruments")
        .select("id, version, status")
        .eq("supersedes_id", id)
        .maybeSingle(),
    ]);

  return (
    <>
      <PageHeader title={instrument.title}>
        {canWrite && (
          <InstrumentActions
            instrument={instrument}
            successorId={successor?.id ?? null}
          />
        )}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={INSTRUMENT_STATUS_VARIANT[instrument.status]}>
          {instrument.status}
        </Badge>
        <Badge variant="outline">
          {instrument.instrument_type === "council_to_gm"
            ? "Council to GM (s 377)"
            : "GM to staff (s 378)"}
        </Badge>
        <Badge variant="outline">v{instrument.version}</Badge>
        {instrument.adopted_date && (
          <span className="text-muted-foreground">
            Adopted {formatDate(instrument.adopted_date)}
            {instrument.resolution_reference && `, ${instrument.resolution_reference}`}
          </span>
        )}
        {successor && (
          <span className="text-muted-foreground">
            {successor.status === "draft" ? "Draft successor: " : "Superseded by "}
            <Link href={`/delegations/${successor.id}`} className="underline">
              v{successor.version}
            </Link>
          </span>
        )}
      </div>

      <DelegationsEditor
        instrument={instrument}
        delegations={delegations ?? []}
        positions={positions ?? []}
        provisions={(provisions ?? []).map((p) => ({
          id: p.id,
          reference: p.reference,
          description: p.description,
          act: p.legislative_instruments?.name ?? "",
        }))}
        canWrite={canWrite}
      />
    </>
  );
}
