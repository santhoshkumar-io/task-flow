import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { CreateTaskDrawer } from "../features/tasks/CreateTaskDrawer";
import { CreateTaskContext } from "../features/tasks/create-task-context";
import { useMyTasksActive } from "../hooks/useMyTasksActive";
import { cn } from "../lib/cn";
import { Sidebar } from "./Sidebar";
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

  // Escape closes it, which people expect from anything covering the page.
  //
  // The listener is on the document rather than on the panel, because focus may
  // be anywhere on the page when the key is pressed. That is a real external
  // system, which is what an effect is for.
  useEffect(() => {
    if (!menuOpen) return;

    const pathname = location.pathname;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenu({ open: false, at: pathname });
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, location.pathname]);

  // The drawer is owned by the FRAME, not the task list, because the design
  // puts a Create button in the mobile bottom bar — a sibling of <Outlet />
  // with no prop path to the page inside it.
  const [createOpen, setCreateOpen] = useState(false);
  const createTask = useMemo(
    () => ({ open: () => setCreateOpen(true) }),
    // No dependencies: a new object every render would re-render every
    // consumer of the context for nothing.
    [],
  );

  return (
    <CreateTaskContext value={createTask}>
      <div className="flex h-screen overflow-hidden bg-canvas">
        {/* Desktop: always there. Hidden below 768px. */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Phone: slides in over a dimmed page. */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeMenu}
              className="absolute inset-0 bg-ink/40"
            />
            <div className="relative h-full w-sidebar shadow-md">
              <Sidebar onNavigate={closeMenu} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            breadcrumb={breadcrumbFor(location.pathname)}
            onOpenMenu={openMenu}
          />

          {/* 40px content padding on desktop — a chosen value, see 0003. */}
          <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-10 md:pb-10">
            <Outlet />
          </main>

          <MobileTabBar onCreate={createTask.open} />
        </div>

        <CreateTaskDrawer open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </CreateTaskContext>
  );
}

// Two tabs plus a round black Create button — section 3 of the design
// reference. Only below 768px.
function MobileTabBar({ onCreate }: { onCreate: () => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-surface md:hidden">
      {/* Same override the sidebar uses: after /my-tasks redirects, the URL
          says /tasks, so without this "Tasks" lights up while you are looking
          at your own list and "My Tasks" stays grey. */}
      <TabLink to="/tasks" label="Tasks" />

      {/* Inert in V6 with a title saying why. Live now that V7 has built the
          drawer it opens. */}
      <button
        type="button"
        onClick={onCreate}
        aria-label="Create task"
        className="flex size-12 items-center justify-center rounded-full bg-ink text-white hover:bg-ink/90"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-5 fill-none stroke-current stroke-2">
          <path d="M8 3v10M3 8h10" strokeLinecap="round" />
        </svg>
      </button>

      <TabLink to="/my-tasks" label="My Tasks" />
    </nav>
  );
}

function TabLink({ to, label }: { to: string; label: string }) {
  const viewingMyTasks = useMyTasksActive();

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
          "px-4 text-xs font-medium transition-colors",
          isActive(routerSaysActive) ? "text-ink" : "text-muted",
        )
      }
    >
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
