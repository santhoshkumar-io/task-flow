import { NavLink } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { cn } from "../lib/cn";
import { Avatar } from "./ui/Avatar";
import { Logo } from "./Logo";

interface SidebarProps {
  /** Called when a link is tapped, so the mobile slide-over can close itself. */
  onNavigate?: () => void;
}

// The design draws a count badge beside "My Tasks". It is not drawn here,
// because the real number comes from the API in V9 and AGENTS.md forbids
// putting a number on screen that did not come from an API response. Listed as
// a known difference in docs/notes/v6.md.
const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: GridIcon },
  { to: "/tasks", label: "Tasks", icon: ListIcon },
  { to: "/my-tasks", label: "My Tasks", icon: ListIcon },
  { to: "/team", label: "Team", icon: PeopleIcon },
] as const;

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user } = useAuth();

  return (
    // 216px wide and never scrolls — section 3 of the design reference.
    <aside className="flex h-full w-sidebar shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex h-14 items-center px-4">
        <Logo />
      </div>

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
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    isActive
                      // The selected link gets a light grey pill behind it.
                      ? "bg-line/60 font-medium text-ink"
                      : "text-muted hover:bg-line/40 hover:text-ink",
                  )
                }
              >
                <Icon />
                <span className="flex-1">{label}</span>
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
          <GearIcon />
          Settings
        </button>

        {user && (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar name={user.name} size="sm" />
            <span className="truncate text-sm font-medium text-ink">
              {user.name}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.5]">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.5]">
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.5]">
      <circle cx="6" cy="5.5" r="2.5" />
      <path d="M1.5 14a4.5 4.5 0 019 0M11 3.2a2.5 2.5 0 010 4.6M12.5 14a4.5 4.5 0 00-1.2-3" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.5]">
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4" strokeLinecap="round" />
    </svg>
  );
}
