import { LogOut, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { useMyTasksActive } from "../hooks/useMyTasksActive";
import { useMyOpenTaskCount } from "../hooks/useStats";
import { cn } from "../lib/cn";
import { LINKS } from "./nav-links";
import { Avatar } from "./ui/Avatar";
import { Logo } from "./Logo";

interface SidebarProps {
  /** Called when a link is tapped, so the mobile slide-over can close itself. */
  onNavigate?: () => void;
  /**
   * "rail" is the fixed 216px strip on desktop.
   *
   * "sheet" is the phone slide-over. It draws no logo of its own — the sheet
   * header holds it, beside the close button — and its footer carries the
   * email and a sign-out button, because on a phone the top-bar avatar menu
   * is behind the sheet and cannot be reached.
   */
  variant?: "rail" | "sheet";
}

export function Sidebar({ onNavigate, variant = "rail" }: SidebarProps) {
  const { user, logout } = useAuth();
  const sheet = variant === "sheet";

  // The count badge the design draws beside "My Tasks". V6 left it out because
  // the number did not exist yet; this is it, from GET /api/users/stats.
  //
  // It counts what is NOT DONE, not everything assigned to you. Undefined while
  // loading or on failure, and then no badge is drawn — a zero would be a claim
  // that you have nothing left to do.
  const myTasks = useMyOpenTaskCount();

  // Shared with the mobile tab bar, so both menus agree about which item is lit.
  const viewingMyTasks = useMyTasksActive();

  const isActive = (to: string, routerSaysActive: boolean) => {
    if (to === "/my-tasks") return viewingMyTasks;
    if (to === "/tasks") return routerSaysActive && !viewingMyTasks;
    return routerSaysActive;
  };

  return (
    // 216px wide and never scrolls — section 3 of the design reference. The
    // sheet takes its width and its surface from the panel it sits in.
    <aside
      className={cn(
        "flex h-full flex-col",
        sheet
          ? "bg-white"
          : "w-sidebar shrink-0 border-r border-line bg-surface",
      )}
    >
      {!sheet && (
        <div className="flex h-14 items-center px-4">
          <Logo />
        </div>
      )}

      <nav className="flex-1 px-3 py-2">
        <p className="px-2 pb-2 text-[11px] font-medium tracking-wider text-muted uppercase">
          Workspace
        </p>

        <ul className="space-y-0.5">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
                className={({ isActive: routerSaysActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    isActive(to, routerSaysActive)
                      // The selected link gets a light grey pill behind it.
                      ? "bg-line/60 font-medium text-ink"
                      : "text-muted hover:bg-line/40 hover:text-ink",
                  )
                }
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">{label}</span>

                {/* The badge and the row count on the list will differ, because
                    the list shows all your tasks and the badge shows only the
                    unfinished ones. Both numbers are in the label so nobody has
                    to guess which is wrong — neither is. */}
                {to === "/my-tasks" && myTasks !== undefined && (
                  <span
                    title={`${myTasks.open} of your ${myTasks.assigned} tasks are not done`}
                    aria-label={`${myTasks.open} of your ${myTasks.assigned} tasks are not done`}
                    className="rounded-md bg-line px-1.5 text-[11px] font-medium text-ink"
                  >
                    {myTasks.open}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Settings and the signed-in person pinned to the bottom. */}
      <div className="border-t border-line p-3">
        <button
          type="button"
          disabled
          title="Settings is not part of this build — see the README"
          className="mb-1 flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-muted opacity-60"
        >
          <Settings className="size-5 shrink-0" aria-hidden="true" />
          Settings
        </button>

        {user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            {/* Always you, so always tinted. */}
            <Avatar name={user.name} size={sheet ? "md" : "sm"} tone="accent" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {user.name}
              </p>
              {/* The email only on a phone. The 216px rail has no room for it,
                  and the top-bar avatar menu already shows it there. */}
              {sheet && (
                <p className="truncate text-xs text-muted">{user.email}</p>
              )}
            </div>

            {sheet && (
              <button
                type="button"
                onClick={() => void logout()}
                aria-label="Sign out"
                title="Sign out"
                className="shrink-0 rounded-lg p-2 text-muted hover:bg-line/40 hover:text-ink"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

