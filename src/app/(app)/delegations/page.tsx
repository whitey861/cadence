import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";

export default function DelegationsPage() {
  return (
    <>
      <PageHeader
        title="Delegations"
        description="Instruments of delegation from the council to the General Manager and from the General Manager to staff."
      />
      <EmptyState
        icon={ScrollText}
        title="No delegation instruments yet"
        body="Under s 377 of the Local Government Act 1993 the council may delegate functions to the General Manager, who may sub-delegate them to staff under s 378. Cadence keeps every instrument versioned with acknowledgments tracked by position."
        actionLabel="Create instrument"
        comingSoon="Delegations arrive in the next release."
      />
    </>
  );
}
