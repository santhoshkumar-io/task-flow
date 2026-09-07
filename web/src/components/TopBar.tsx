import { Bell, Menu, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  /** `TaskFlow › Tasks › TF-118` — the only part that changes between screens. */
  breadcrumb: string[];
  /** The same thing said in one word, for a phone. */
  title: string;
  onOpenMenu: () => void;
  /**
   * Whether to offer the magnifier on a phone. Off on screens that already
   * have their own search box, so nobody is given two of them.
   */
  showSearch: boolean;
}

export function TopBar({
  breadcrumb,
  title,
  onOpenMenu,
  showSearch,
}: TopBarProps) {
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
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {/* A phone gets the name of the screen, not the chain that leads to
          it. At 390px `TaskFlow › Tasks` spends half the bar saying something
          the logo in the menu already says.

          A <p> and not an <h1>: the page inside <main> already has the one
          heading this screen gets, and a second h1 in the frame would give a
          screen reader two answers to "what is this page". The desktop
          breadcrumb beside it is not a heading either. */}
      <p className="min-w-0 flex-1 truncate font-heading text-base font-semibold text-ink md:hidden">
        {title}
      </p>

      <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 md:block">
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
            <Search className="size-4" aria-hidden="true" />
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

      {/* Below 1024px the search FORM is hidden, so a phone gets the magnifier
          on its own. It goes to the task list, which is where the search box
          lives — the same destination the form above submits to. */}
      {showSearch && (
        <Link
          to="/tasks"
          aria-label="Search tasks"
          className="rounded-lg p-2 text-ink hover:bg-line/40 lg:hidden"
        >
          <Search className="size-5" aria-hidden="true" />
        </Link>
      )}

      {/* Desktop only. The bell is on the deliberate exclusion list and stays
          inert where it is drawn; the phone frames do not draw it at all, and
          a dead control is worth less on the smaller screen. */}
      <button
        type="button"
        disabled
        title="Notifications are not part of this build — see the README"
        aria-label="Notifications"
        className="hidden cursor-not-allowed rounded-lg p-2 text-muted opacity-60 md:inline-flex"
      >
        <Bell className="size-5" aria-hidden="true" />
      </button>

      {/* Sign out lives inside this, on the avatar. See UserMenu. */}
      <UserMenu />
    </header>
  );
}
