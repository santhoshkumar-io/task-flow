import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";
import { Avatar } from "./ui/Avatar";
import { Button } from "./ui/Button";

interface TopBarProps {
  /** `TaskFlow › Tasks › TF-118` — the only part that changes between screens. */
  breadcrumb: string[];
  onOpenMenu: () => void;
}

export function TopBar({ breadcrumb, onOpenMenu }: TopBarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    // 56px tall — see docs/decisions/0003-design-tokens.md, a chosen value.
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="-ml-1 rounded-lg p-2 text-ink hover:bg-line/40 md:hidden"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.5]">
          <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
        </svg>
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          {breadcrumb.map((crumb, index) => {
            const isLast = index === breadcrumb.length - 1;
            return (
              <li key={crumb} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="text-muted">
                    ›
                  </span>
                )}
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-ink" : "text-muted"}
                >
                  {crumb}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Inert in V6 because there was no list to search. Now it hands the
          text to the task list, which owns searching — the same ?q= the
          filter bar writes, so one search and one set of results.
          The notification bell stays disabled: it is on the deliberate
          exclusion list, not merely unbuilt. */}
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const text = new FormData(event.currentTarget).get("q");
          navigate(`/tasks?q=${encodeURIComponent(String(text ?? "").trim())}`);
        }}
        className="hidden lg:block"
      >
        <label htmlFor="global-search" className="sr-only">
          Search tasks
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 fill-none stroke-current stroke-[1.5]">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="global-search"
            name="q"
            type="search"
            placeholder="Search tasks…"
            className="h-9 w-56 rounded-lg border border-line bg-white pr-3 pl-8 text-sm text-ink placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none"
          />
        </div>
      </form>

      <button
        type="button"
        disabled
        title="Notifications are not part of this build — see the README"
        aria-label="Notifications"
        className="cursor-not-allowed rounded-lg p-2 text-muted opacity-60"
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-none stroke-current stroke-[1.5]">
          <path d="M4 6.5a4 4 0 118 0c0 3 1 4 1 4H3s1-1 1-4z" />
          <path d="M6.5 13a1.6 1.6 0 003 0" strokeLinecap="round" />
        </svg>
      </button>

      {user && <Avatar name={user.name} size="sm" />}

      <Button variant="ghost" size="sm" onClick={() => void logout()}>
        Sign out
      </Button>
    </header>
  );
}
