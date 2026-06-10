import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatInTimeZone } from "@/lib/dates";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { PolicyAckButton } from "./policy-ack-button";

export default async function MyPoliciesPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: pending }, { data: acknowledged }] = await Promise.all([
    supabase
      .from("pending_policy_acknowledgments")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .eq("user_id", user.id)
      .order("policy_title"),
    supabase
      .from("policy_acknowledgments")
      .select("id, acknowledged_at, policy_version, policy_ack_requirements(policies(title, policy_number))")
      .eq("workspace_id", context.workspace.id)
      .eq("user_id", user.id)
      .order("acknowledged_at", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="My policy acknowledgements"
        description="Policies you are required to read and acknowledge. A fresh acknowledgement is required when a policy is re-adopted."
      />

      {(!pending || pending.length === 0) && (!acknowledged || acknowledged.length === 0) ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          No policy acknowledgements are required of you.
        </div>
      ) : (
        <div className="space-y-6">
          {pending && pending.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-warning">
                Awaiting your acknowledgement ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((row) => (
                  <Card key={`${row.requirement_id}-${row.user_id}`}>
                    <CardContent className="flex items-center justify-between gap-6 py-4">
                      <div>
                        <p className="font-medium">{row.policy_title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.policy_number}, version {row.policy_version}
                        </p>
                      </div>
                      <PolicyAckButton requirementId={row.requirement_id!} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {acknowledged && acknowledged.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Acknowledged ({acknowledged.length})
              </h2>
              <div className="rounded-lg border bg-card">
                {acknowledged.map((ack) => (
                  <div
                    key={ack.id}
                    className="flex items-center justify-between gap-4 border-b px-5 py-3 text-sm last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="font-medium">
                        {ack.policy_ack_requirements?.policies?.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        v{ack.policy_version}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatInTimeZone(ack.acknowledged_at)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
