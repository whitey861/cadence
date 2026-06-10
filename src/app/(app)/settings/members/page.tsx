import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext, ROLE_LABELS } from "@/lib/workspace";
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

export default async function MembersPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const { data: members } = await supabase
    .from("memberships")
    .select("*, profiles!user_id(display_name, email)")
    .eq("workspace_id", context.workspace.id)
    .eq("status", "active")
    .order("created_at");

  return (
    <>
      <PageHeader
        title="Members"
        description="Workspace members and their roles. Roles control what each member can see and change."
      />
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="pr-6">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(members ?? []).map((member) => (
              <TableRow key={member.id}>
                <TableCell className="pl-6 font-medium">
                  {member.profiles?.display_name ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.profiles?.email ?? "—"}
                </TableCell>
                <TableCell className="pr-6">
                  <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
