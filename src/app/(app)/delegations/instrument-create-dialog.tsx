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
import { createInstrument } from "./actions";

export function InstrumentCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"council_to_gm" | "gm_to_staff">("gm_to_staff");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createInstrument({ title, instrument_type: type });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      setTitle("");
      router.push(`/delegations/${result.id}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New instrument
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New delegation instrument</DialogTitle>
          <DialogDescription>
            The instrument starts as a draft. Add delegations and position
            assignments, then adopt it to bring it into force.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instrument-title">Title</Label>
            <Input
              id="instrument-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Instrument of Sub-Delegation: General Manager to Staff"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="council_to_gm">
                  Council to General Manager (s 377)
                </SelectItem>
                <SelectItem value="gm_to_staff">
                  General Manager to staff (s 378)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={submit} disabled={isPending || title.trim().length < 3}>
            {isPending ? "Creating" : "Create draft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
