"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Database } from "@/lib/database.types";

type RegisterRow = Database["public"]["Views"]["delegations_register"]["Row"];

const ALL = "__all__";

export function RegisterTable({ rows }: { rows: RegisterRow[] }) {
  const [search, setSearch] = useState("");
  const [orgUnit, setOrgUnit] = useState(ALL);
  const [position, setPosition] = useState(ALL);
  const [pendingOnly, setPendingOnly] = useState(false);

  const orgUnits = useMemo(
    () => [...new Set(rows.map((r) => r.org_unit_name).filter(Boolean))] as string[],
    [rows]
  );
  const positions = useMemo(
    () => [...new Set(rows.map((r) => r.position_title).filter(Boolean))] as string[],
    [rows]
  );

  const filtered = rows.filter((row) => {
    if (orgUnit !== ALL && row.org_unit_name !== orgUnit) return false;
    if (position !== ALL && row.position_title !== position) return false;
    if (pendingOnly && !row.acknowledgment_pending) return false;
    if (search) {
      const haystack =
        `${row.function_title} ${row.function_description} ${row.conditions_limitations} ${row.provisions_text} ${row.position_title} ${row.occupant_name}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search functions, provisions, positions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
        />
        <Select value={orgUnit} onValueChange={(v) => setOrgUnit(v ?? ALL)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All org units</SelectItem>
            {orgUnits.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={position} onValueChange={(v) => setPosition(v ?? ALL)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All positions</SelectItem>
            {positions.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={pendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setPendingOnly((v) => !v)}
        >
          Pending acknowledgement
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {rows.length}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Download className="size-4" />
                Export CSV
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => window.open("/delegations/register/export?by=position", "_blank")}
            >
              Register by position
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => window.open("/delegations/register/export?by=function", "_blank")}
            >
              Register by function
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Function</TableHead>
              <TableHead>Provisions</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Org unit</TableHead>
              <TableHead>Occupant</TableHead>
              <TableHead className="pr-6">Acknowledged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No register rows match the current filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((row) => (
              <TableRow key={`${row.delegation_assignment_id}-${row.position_assignment_id}`}>
                <TableCell className="max-w-72 pl-6 align-top">
                  <p className="font-medium">{row.function_title}</p>
                  {row.conditions_limitations && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {row.conditions_limitations}
                    </p>
                  )}
                </TableCell>
                <TableCell className="max-w-56 align-top text-xs text-muted-foreground">
                  {row.provisions_text ?? "—"}
                </TableCell>
                <TableCell className="align-top">{row.position_title}</TableCell>
                <TableCell className="align-top text-muted-foreground">
                  {row.org_unit_name ?? "—"}
                </TableCell>
                <TableCell className="align-top">
                  {row.occupant_name ?? (
                    <span className="text-muted-foreground">Vacant</span>
                  )}
                </TableCell>
                <TableCell className="pr-6 align-top">
                  {row.occupant_user_id === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : row.acknowledgment_pending ? (
                    <Badge className="bg-warning/15 text-warning" variant="outline">
                      Pending
                    </Badge>
                  ) : (
                    <Badge className="bg-success/15 text-success" variant="outline">
                      Acknowledged
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
