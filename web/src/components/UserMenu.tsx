import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut } from "lucide-react";
import { useAuth } from "../features/auth/auth-context";
import { Avatar } from "./ui/Avatar";

// The avatar in the top bar is the account menu.
//
// The design draws no "Sign out" text beside it, and a bare avatar that does
// nothing when clicked is a dead control on the one element everybody tries
// first. So the avatar became the button, and Sign out moved inside it.
//
// The menu names who you are before it offers to sign you out. On a shared
// machine — or with two accounts open in two windows — "Sign out" with no name
// attached is a button you press and then hope.

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Account menu for ${user.name}`}
        className="rounded-full focus:ring-2 focus:ring-accent/30 focus:outline-none"
      >
        <Avatar
          name={user.name}
          size="sm"
          tone="accent"
          className="cursor-pointer hover:ring-2 hover:ring-accent/40"
        />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-56 rounded-lg border border-line bg-white p-1 shadow-md"
        >
          <DropdownMenu.Label className="px-2 py-1.5">
            <span className="block truncate text-sm font-medium text-ink">
              {user.name}
            </span>
            <span className="block truncate text-xs text-muted">
              {user.email}
            </span>
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <DropdownMenu.Item
            onSelect={() => void logout()}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink outline-none data-highlighted:bg-surface"
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
