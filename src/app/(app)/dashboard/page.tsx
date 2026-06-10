import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext, ROLE_LABELS } from "@/lib/workspace";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const { workspace, membership } = context;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const canGovern = ["admin", "governance_officer"].includes(membership.role);

  const [
    { count: registerCount },
    { count: policyCount },
    { count: openReviews },
    { count: myPendingDelegations },
    { count: myPendingPolicies },
    delegationCompliance,
  ] = await Promise.all([
    supabase
      .from("delegations_register")
      .select("delegation_assignment_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("policies_register")
      .select("policy_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .in("status", ["adopted", "under_review"]),
    supabase
      .from("review_tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("status", "open"),
    supabase
      .from("pending_delegation_acknowledgments")
      .select("delegation_assignment_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("occupant_user_id", user!.id),
    supabase
      .from("pending_policy_acknowledgments")
      .select("requirement_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("user_id", user!.id),
    canGovern
      ? supabase
          .from("delegation_ack_compliance_by_org_unit")
          .select("*")
          .eq("workspace_id", workspace.id)
          .order("pending", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const myPending = (myPendingDelegations ?? 0) + (myPendingPolicies ?? 0);

  const stats = [
    { label: "Delegations in force", value: registerCount ?? 0, href: "/delegations/register" },
    { label: "Policies in force", value: policyCount ?? 0, href: "/policies" },
    { label: "Open reviews", value: openReviews ?? 0, href: "/reviews" },
  ];

  return (
    <>
      <PageHeader
        title={workspace.name}
        description="Governance, risk and corporate planning at a glance."
      >
        <Badge variant="secondary">{ROLE_LABELS[membership.role]}</Badge>
      </PageHeader>

      {myPending > 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <p className="text-sm">
              <span className="font-semibold">{myPending} acknowledgement{myPending === 1 ? "" : "s"}</span>{" "}
              awaiting your attention.
            </p>
            <div className="flex gap-2">
              {(myPendingDelegations ?? 0) > 0 && (
                <Button size="sm" variant="outline" render={<Link href="/delegations/mine" />}>
                  My delegations
                </Button>
              )}
              {(myPendingPolicies ?? 0) > 0 && (
                <Button size="sm" variant="outline" render={<Link href="/policies/mine" />}>
                  My policies
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {canGovern && delegationCompliance.data && delegationCompliance.data.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Delegation acknowledgement compliance by org unit
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Org unit</TableHead>
                  <TableHead>Occupied delegations</TableHead>
                  <TableHead>Acknowledged</TableHead>
                  <TableHead className="pr-6">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delegationCompliance.data.map((row) => (
                  <TableRow key={row.org_unit_id ?? "none"}>
                    <TableCell className="pl-6">{row.org_unit_name ?? "—"}</TableCell>
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
          </CardContent>
        </Card>
      )}
    </>
  );
}
