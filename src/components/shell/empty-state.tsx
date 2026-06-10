import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Empty states teach the framework: one sentence of statutory context,
// then the primary action (disabled until the module ships).
export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  comingSoon,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  comingSoon?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-dashed bg-card">
      <div className="max-w-md px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-accent">
          <Icon className="size-6 text-accent-foreground" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {actionLabel && (
          <Button className="mt-6" disabled={Boolean(comingSoon)}>
            {actionLabel}
          </Button>
        )}
        {comingSoon && (
          <p className="mt-2 text-xs text-muted-foreground">{comingSoon}</p>
        )}
      </div>
    </div>
  );
}
