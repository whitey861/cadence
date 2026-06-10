"use client";

import { useTransition } from "react";
import { Building2, ChevronsUpDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchWorkspace } from "@/app/(app)/actions";

type WorkspaceOption = {
  id: string;
  name: string;
  state: string;
};

export function WorkspaceSwitcher({
  current,
  options,
}: {
  current: WorkspaceOption;
  options: WorkspaceOption[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-60"
        disabled={isPending}
      >
        <Building2 className="size-4 shrink-0 text-sidebar-foreground/70" />
        <span className="flex-1 truncate font-medium text-white">
          {current.name}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onSelect={() => {
              if (option.id !== current.id) {
                startTransition(() => switchWorkspace(option.id));
              }
            }}
          >
            <span className="flex-1 truncate">{option.name}</span>
            <span className="text-xs text-muted-foreground">{option.state}</span>
            {option.id === current.id && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
