"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/database.types";
import { policyBodyUrl, uploadPolicyBody } from "../actions";

export function BodyDocument({
  policy,
  canWrite,
}: {
  policy: Tables<"policies">;
  canWrite: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const editable = canWrite && ["draft", "consultation"].includes(policy.status);
  const fileName = policy.body_storage_path?.split("/").pop();

  function upload(file: File) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("policyId", policy.id);
      formData.set("file", file);
      const result = await uploadPolicyBody(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Document uploaded");
      router.refresh();
    });
  }

  function download() {
    startTransition(async () => {
      const result = await policyBodyUrl(policy.body_storage_path!);
      if (!result.ok || !result.url) {
        toast.error(result.ok ? "Could not sign URL" : result.error);
        return;
      }
      window.open(result.url, "_blank");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Policy document</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        {fileName ? (
          <button
            type="button"
            onClick={download}
            disabled={isPending}
            className="flex items-center gap-2 text-sm underline"
          >
            <FileText className="size-4" />
            {fileName}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">No document uploaded.</p>
        )}
        {editable && (
          <>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              disabled={isPending}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="size-4" />
              {isPending ? "Uploading" : fileName ? "Replace" : "Upload"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
