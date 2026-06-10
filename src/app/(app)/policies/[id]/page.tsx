import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POLICY_STATUS_VARIANT } from "../page";
import { PolicyActions } from "./policy-actions";
import { RequirementsEditor } from "./requirements-editor";
import { BodyDocument } from "./body-document";

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const { data: policy } = await supabase
    .from("policies")
    .select("*, positions(title)")
    .eq("id", id)
    .maybeSingle();
  if (!policy) notFound();

  const canWrite = ["admin", "governance_officer"].includes(context.membership.role);

  const [
    { data: requirements },
    { data: compliance },
    { data: family },
    { data: orgUnits },
    { data: positions },
    { data: successor },
  ] = await Promise.all([
    supabase
      .from("policy_ack_requirements")
      .select("*")
      .eq("policy_id", id)
      .order("created_at"),
    supabase
      .from("policy_ack_compliance_by_org_unit")
      .select("*")
      .eq("policy_id", id),
    supabase
      .from("policies")
      .select("id, version, status, adopted_date")
      .eq("family_id", policy.family_id)
      .order("version", { ascending: false }),
    supabase
      .from("org_units")
      .select("id, name")
      .eq("workspace_id", context.workspace.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("positions")
      .select("id, title")
      .eq("workspace_id", context.workspace.id)
      .eq("status", "active")
      .order("position_code"),
    supabase
      .from("policies")
      .select("id, status")
      .eq("supersedes_id", id)
      .maybeSingle(),
  ]);

  const scopeName = (scope: string, ref: string | null) => {
    if (scope === "all_staff") return "All staff";
    if (scope === "org_unit") return orgUnits?.find((u) => u.id === ref)?.name ?? "Org unit";
    return positions?.find((p) => p.id === ref)?.title ?? "Position";
  };

  return (
    <>
      <PageHeader title={policy.title}>
        {canWrite && <PolicyActions policy={policy} successorId={successor?.id ?? null} />}
      </PageHeader>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant={POLICY_STATUS_VARIANT[policy.status]}>
          {policy.status.replace("_", " ")}
        </Badge>
        {policy.policy_number && <Badge variant="outline">{policy.policy_number}</Badge>}
        <Badge variant="outline">v{policy.version}</Badge>
        {policy.category && <span className="text-muted-foreground">{policy.category}</span>}
        {policy.positions?.title && (
          <span className="text-muted-foreground">Owner: {policy.positions.title}</span>
        )}
        {policy.adopted_date && (
          <span className="text-muted-foreground">
            Adopted {formatDate(policy.adopted_date)}
          </span>
        )}
        {policy.next_review_date && (
          <span className="text-muted-foreground">
            Review due {formatDate(policy.next_review_date)}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <RequirementsEditor
            policy={policy}
            requirements={(requirements ?? []).map((r) => ({
              ...r,
              scopeName: scopeName(r.scope, r.scope_ref),
            }))}
            orgUnits={orgUnits ?? []}
            positions={positions ?? []}
            canWrite={canWrite}
          />

          <BodyDocument policy={policy} canWrite={canWrite} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acknowledgement compliance</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {!compliance || compliance.length === 0 ? (
                <p className="px-6 pb-2 text-sm text-muted-foreground">
                  No acknowledgement requirements are in force for this version.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Org unit</TableHead>
                      <TableHead>Required</TableHead>
                      <TableHead>Acknowledged</TableHead>
                      <TableHead className="pr-6">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {compliance.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-6">
                          {row.org_unit_name ?? "No position held"}
                        </TableCell>
                        <TableCell>{row.required}</TableCell>
                        <TableCell>{row.acknowledged}</TableCell>
                        <TableCell className="pr-6">
                          {(row.pending ?? 0) > 0 ? (
                            <Badge className="bg-warning/15 text-warning" variant="outline">
                              {row.pending}
                            </Badge>
                          ) : (
                            <Badge className="bg-success/15 text-success" variant="outline">
                              0
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version history</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {(family ?? []).map((version) => (
                  <li key={version.id} className="flex items-center gap-2">
                    {version.id === policy.id ? (
                      <span className="font-medium">v{version.version}</span>
                    ) : (
                      <Link href={`/policies/${version.id}`} className="font-medium underline">
                        v{version.version}
                      </Link>
                    )}
                    <Badge variant={POLICY_STATUS_VARIANT[version.status]} className="text-[11px]">
                      {version.status.replace("_", " ")}
                    </Badge>
                    {version.adopted_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(version.adopted_date)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
