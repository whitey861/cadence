"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Tables } from "@/lib/database.types";
import { addRequirement, removeRequirement } from "../actions";

type Requirement = Tables<"policy_ack_requirements"> & { scopeName: string };

export function RequirementsEditor({
  policy,
  requirements,
  orgUnits,
  positions,
  canWrite,
}: {
  policy: Tables<"policies">;
  requirements: Requirement[];
  orgUnits: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; title: string }>;
  canWrite: boolean;
}) {
  const router = useRouter();
  const editable = canWrite && ["draft", "consultation"].includes(policy.status);
  const [scope, setScope] = useState<"all_staff" | "org_unit" | "position">("all_staff");
  const [scopeRef, setScopeRef] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await addRequirement({
        policyId: policy.id,
        scope,
        scopeRef: scope === "all_staff" ? null : scopeRef,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setScopeRef("");
      router.refresh();
    });
  }

  function remove(requirementId: string) {
    startTransition(async () => {
      const result = await removeRequirement(requirementId, policy.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const refOptions = scope === "org_unit" ? orgUnits.map((u) => ({ id: u.id, label: u.name }))
    : scope === "position" ? positions.map((p) => ({ id: p.id, label: p.title }))
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acknowledgement requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requirements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No acknowledgement requirements. {editable && "Add one below; requirements are frozen once the policy is adopted."}
          </p>
        ) : (
          <ul className="space-y-2">
            {requirements.map((requirement) => (
              <li key={requirement.id} className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">{requirement.scopeName}</Badge>
                <span className="text-xs text-muted-foreground">
                  {requirement.scope === "all_staff"
                    ? "every active member except read only"
                    : requirement.scope === "org_unit"
                      ? "current occupants of positions in this unit"
                      : "current occupants of this position"}
                </span>
                {editable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-auto"
                    disabled={isPending}
                    onClick={() => remove(requirement.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {editable && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Select
                value={scope}
                onValueChange={(v) => {
                  setScope(v as typeof scope);
                  setScopeRef("");
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_staff">All staff</SelectItem>
                  <SelectItem value="org_unit">Org unit</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope !== "all_staff" && (
              <Select value={scopeRef} onValueChange={(v) => setScopeRef(v ?? "")}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {refOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              onClick={add}
              disabled={isPending || (scope !== "all_staff" && !scopeRef)}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
