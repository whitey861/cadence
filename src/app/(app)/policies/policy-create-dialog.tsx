"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { savePolicy } from "./actions";

const NONE = "__none__";

export function PolicyCreateDialog({
  positions,
}: {
  positions: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [category, setCategory] = useState("");
  const [owner, setOwner] = useState(NONE);
  const [cycle, setCycle] = useState("24");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await savePolicy({
        title,
        policy_number: number || undefined,
        category: category || undefined,
        owner_position_id: owner === NONE ? null : owner,
        review_cycle_months: cycle ? Number(cycle) : null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      router.push(`/policies/${result.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New policy
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New policy</DialogTitle>
          <DialogDescription>
            The policy starts as a draft. Set acknowledgement requirements and
            send it to consultation or adopt it from the policy page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policy-title">Title</Label>
            <Input id="policy-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="policy-number">Policy number</Label>
              <Input
                id="policy-number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="GOV-009"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy-category">Category</Label>
              <Input
                id="policy-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Governance"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner position</Label>
            <Select value={owner} onValueChange={(v) => setOwner(v ?? NONE)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No owner yet</SelectItem>
                {positions.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="policy-cycle">Review cycle (months)</Label>
            <Input
              id="policy-cycle"
              type="number"
              min={1}
              value={cycle}
              onChange={(e) => setCycle(e.target.value)}
            />
          </div>
          <Button onClick={submit} disabled={isPending || title.trim().length < 3}>
            {isPending ? "Creating" : "Create draft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
