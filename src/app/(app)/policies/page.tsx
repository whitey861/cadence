import Link from "next/link";
import { BookMarked } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
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
import { EmptyState } from "@/components/shell/empty-state";
import { PolicyCreateDialog } from "./policy-create-dialog";
import { PoliciesExportButton } from "./export-button";

export const POLICY_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  consultation: "outline",
  adopted: "default",
  under_review: "secondary",
  superseded: "secondary",
  rescinded: "destructive",
  archived: "secondary",
};

export default async function PoliciesPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const canWrite = ["admin", "governance_officer"].includes(context.membership.role);

  const [{ data: policies }, { data: positions }] = await Promise.all([
    supabase
      .from("policies_register")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .order("policy_number"),
    supabase
      .from("positions")
      .select("id, title")
      .eq("workspace_id", context.workspace.id)
      .eq("status", "active")
      .order("position_code"),
  ]);

  return (
    <>
      <PageHeader
        title="Policies"
        description="The policy register: ownership by position, review cycles, versions and staff acknowledgements."
      >
        <div className="flex gap-2">
          <PoliciesExportButton />
          {canWrite && <PolicyCreateDialog positions={positions ?? []} />}
        </div>
      </PageHeader>

      {!policies || policies.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="No policies yet"
          body="Each policy carries an owning position, a review cycle and a full version history. Superseding a policy creates a new version; adopted versions are never edited."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Owner position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Next review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.policy_id}>
                  <TableCell className="pl-6 text-muted-foreground">
                    {policy.policy_number}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/policies/${policy.policy_id}`} className="hover:underline">
                      {policy.title}
                    </Link>
                    <span className="ml-2 text-xs text-muted-foreground">
                      v{policy.version}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{policy.category}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {policy.owner_position_title ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={POLICY_STATUS_VARIANT[policy.status ?? "draft"]}>
                      {(policy.status ?? "").replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-6 text-muted-foreground">
                    {policy.next_review_date ? formatDate(policy.next_review_date) : "—"}
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
