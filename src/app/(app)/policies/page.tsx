import { BookMarked } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";

export default function PoliciesPage() {
  return (
    <>
      <PageHeader
        title="Policies"
        description="The policy register: ownership by position, review cycles, versions and staff acknowledgments."
      />
      <EmptyState
        icon={BookMarked}
        title="No policies yet"
        body="Each policy carries an owning position, a review cycle and a full version history. Superseding a policy creates a new version; adopted versions are never edited."
        actionLabel="Add policy"
        comingSoon="Policies arrive in the next release."
      />
    </>
  );
}
