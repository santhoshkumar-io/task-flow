import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "../../lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  /** Shown before the value on the trigger: `Status : All`. */
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** The label for the "no choice" option. Its value is always "". */
  emptyLabel?: string;
  /** Used when there is no label prefix — the create drawer. */
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

// Radix rather than a hand-rolled dropdown, decided in V6. Keyboard handling,
// focus trapping, typeahead and closing on Escape are all easy to get quietly
// wrong, and getting them wrong is invisible until somebody tries to use the
// screen without a mouse.
//
// The trap: Radix throws if an Item has value="", because it reserves the
// empty string to mean "nothing is selected". Our "All" option genuinely IS
// the empty string as far as the URL and the API are concerned. So "" is
// swapped for a sentinel on the way in and swapped back on the way out, and
// callers never see it.
const EMPTY = "__all__";

export function Select({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  placeholder,
  className,
  id,
  disabled,
}: SelectProps) {
  const items = emptyLabel
    ? [{ value: EMPTY, label: emptyLabel }, ...options]
    : options;

  const selected = items.find((option) => option.value === (value || EMPTY));

  return (
    <RadixSelect.Root
      value={value || EMPTY}
      onValueChange={(next) => onChange(next === EMPTY ? "" : next)}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        id={id}
        className={cn(
          "inline-flex h-10 items-center justify-between gap-2 rounded-lg border border-line",
          "bg-white px-3 text-sm text-ink whitespace-nowrap",
          "hover:bg-surface focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[placeholder]:text-muted",
          className,
        )}
      >
        <span className="truncate">
          {label && <span className="text-muted">{label} : </span>}
          {selected ? (
            selected.label
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </span>
        <RadixSelect.Icon>
          <ChevronDown />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      {/* Portalled to the end of <body> so the open list is never clipped by a
          parent with overflow-hidden — the filter bar is inside one. */}
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden",
            "rounded-lg border border-line bg-white p-1 shadow-md",
          )}
        >
          <RadixSelect.Viewport>
            {items.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                className={cn(
                  "relative flex cursor-pointer items-center rounded-md py-2 pr-8 pl-3",
                  "text-sm text-ink select-none",
                  "data-[highlighted]:bg-surface data-[highlighted]:outline-none",
                )}
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                {/* The tick beside the selected option — drawn in section 5. */}
                <RadixSelect.ItemIndicator className="absolute right-2 inline-flex">
                  <Check />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

function ChevronDown() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4 shrink-0 text-muted"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}
