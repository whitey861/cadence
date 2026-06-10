"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acknowledgeDelegation } from "../actions";

export function AcknowledgeButton({
  delegationAssignmentId,
  positionAssignmentId,
}: {
  delegationAssignmentId: string;
  positionAssignmentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function acknowledge() {
    startTransition(async () => {
      const result = await acknowledgeDelegation(
        delegationAssignmentId,
        positionAssignmentId
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Delegation acknowledged");
      router.refresh();
    });
  }

  return (
    <Button onClick={acknowledge} disabled={isPending} className="shrink-0">
      {isPending ? "Acknowledging" : "Acknowledge"}
    </Button>
  );
}
