"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { acknowledgePolicy } from "../actions";

export function PolicyAckButton({ requirementId }: { requirementId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function acknowledge() {
    startTransition(async () => {
      const result = await acknowledgePolicy(requirementId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Policy acknowledged");
      router.refresh();
    });
  }

  return (
    <Button onClick={acknowledge} disabled={isPending} className="shrink-0">
      {isPending ? "Acknowledging" : "Acknowledge"}
    </Button>
  );
}
