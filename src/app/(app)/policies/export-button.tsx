"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PoliciesExportButton() {
  return (
    <Button variant="outline" onClick={() => window.open("/policies/export", "_blank")}>
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
