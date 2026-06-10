import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { formatInTimeZone } from "@/lib/dates";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { AcknowledgeButton } from "./acknowledge-button";

export default async function MyDelegationsPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: pending }, { data: acknowledged }] = await Promise.all([
    supabase
      .from("pending_delegation_acknowledgments")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .eq("occupant_user_id", user.id)
      .order("function_title"),
    supabase
      .from("delegations_register")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .eq("occupant_user_id", user.id)
      .eq("acknowledgment_pending", false)
      .order("function_title"),
  ]);

  return (
    <>
      <PageHeader
        title="My delegations"
        description="Functions delegated to positions you occupy. Acknowledging confirms you have read the delegation and its conditions; a fresh acknowledgement is required when the instrument changes or you change positions."
      />

      {(!pending || pending.length === 0) && (!acknowledged || acknowledged.length === 0) ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          No delegations are assigned to positions you currently occupy.
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
                  <Card key={row.delegation_assignment_id}>
                    <CardContent className="flex items-start justify-between gap-6 py-4">
                      <div>
                        <p className="font-medium">{row.function_title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.instrument_title} v{row.instrument_version}, as{" "}
                          {row.position_title}
                        </p>
                        {row.provisions_text && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.provisions_text}
                          </p>
                        )}
                        {row.conditions_limitations && (
                          <p className="mt-2 text-sm">
                            <span className="font-medium">Conditions: </span>
                            {row.conditions_limitations}
                          </p>
                        )}
                      </div>
                      <AcknowledgeButton
                        delegationAssignmentId={row.delegation_assignment_id!}
                        positionAssignmentId={row.position_assignment_id!}
                      />
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
                {acknowledged.map((row) => (
                  <div
                    key={row.delegation_assignment_id}
                    className="flex items-center justify-between gap-4 border-b px-5 py-3 text-sm last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="font-medium">{row.function_title}</span>
                      <Badge variant="outline" className="text-[11px]">
                        {row.position_title}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {row.acknowledged_at ? formatInTimeZone(row.acknowledged_at) : ""}
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
