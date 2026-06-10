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
import { adoptPolicyAction, supersedePolicyAction, transitionPolicy } from "../actions";

export function PolicyActions({
  policy,
  successorId,
}: {
  policy: Tables<"policies">;
  successorId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adoptOpen, setAdoptOpen] = useState(false);
  const [adoptedDate, setAdoptedDate] = useState("");

  function transition(status: string) {
    startTransition(async () => {
      const result = await transitionPolicy({ policyId: policy.id, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function adopt() {
    startTransition(async () => {
      const result = await adoptPolicyAction({ policyId: policy.id, adoptedDate });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAdoptOpen(false);
      toast.success("Policy adopted");
      router.refresh();
    });
  }

  function supersede() {
    startTransition(async () => {
      const result = await supersedePolicyAction(policy.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft successor created");
      router.push(`/policies/${result.id}`);
    });
  }

  const adoptDialog = (
    <Dialog open={adoptOpen} onOpenChange={setAdoptOpen}>
      <DialogTrigger render={<Button disabled={isPending}>Adopt</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adopt policy</DialogTitle>
          <DialogDescription>
            Adoption brings the policy into force, freezes its content, sets the
            next review date from the review cycle and opens a scheduled review
            task for the owner position.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="policy-adopted-date">Adoption date</Label>
            <Input
              id="policy-adopted-date"
              type="date"
              value={adoptedDate}
              onChange={(e) => setAdoptedDate(e.target.value)}
            />
          </div>
          <Button onClick={adopt} disabled={isPending || !adoptedDate}>
            {isPending ? "Adopting" : "Adopt policy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (policy.status === "draft" || policy.status === "consultation") {
    return (
      <div className="flex gap-2">
        {policy.status === "draft" ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => transition("consultation")}
          >
            Send to consultation
          </Button>
        ) : (
          <Button variant="outline" disabled={isPending} onClick={() => transition("draft")}>
            Return to draft
          </Button>
        )}
        <Button variant="outline" disabled={isPending} onClick={() => transition("archived")}>
          Archive
        </Button>
        {adoptDialog}
      </div>
    );
  }

  if (policy.status === "adopted" || policy.status === "under_review") {
    return (
      <div className="flex gap-2">
        {policy.status === "adopted" ? (
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => transition("under_review")}
          >
            Start review
          </Button>
        ) : (
          <Button variant="outline" disabled={isPending} onClick={() => transition("adopted")}>
            Complete review, no change
          </Button>
        )}

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
              <AlertDialogTitle>Supersede this policy?</AlertDialogTitle>
              <AlertDialogDescription>
                A new draft version is created with the same details and
                acknowledgement requirements. This version stays in force until
                the new one is adopted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={supersede}>Create draft successor</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" disabled={isPending}>
                Rescind
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rescind this policy?</AlertDialogTitle>
              <AlertDialogDescription>
                Rescinding withdraws the policy entirely. This is permanent; a
                rescinded policy cannot return to force.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => transition("rescinded")}>
                Rescind policy
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
