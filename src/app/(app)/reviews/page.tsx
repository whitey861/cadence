import Link from "next/link";
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
import { CompleteReviewButton } from "./complete-review-button";

export default async function ReviewsPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });

  const [{ data: tasks }, { data: myPositions }] = await Promise.all([
    supabase
      .from("review_tasks")
      .select("*, positions(title)")
      .eq("workspace_id", context.workspace.id)
      .eq("status", "open")
      .order("due_date"),
    supabase
      .from("current_position_occupants")
      .select("position_id")
      .eq("workspace_id", context.workspace.id)
      .eq("user_id", user!.id),
  ]);

  const myPositionIds = new Set((myPositions ?? []).map((p) => p.position_id));
  const canGovern = ["admin", "governance_officer"].includes(context.membership.role);

  return (
    <>
      <PageHeader
        title="Scheduled reviews"
        description="Open review tasks for policies and delegation instruments, opened automatically when a policy is adopted with a review cycle."
      />

      {!tasks || tasks.length === 0 ? (
        <div className="rounded-lg border bg-card p-10 text-center text-sm text-muted-foreground">
          No open review tasks.
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Review</TableHead>
                <TableHead>Assigned position</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const overdue = task.due_date < today;
                const canComplete = canGovern ||
                  (task.assigned_position_id !== null && myPositionIds.has(task.assigned_position_id));
                return (
                  <TableRow key={task.id}>
                    <TableCell className="pl-6 font-medium">
                      {task.entity_type === "policy" ? (
                        <Link href={`/policies/${task.entity_id}`} className="hover:underline">
                          {task.title}
                        </Link>
                      ) : (
                        <Link href={`/delegations/${task.entity_id}`} className="hover:underline">
                          {task.title}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.positions?.title ?? "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <span className={overdue ? "font-medium text-destructive" : ""}>
                        {formatDate(task.due_date)}
                      </span>
                      {overdue && (
                        <Badge variant="destructive" className="ml-2 text-[11px]">
                          Overdue
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {canComplete && <CompleteReviewButton taskId={task.id} />}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
