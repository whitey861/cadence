import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext, ROLE_LABELS } from "@/lib/workspace";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { WorkspaceSwitcher } from "@/components/shell/workspace-switcher";
import { UserMenu } from "@/components/shell/user-menu";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const context = await getWorkspaceContext();
  if (!context) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-2xl font-semibold">No workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is not a member of any workspace. Ask your council
            administrator for an invitation.
          </p>
        </div>
      </main>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single();

  const options = context.memberships
    .filter((m) => m.workspaces)
    .map((m) => ({
      id: m.workspaces!.id,
      name: m.workspaces!.name,
      state: m.workspaces!.state,
    }));

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-sidebar">
        <div className="px-4 pb-2 pt-5">
          <p className="font-serif text-lg font-semibold text-white">Cadence</p>
        </div>
        <div className="px-3 pb-2">
          <WorkspaceSwitcher current={context.workspace} options={options} />
        </div>
        <SidebarNav />
        <div className="border-t border-sidebar-border p-2">
          <UserMenu
            displayName={profile?.display_name ?? user.email ?? "User"}
            email={profile?.email ?? user.email ?? ""}
            roleLabel={ROLE_LABELS[context.membership.role]}
          />
        </div>
      </aside>
      <main className="ml-64 flex-1 px-8 py-6">{children}</main>
    </div>
  );
}
