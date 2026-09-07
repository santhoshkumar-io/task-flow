import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CreateTaskDrawer } from "../features/tasks/CreateTaskDrawer";
import { CreateTaskContext } from "../features/tasks/create-task-context";
import { useMyTasksActive } from "../hooks/useMyTasksActive";
import { cn } from "../lib/cn";
import { LINKS } from "./nav-links";
import { Sidebar } from "./Sidebar";
import { Drawer } from "./ui/Drawer";
import { Logo } from "./Logo";
import { TopBar } from "./TopBar";

// The frame every signed-in screen sits inside.
//
// This is a LAYOUT ROUTE: React Router renders whichever screen matches the URL
// into <Outlet /> below, and everything around it stays mounted. So moving from
// /tasks to /tasks/123 does not rebuild the sidebar — only the breadcrumb and
// the panel change.
export function AppLayout() {
  const location = useLocation();

  // The menu remembers WHICH page it was opened on. If the URL has moved on
  // since, it counts as closed.
  //
  // This is derived during render rather than closed by an effect. An effect
  // would set state during render and cause a second render every time the URL
  // changes; this costs nothing and also covers the browser back button, which
  // an onClick handler on the links would miss.
  const [menu, setMenu] = useState({ open: false, at: location.pathname });
  const menuOpen = menu.open && menu.at === location.pathname;

  const openMenu = () => setMenu({ open: true, at: location.pathname });
  const closeMenu = () => setMenu({ open: false, at: location.pathname });

  // Escape, the focus trap, the scroll lock and returning focus to the
  // hamburger all come from Radix now that the sheet is a Drawer. The hand-
  // rolled panel this replaced had none of them.

  // On a phone the task detail screen draws its own bar — "← Tasks" on the
  // left, the ⋯ menu on the right — and docks the comment box where the tab
  // bar would be. Two bars top and two bottom is 224px of an 844px screen.
  const taskDetail = location.pathname.startsWith("/tasks/");

  // The drawer is owned by the FRAME, not the task list, because the design
  // puts a Create button in the mobile bottom bar — a sibling of <Outlet />
  // with no prop path to the page inside it.
  const [createOpen, setCreateOpen] = useState(false);
  // A new object every render would re-render every consumer of the context
  // for nothing. setCreateOpen is stable, so this is memoised for the life of
  // the layout — it is listed because React Compiler checks the list against
  // what it infers, and an empty one does not match.
  const createTask = useMemo(
    () => ({ open: () => setCreateOpen(true) }),
    [setCreateOpen],
  );

  return (
    <CreateTaskContext value={createTask}>
      <div className="flex h-screen overflow-hidden bg-canvas">
        {/* Desktop: always there. Hidden below 768px. */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Phone: slides in from the left over a dimmed page. Narrow on
            purpose — the dimmed page stays visible beside it, so it reads as
            a layer over this screen rather than a new one. */}
        <Drawer
          open={menuOpen}
          onOpenChange={(next) => (next ? openMenu() : closeMenu())}
          side="left"
          width="menu"
          padded={false}
          title="Menu"
          header={<Logo />}
        >
          <Sidebar variant="sheet" onNavigate={closeMenu} />
        </Drawer>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className={cn(taskDetail && "hidden md:block")}>
            <TopBar
              breadcrumb={breadcrumbFor(location.pathname)}
              title={titleFor(location.pathname)}
              onOpenMenu={openMenu}
              showSearch={!hasOwnSearch(location.pathname)}
            />
          </div>

          {/* 40px content padding on desktop — a chosen value, see 0003.
              pb-24 clears whichever bar is at the bottom on a phone: the tab
              bar everywhere else, the docked comment box here. */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-10 md:pb-10">
            <Outlet />
          </main>

          {!taskDetail && <MobileTabBar onCreate={createTask.open} />}
        </div>

        <CreateTaskDrawer open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </CreateTaskContext>
  );
}

// Three tabs and a Create Task pill — the phone frames. Only below 768px.
//
// The tabs are the sidebar's own list with Team dropped, rather than a second
// copy of it. V9 already lost a morning to the tab bar and the sidebar
// disagreeing about which item was lit; the fix then was one shared rule, and
// this is the same idea applied to the list itself.
const TABS = LINKS.filter((link) => link.to !== "/team");

function MobileTabBar({ onCreate }: { onCreate: () => void }) {
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-line bg-surface md:hidden">
        {TABS.map(({ to, label, icon }) => (
          <TabLink key={to} to={to} label={label} icon={icon} />
        ))}
      </nav>

      {/* The frame draws this pill sitting ON the third tab. Floated clear of
          the bar instead: a tab you cannot press is exactly the dead control
          AGENTS.md calls the worst of the three options. bottom-20 is the
          64px bar plus 16px. */}
      <button
        type="button"
        onClick={onCreate}
        className="fixed right-4 bottom-20 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-white shadow-md hover:bg-ink/90 md:hidden"
      >
        <Plus className="size-5" aria-hidden="true" />
        Create Task
      </button>
    </>
  );
}

function TabLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {
  const viewingMyTasks = useMyTasksActive();

  // Same override the sidebar uses: after /my-tasks redirects, the URL says
  // /tasks, so without this "Tasks" lights up while you are looking at your
  // own list and "My Tasks" stays grey.
  const isActive = (routerSaysActive: boolean) => {
    if (to === "/my-tasks") return viewingMyTasks;
    if (to === "/tasks") return routerSaysActive && !viewingMyTasks;
    return routerSaysActive;
  };

  return (
    <NavLink
      to={to}
      className={({ isActive: routerSaysActive }) =>
        cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
          isActive(routerSaysActive) ? "text-ink" : "text-muted",
        )
      }
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </NavLink>
  );
}

// The one thing that changes between screens.
function breadcrumbFor(pathname: string): string[] {
  if (pathname.startsWith("/tasks/")) {
    return ["TaskFlow", "Tasks", "Task"];
  }

  const names: Record<string, string> = {
    "/tasks": "Tasks",
    "/my-tasks": "My Tasks",
    "/dashboard": "Dashboard",
    "/team": "Team",
  };

  const name = names[pathname];
  return name ? ["TaskFlow", name] : ["TaskFlow"];
}

// The one word a phone shows instead of the chain. Derived from the same
// array, so there is still only one place the screen names are written down.
//
// The dashboard is the home screen and carries the brand, as the frame draws
// it. Everywhere else it is the last crumb — the screen you are on.
function titleFor(pathname: string): string {
  if (pathname === "/dashboard") return "TaskFlow";

  const crumbs = breadcrumbFor(pathname);
  return crumbs[crumbs.length - 1];
}

// Screens with a search box of their own. Offering the top-bar magnifier here
// too would put two searches on one phone screen, and only one of them would
// search what you are looking at.
function hasOwnSearch(pathname: string): boolean {
  return pathname === "/tasks" || pathname === "/team";
}
