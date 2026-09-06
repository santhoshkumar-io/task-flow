import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { cn } from "../../lib/cn";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "../../types";

// The design draws Role as a small grey chip, not a form control. Everybody
// sees the same chip; an admin gets a chevron inside it on OTHER people's rows,
// so the control is visibly there rather than hiding until you hover it.
//
// Deliberately NOT the shared Select. That component hard-codes an h-10
// bordered white trigger, which is a form field — right for the filter row
// above the table, wrong for a 22px chip inside a cell. DropdownMenu is the
// same primitive MemberMenu already uses two components away.

interface RoleChipProps {
  /** Undefined when the row arrived without one — see the fallback below. */
  role: UserRole | undefined;
  /** An admin, on somebody else's row. False everywhere else. */
  editable: boolean;
  onChange: (role: UserRole) => void;
  pending?: boolean;
}

export function RoleChip({
  role,
  editable,
  onChange,
  pending = false,
}: RoleChipProps) {
  // An em dash, not an empty chip. A blank bordered box reads as a broken
  // control; "—" reads as "no answer", which is the truth. This is the shape
  // the mobile card has always used.
  if (!role) {
    return (
      <span className="text-muted" title="No role recorded for this person">
        —
      </span>
    );
  }

  if (!editable) {
    return <Badge tone="neutral">{ROLE_LABELS[role]}</Badge>;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={pending}
        aria-label={`Role: ${ROLE_LABELS[role]}. Change role`}
        className={cn(
          "rounded-md focus:ring-2 focus:ring-accent/30 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Badge tone="neutral" className="cursor-pointer hover:bg-line">
          {ROLE_LABELS[role]}
          <ChevronDown className="size-3 shrink-0 text-muted" aria-hidden="true" />
        </Badge>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-48 rounded-lg border border-line bg-white p-1 shadow-md"
        >
          <DropdownMenu.RadioGroup
            value={role}
            onValueChange={(next) => onChange(next as UserRole)}
          >
            {USER_ROLES.map((value) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className="relative flex cursor-pointer items-center rounded-md py-1.5 pr-8 pl-3 text-sm text-ink outline-none select-none data-highlighted:bg-surface"
              >
                {ROLE_LABELS[value]}
                <DropdownMenu.ItemIndicator className="absolute right-2 inline-flex">
                  <Check className="size-4" aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
