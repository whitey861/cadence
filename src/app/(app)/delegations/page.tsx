import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/shell/empty-state";
import { InstrumentCreateDialog } from "./instrument-create-dialog";

export const INSTRUMENT_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  adopted: "default",
  superseded: "secondary",
  archived: "secondary",
};

const TYPE_LABELS: Record<string, string> = {
  council_to_gm: "Council to GM",
  gm_to_staff: "GM to staff",
};

export default async function DelegationsPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const canWrite = ["admin", "governance_officer"].includes(context.membership.role);

  const { data: instruments } = await supabase
    .from("delegation_instruments")
    .select("*")
    .eq("workspace_id", context.workspace.id)
    .neq("status", "archived")
    .order("title")
    .order("version", { ascending: false });

  return (
    <>
      <PageHeader
        title="Delegations"
        description="Instruments of delegation under ss 377 and 378 of the Local Government Act 1993, versioned with acknowledgments tracked by position."
      >
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/delegations/register" />}>
            View register
          </Button>
          {canWrite && <InstrumentCreateDialog />}
        </div>
      </PageHeader>

      {!instruments || instruments.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No delegation instruments yet"
          body="Under s 377 the council may delegate functions to the General Manager, who may sub-delegate them to staff under s 378. Create the council instrument first, then the sub-delegation instrument."
          actionLabel={canWrite ? undefined : "Create instrument"}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Instrument</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Adopted</TableHead>
                <TableHead className="pr-6">Resolution</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instruments.map((instrument) => (
                <TableRow key={instrument.id}>
                  <TableCell className="pl-6 font-medium">
                    <Link
                      href={`/delegations/${instrument.id}`}
                      className="hover:underline"
                    >
                      {instrument.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {TYPE_LABELS[instrument.instrument_type]}
                  </TableCell>
                  <TableCell>
                    <Badge variant={INSTRUMENT_STATUS_VARIANT[instrument.status]}>
                      {instrument.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    v{instrument.version}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {instrument.adopted_date ? formatDate(instrument.adopted_date) : "—"}
                  </TableCell>
                  <TableCell className="pr-6 text-muted-foreground">
                    {instrument.resolution_reference ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
