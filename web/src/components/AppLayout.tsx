import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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

  return (
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

        <MobileTabBar />
      </div>
    </div>
  );
}

// Two tabs plus a round black Create button — section 3 of the design
// reference. Only below 768px.
function MobileTabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-surface md:hidden">
      <TabLink to="/tasks" label="Tasks" />

      <button
        type="button"
        disabled
        title="Creating a task arrives with the task list"
        aria-label="Create task"
        className="flex size-12 cursor-not-allowed items-center justify-center rounded-full bg-ink text-white opacity-60"
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
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "px-4 text-xs font-medium transition-colors",
          isActive ? "text-ink" : "text-muted",
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
