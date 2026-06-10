"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronsUpDown, Pencil, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/database.types";
import { deleteDelegation, revokeAssignment, saveDelegation } from "../actions";

type ProvisionOption = {
  id: string;
  reference: string;
  description: string | null;
  act: string;
};

type PositionOption = Pick<Tables<"positions">, "id" | "title" | "position_code">;

type DelegationRow = Tables<"delegations"> & {
  delegation_provisions: Array<{
    id: string;
    provision_id: string;
    legislative_provisions: {
      id: string;
      reference: string;
      description: string | null;
      legislative_instruments: { name: string } | null;
    } | null;
  }>;
  delegation_assignments: Array<{
    id: string;
    position_id: string;
    status: "active" | "revoked";
    effective_from: string;
    effective_to: string | null;
    positions: { title: string; position_code: string | null } | null;
  }>;
};

export function DelegationsEditor({
  instrument,
  delegations,
  positions,
  provisions,
  canWrite,
}: {
  instrument: Tables<"delegation_instruments">;
  delegations: DelegationRow[];
  positions: PositionOption[];
  provisions: ProvisionOption[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const isDraft = instrument.status === "draft";
  const editable = canWrite && isDraft;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DelegationRow | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state (kept simple: a handful of controlled fields)
  const [functionTitle, setFunctionTitle] = useState("");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState("");
  const [selectedProvisions, setSelectedProvisions] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);

  function openCreate() {
    setEditing(null);
    setFunctionTitle("");
    setDescription("");
    setConditions("");
    setSelectedProvisions([]);
    setSelectedPositions([]);
    setSheetOpen(true);
  }

  function openEdit(delegation: DelegationRow) {
    setEditing(delegation);
    setFunctionTitle(delegation.function_title);
    setDescription(delegation.function_description ?? "");
    setConditions(delegation.conditions_limitations ?? "");
    setSelectedProvisions(delegation.delegation_provisions.map((p) => p.provision_id));
    setSelectedPositions(
      delegation.delegation_assignments
        .filter((a) => a.status === "active")
        .map((a) => a.position_id)
    );
    setSheetOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const result = await saveDelegation({
        instrumentId: instrument.id,
        delegationId: editing?.id,
        function_title: functionTitle,
        function_description: description,
        conditions_limitations: conditions,
        provisionIds: selectedProvisions,
        positionIds: selectedPositions,
        effective_from: new Date().toLocaleDateString("en-CA", {
          timeZone: "Australia/Sydney",
        }),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSheetOpen(false);
      toast.success(editing ? "Delegation updated" : "Delegation added");
      router.refresh();
    });
  }

  function remove(delegation: DelegationRow) {
    startTransition(async () => {
      const result = await deleteDelegation(delegation.id, instrument.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Delegation removed");
      router.refresh();
    });
  }

  function revoke(assignmentId: string) {
    startTransition(async () => {
      const result = await revokeAssignment(assignmentId, instrument.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Assignment revoked");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <p className="text-sm font-medium">
          Delegations <span className="text-muted-foreground">({delegations.length})</span>
        </p>
        {editable && (
          <Button size="sm" onClick={openCreate} disabled={isPending}>
            <Plus className="size-4" />
            Add delegation
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 w-[28%]">Function</TableHead>
            <TableHead className="w-[24%]">Provisions</TableHead>
            <TableHead className="w-[24%]">Conditions and limitations</TableHead>
            <TableHead className={editable ? "w-[18%]" : "w-[24%]"}>Positions</TableHead>
            {editable && <TableHead className="pr-6 text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {delegations.length === 0 && (
            <TableRow>
              <TableCell colSpan={editable ? 5 : 4} className="py-10 text-center text-muted-foreground">
                No delegations in this instrument yet.
              </TableCell>
            </TableRow>
          )}
          {delegations.map((delegation) => (
            <TableRow key={delegation.id}>
              <TableCell className="pl-6 align-top">
                <p className="font-medium">{delegation.function_title}</p>
                {delegation.function_description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {delegation.function_description}
                  </p>
                )}
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-wrap gap-1">
                  {delegation.delegation_provisions.map((link) => (
                    <Badge key={link.id} variant="outline" className="text-[11px]">
                      {link.legislative_provisions?.legislative_instruments?.name
                        ?.replace(/ \d{4}$/, "")
                        .replace("Local Government", "LG")}{" "}
                      {link.legislative_provisions?.reference}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="align-top text-xs text-muted-foreground">
                {delegation.conditions_limitations ?? "—"}
              </TableCell>
              <TableCell className="align-top">
                <div className="space-y-1">
                  {delegation.delegation_assignments
                    .filter((a) => isDraft || a.status === "active")
                    .map((assignment) => (
                      <div key={assignment.id} className="flex items-center gap-1 text-xs">
                        <span>{assignment.positions?.title}</span>
                        {!isDraft && canWrite && assignment.status === "active" && (
                          <button
                            type="button"
                            title="Revoke assignment"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => revoke(assignment.id)}
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </TableCell>
              {editable && (
                <TableCell className="pr-6 text-right align-top">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(delegation)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => remove(delegation)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit delegation" : "Add delegation"}</SheetTitle>
            <SheetDescription>
              Describe the delegated function, cite its legislative provisions
              and assign it to positions.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-6">
            <div className="space-y-2">
              <Label htmlFor="function-title">Function title</Label>
              <Input
                id="function-title"
                value={functionTitle}
                onChange={(e) => setFunctionTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="function-description">Description</Label>
              <Textarea
                id="function-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conditions">Conditions and limitations</Label>
              <Textarea
                id="conditions"
                rows={3}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Legislative provisions</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button variant="outline" className="w-full justify-between font-normal">
                      {selectedProvisions.length > 0
                        ? `${selectedProvisions.length} selected`
                        : "Select provisions"}
                      <ChevronsUpDown className="size-4 text-muted-foreground" />
                    </Button>
                  }
                />
                <PopoverContent className="w-[480px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search provisions" />
                    <CommandList>
                      <CommandEmpty>No provisions found.</CommandEmpty>
                      {Object.entries(
                        provisions.reduce<Record<string, ProvisionOption[]>>((acc, p) => {
                          (acc[p.act] ??= []).push(p);
                          return acc;
                        }, {})
                      ).map(([act, items]) => (
                        <CommandGroup key={act} heading={act}>
                          {items.map((provision) => (
                            <CommandItem
                              key={provision.id}
                              value={`${act} ${provision.reference} ${provision.description ?? ""}`}
                              onSelect={() => {
                                setSelectedProvisions((prev) =>
                                  prev.includes(provision.id)
                                    ? prev.filter((id) => id !== provision.id)
                                    : [...prev, provision.id]
                                );
                              }}
                            >
                              <Checkbox
                                checked={selectedProvisions.includes(provision.id)}
                                className="pointer-events-none"
                              />
                              <span className="font-medium">{provision.reference}</span>
                              <span className="truncate text-muted-foreground">
                                {provision.description}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex flex-wrap gap-1">
                {selectedProvisions.map((id) => {
                  const provision = provisions.find((p) => p.id === id);
                  if (!provision) return null;
                  return (
                    <Badge key={id} variant="secondary" className="text-[11px]">
                      {provision.act.replace(/ \d{4}$/, "")} {provision.reference}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProvisions((prev) => prev.filter((p) => p !== id))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Assigned positions</Label>
              <div className="space-y-1.5 rounded-md border p-3">
                {positions.map((position) => (
                  <label key={position.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedPositions.includes(position.id)}
                      onCheckedChange={(checked) => {
                        setSelectedPositions((prev) =>
                          checked
                            ? [...prev, position.id]
                            : prev.filter((id) => id !== position.id)
                        );
                      }}
                    />
                    {position.title}
                    <span className="text-xs text-muted-foreground">
                      {position.position_code}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button onClick={submit} disabled={isPending || functionTitle.trim().length < 3}>
              {isPending ? "Saving" : editing ? "Save changes" : "Add delegation"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
