import { useAuth } from "../features/auth/auth-context";
import type { PersonRef } from "../types";
import { Avatar } from "./ui/Avatar";

/**
 * An avatar for somebody the app knows by id — an assignee, a creator, a
 * comment author, a team member.
 *
 * It decides for itself whether that person is you, so the "this one is you"
 * tint cannot be applied on one screen and quietly forgotten on the next. That
 * had already happened: the tint reached the Team table and the comment thread
 * but not the task list, the task card or the info card, because each of those
 * repeated the comparison by hand and three of them never got it.
 *
 * Use this wherever there is an id to compare. `Avatar` with an explicit
 * `tone="accent"` stays for the places that are ALWAYS you — the top bar, the
 * sidebar, the comment box — where there is nobody else it could be.
 *
 * Lives in components/ rather than components/ui/ on purpose: it reads the
 * signed-in user, so it is not a primitive. Same reason Sidebar and TopBar
 * sit here.
 */
export function PersonAvatar({
  person,
  size,
  className,
}: {
  person: PersonRef;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { user } = useAuth();

  return (
    <Avatar
      name={person.name}
      size={size}
      tone={person._id === user?._id ? "accent" : "neutral"}
      className={className}
    />
  );
}
