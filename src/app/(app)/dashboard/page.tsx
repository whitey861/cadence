import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext, ROLE_LABELS } from "@/lib/workspace";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const { workspace, membership } = context;

  const [{ count: memberCount }, { count: unitCount }, { count: positionCount }] =
    await Promise.all([
      supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "active"),
      supabase
        .from("org_units")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("is_active", true),
      supabase
        .from("positions")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("status", "active"),
    ]);

  const stats = [
    { label: "Active members", value: memberCount ?? 0 },
    { label: "Organisation units", value: unitCount ?? 0 },
    { label: "Positions", value: positionCount ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title={workspace.name}
        description="Governance, risk and corporate planning at a glance. Modules light up here as they come online."
      >
        <Badge variant="secondary">{ROLE_LABELS[membership.role]}</Badge>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Cadence is in early access. Delegations and Policies arrive first,
            followed by Risk Management and IP&amp;R corporate planning. Your
            organisation structure and positions are ready now under
            Administration.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
