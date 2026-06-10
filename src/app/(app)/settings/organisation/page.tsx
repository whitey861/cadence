import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/workspace";
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
import type { Tables } from "@/lib/database.types";

type OrgUnit = Tables<"org_units">;

function UnitTree({
  units,
  parentId,
  depth,
}: {
  units: OrgUnit[];
  parentId: string | null;
  depth: number;
}) {
  const children = units.filter((u) => u.parent_id === parentId);
  if (children.length === 0) return null;

  return (
    <ul className={depth > 0 ? "ml-5 border-l pl-4" : ""}>
      {children.map((unit) => (
        <li key={unit.id} className="py-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{unit.name}</span>
            {unit.code && (
              <span className="text-xs text-muted-foreground">{unit.code}</span>
            )}
            <Badge variant="outline" className="text-[10px] capitalize">
              {unit.unit_type}
            </Badge>
          </div>
          <UnitTree units={units} parentId={unit.id} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export default async function OrganisationPage() {
  const supabase = await createClient();
  const context = await getWorkspaceContext();
  if (!context) return null;

  const [{ data: units }, { data: positions }] = await Promise.all([
    supabase
      .from("org_units")
      .select("*")
      .eq("workspace_id", context.workspace.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("positions")
      .select("*, org_units(name)")
      .eq("workspace_id", context.workspace.id)
      .eq("status", "active")
      .order("position_code"),
  ]);

  return (
    <>
      <PageHeader
        title="Organisation"
        description="Directorates, divisions and sections, and the positions that delegations and policy ownership attach to."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Structure</CardTitle>
          </CardHeader>
          <CardContent>
            {units && units.length > 0 ? (
              <UnitTree units={units} parentId={null} depth={0} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No organisation units yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Positions</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Position</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="pr-6">Code</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(positions ?? []).map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="pl-6 font-medium">
                      {position.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {position.org_units?.name ?? "—"}
                    </TableCell>
                    <TableCell className="pr-6 text-muted-foreground">
                      {position.position_code}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
