"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import type { Tables } from "@/lib/database.types";
import { adoptInstrument, archiveInstrument, supersedeInstrument } from "../actions";

export function InstrumentActions({
  instrument,
  successorId,
}: {
  instrument: Tables<"delegation_instruments">;
  successorId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [adoptedDate, setAdoptedDate] = useState("");
  const [resolution, setResolution] = useState("");

  const needsResolution = instrument.instrument_type === "council_to_gm";

  function adopt() {
    startTransition(async () => {
      const result = await adoptInstrument({
        instrumentId: instrument.id,
        adoptedDate,
        resolutionReference: resolution || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAdoptOpen(false);
      toast.success("Instrument adopted");
      router.refresh();
    });
  }

  function supersede() {
    startTransition(async () => {
      const result = await supersedeInstrument(instrument.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft successor created");
      router.push(`/delegations/${result.id}`);
    });
  }

  function archive() {
    startTransition(async () => {
      const result = await archiveInstrument(instrument.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft archived");
      router.push("/delegations");
    });
  }

  if (instrument.status === "draft") {
    return (
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="outline" disabled={isPending}>Archive draft</Button>}
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive this draft?</AlertDialogTitle>
              <AlertDialogDescription>
                The draft and its delegations are kept for the record but can no
                longer be edited or adopted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={archive}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={adoptOpen} onOpenChange={setAdoptOpen}>
          <DialogTrigger render={<Button disabled={isPending}>Adopt</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adopt instrument</DialogTitle>
              <DialogDescription>
                Adoption brings the instrument into force and freezes its
                content. {instrument.supersedes_id && "The previous version is superseded automatically. "}
                Occupants of assigned positions will be asked to acknowledge
                their delegations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adopted-date">Adoption date</Label>
                <Input
                  id="adopted-date"
                  type="date"
                  value={adoptedDate}
                  onChange={(e) => setAdoptedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resolution">
                  Resolution reference{needsResolution ? "" : " (optional)"}
                </Label>
                <Input
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder={needsResolution ? "MIN 2026/123" : "GM Approval 2026/12"}
                />
              </div>
              <Button
                onClick={adopt}
                disabled={isPending || !adoptedDate || (needsResolution && !resolution)}
              >
                {isPending ? "Adopting" : "Adopt instrument"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (instrument.status === "adopted") {
    return (
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="outline" disabled={isPending || successorId !== null}>
              {successorId ? "Draft successor exists" : "Supersede"}
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supersede this instrument?</AlertDialogTitle>
            <AlertDialogDescription>
              A new draft version is created with a copy of every delegation,
              provision link and active assignment. This instrument stays in
              force until the new version is adopted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={supersede}>Create draft successor</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return null;
}
