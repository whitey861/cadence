"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeReviewTask } from "../policies/actions";

export function CompleteReviewButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function complete() {
    startTransition(async () => {
      const result = await completeReviewTask(taskId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Review completed");
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={complete} disabled={isPending}>
      {isPending ? "Completing" : "Mark complete"}
    </Button>
  );
}
