import { formatInTimeZone } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  create: "default",
  update: "secondary",
  status_change: "outline",
  delete: "destructive",
};

export default async function AuditPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const canRead = ["admin", "governance_officer"].includes(
    context.membership.role
  );

  const { data: entries } = canRead
    ? await supabase
        .from("audit_log")
        .select("*")
        .eq("workspace_id", context.workspace.id)
        .order("occurred_at", { ascending: false })
        .limit(100)
    : { data: null };

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Append-only record of every change to governance records. Entries can never be edited or removed."
      />
      {!canRead ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          The audit log is available to administrators and governance officers.
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No audit entries yet.
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When (AEST/AEDT)</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatInTimeZone(entry.occurred_at)}
                  </TableCell>
                  <TableCell>{entry.entity_type}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[entry.action] ?? "secondary"}>
                      {entry.action.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {(entry.after as { name?: string; title?: string } | null)?.name ??
                      (entry.after as { name?: string; title?: string } | null)?.title ??
                      (entry.before as { name?: string; title?: string } | null)?.name ??
                      (entry.before as { name?: string; title?: string } | null)?.title ??
                      entry.entity_id}
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
