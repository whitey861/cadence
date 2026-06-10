import { Map } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";

export default function PlanningPage() {
  return (
    <>
      <PageHeader
        title="IP&R planning"
        description="Community Strategic Plan, Delivery Program and Operational Plan with measures and quarterly progress reporting."
      />
      <EmptyState
        icon={Map}
        title="No plans yet"
        body="The Integrated Planning and Reporting framework links every Operational Plan action up through Delivery Program strategies to Community Strategic Plan outcomes, with progress compiled into council-branded reports."
        actionLabel="Create plan"
        comingSoon="IP&R planning arrives in a later release."
      />
    </>
  );
}
