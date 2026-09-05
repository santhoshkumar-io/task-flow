import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn";

// The ⋯ menu. Two items, not the design's three.
//
// *Duplicate* is on the plan's exclusion list, so it is left out rather than
// drawn dead — AGENTS.md calls a visible control that silently does nothing the
// worst of the three options.
//
// *Delete task* appears only for the creator (docs/decisions/0006). That is a
// kindness, not the guard: the server answers 404 to anyone else, which the
// exit check proves with curl.

interface TaskActionsMenuProps {
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  /** Small on a table row, normal in the detail header. */
  size?: "sm" | "md";
}

export function TaskActionsMenu({
  onEdit,
  onDelete,
  canDelete,
  size = "md",
}: TaskActionsMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Task actions"
        // stopPropagation because on a table row this sits inside a link. A
        // click that reached the row would open the task instead of the menu.
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "inline-flex items-center justify-center rounded-lg text-muted",
          "hover:bg-surface hover:text-ink",
          "focus:ring-2 focus:ring-accent/30 focus:outline-none",
          size === "sm" ? "size-8" : "size-9 border border-line bg-white",
        )}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4 fill-current">
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          onClick={(event) => event.stopPropagation()}
          className="z-50 min-w-40 rounded-lg border border-line bg-white p-1 shadow-md"
        >
          <Item onSelect={onEdit} icon={<PencilIcon />}>
            Edit task
          </Item>

          {canDelete && (
            <Item onSelect={onDelete} icon={<BinIcon />} destructive>
              Delete task
            </Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Item({
  children,
  onSelect,
  icon,
  destructive,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm select-none",
        "data-highlighted:outline-none",
        destructive
          ? "text-destructive data-highlighted:bg-status-blocked-bg"
          : "text-ink data-highlighted:bg-surface",
      )}
    >
      {/* The icon carries no meaning the label does not already give, so it is
          hidden from screen readers rather than read out twice. */}
      <span aria-hidden="true" className="shrink-0">
        {icon}
      </span>
      {children}
    </DropdownMenu.Item>
  );
}

const ICON = "size-4 fill-none stroke-current stroke-[1.5]";

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5a1.4 1.4 0 0 1 2 2L6 12l-2.5.5L4 10z" />
    </svg>
  );
}

function BinIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4.5h11M6.5 4.5v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1" />
      <path d="M4 4.5 4.7 13a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4.5" />
      <path d="M6.7 7v4M9.3 7v4" />
    </svg>
  );
}
