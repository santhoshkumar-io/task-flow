import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

/** Every item in this menu shares one glyph size. */
const ICON = "size-4 shrink-0";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "../../lib/cn";

// The ⋯ menu — the design's three items.
//
// *Duplicate* was on the plan's exclusion list and left out for eight versions.
// It is built now, and it needed no server work: duplicating is POST /api/tasks
// with the same fields, which the create drawer already does.
//
// *Delete task* appears only for somebody allowed to use it (0006, amended by
// 0021 so an admin may delete anybody's). That is a kindness, not the guard —
// the server answers 404 to anyone else.

interface TaskActionsMenuProps {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canDelete: boolean;
  /** True while the copy is being created, so the item can say so. */
  duplicating?: boolean;
  /** Small on a table row, normal in the detail header. */
  size?: "sm" | "md";
}

export function TaskActionsMenu({
  onEdit,
  onDuplicate,
  onDelete,
  canDelete,
  duplicating = false,
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
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          onClick={(event) => event.stopPropagation()}
          className="z-50 min-w-40 rounded-lg border border-line bg-white p-1 shadow-md"
        >
          <Item onSelect={onEdit} icon={<Pencil className={ICON} aria-hidden="true" />}>
            Edit task
          </Item>

          <Item onSelect={onDuplicate} icon={<Copy className={ICON} aria-hidden="true" />}>
            {duplicating ? "Duplicating…" : "Duplicate"}
          </Item>

          {canDelete && (
            <Item onSelect={onDelete} icon={<Trash2 className={ICON} aria-hidden="true" />} destructive>
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
