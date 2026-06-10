import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";

export default function RiskPage() {
  return (
    <>
      <PageHeader
        title="Risk registers"
        description="Strategic, operational and project risk registers with controls, treatments and review schedules."
      />
      <EmptyState
        icon={ShieldAlert}
        title="No risk registers yet"
        body="Risks are rated on your council's configurable likelihood and consequence matrix, linked to controls and treatment actions, and reviewed on a schedule with the full rating history kept."
        actionLabel="Add risk"
        comingSoon="Risk Management arrives in a later release."
      />
    </>
  );
}
