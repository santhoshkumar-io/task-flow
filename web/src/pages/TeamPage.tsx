import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, Search, SearchX, UserMinus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PersonAvatar } from "../components/PersonAvatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../features/auth/auth-context";
import { ErrorState } from "../features/tasks/ErrorState";
import { InviteMemberDialog } from "../features/team/InviteMemberDialog";
import { RoleChip } from "../features/team/RoleChip";
import { useUserStats } from "../hooks/useStats";
import {
  useChangeRole,
  useMembers,
  useRemoveMember,
  useWorkspace,
} from "../hooks/useTeam";
import { formatRelative } from "../lib/time";
import {
  ROLE_LABELS,
  USER_ROLES,
  USER_STATUS_LABELS,
  type TeamMember,
  type UserStats,
} from "../types";

// Six columns, the design's own:
//
//   Member · Email · Role · Assigned tasks · Status · ⋯
//
// V9 drew five and replaced Role and Status with Tasks created and Last active,
// because roles and invitations did not exist and 0014 refused to draw a column
// it could not fill. Both exist now, so the design's columns win — but the two
// replacements were genuinely useful, so they moved to the mobile card where
// there is room for them.
//
// ROLE IS EDITED HERE, not on Settings. Letting somebody set their own role
// means anybody can make themselves an admin, and an admin may delete anybody's
// task. See docs/decisions/0021-roles-are-real.md.

export function TeamPage() {
  const { user } = useAuth();
  const members = useMembers();
  const stats = useUserStats();
  const workspace = useWorkspace();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  const isAdmin = user?.role === "admin";

  const failed = members.isError || stats.isError;
  const loading = members.isPending || stats.isPending;

  // Filtered in the browser, not on the server. The list is capped by the seat
  // limit, so it is already entirely in the cache — a request per keystroke
  // would be a round trip to search a handful of rows.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (members.data ?? []).filter((person) => {
      if (roleFilter && person.role !== roleFilter) return false;
      if (!needle) return true;

      return (
        person.name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle)
      );
    });
  }, [members.data, query, roleFilter]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
            Team
          </h1>
          <p className="mt-1 text-sm text-muted">
            People working on your projects.
          </p>
        </div>

        {/* Offered only to an admin. The server answers 403 to anybody else
            either way — this just avoids showing a button that cannot work. */}
        {isAdmin && (
          <Button onClick={() => setInviting(true)}>
            <UserPlus className="size-5" aria-hidden="true" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* Input's own wrapper is w-full, so a width on the input itself does
            nothing — the field would take the whole row and push the Role
            filter onto a second line. The box here is what holds it to 280px
            and keeps the pair on one row, as the design draws them. */}
        <div className="w-full sm:w-70">
          <Input
            type="search"
            aria-label="Search people"
            placeholder="Search people…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            leading={<Search className="size-4" aria-hidden="true" />}
          />
        </div>

        <Select
          label="Role"
          emptyLabel="All"
          value={roleFilter}
          onChange={setRoleFilter}
          options={USER_ROLES.map((value) => ({
            value,
            label: ROLE_LABELS[value],
          }))}
        />
      </div>

      <Card padding="none" className="mt-4 overflow-hidden">
        {failed ? (
          <ErrorState
            error={members.error ?? stats.error}
            onRetry={() => {
              void members.refetch();
              void stats.refetch();
            }}
            retrying={members.isFetching || stats.isFetching}
          />
        ) : loading ? (
          <TeamSkeleton />
        ) : visible.length === 0 ? (
          // A filtered empty state, not "there is nobody here". Same distinction
          // the task list draws, and for the same reason.
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface text-muted">
              <SearchX className="size-8" aria-hidden="true" />
            </span>
            <h2 className="text-base font-semibold text-ink">
              Nobody matches that
            </h2>
            <p className="mt-1 text-sm text-muted">
              Try a different name, email or role.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-left">
                <thead>
                  {/* Filled header, and widths that stop Email swallowing the
                      row now that Role and Status carry real content. */}
                  <tr className="border-b border-line bg-surface">
                    <Th className="w-[28%]">Member</Th>
                    <Th className="w-[24%]">Email</Th>
                    <Th className="w-[16%]">Role</Th>
                    <Th className="w-[15%]">Assigned tasks</Th>
                    <Th className="w-[13%]">Status</Th>
                    <Th className="w-12">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((person) => {
                    const row = statsFor(stats.data, person._id);

                    return (
                      <tr
                        key={person._id}
                        className="h-row border-b border-line last:border-0 hover:bg-surface"
                      >
                        <Td>
                          {/* Reuses the filtered task list rather than
                              building a per-person screen. */}
                          <Link
                            to={`/tasks?assigneeId=${person._id}`}
                            className="inline-flex items-center gap-2 font-medium text-ink focus:outline-none focus-visible:underline"
                          >
                            <PersonAvatar person={person} size="sm" />
                            {person.name}
                          </Link>
                        </Td>
                        <Td className="text-muted">{person.email}</Td>
                        <Td>
                          <RoleCell
                            person={person}
                            editable={isAdmin}
                            isMe={person._id === user?._id}
                          />
                        </Td>
                        <Td>
                          <Count value={row?.assigned} />
                        </Td>
                        <Td>
                          <StatusPill status={person.status} />
                        </Td>
                        <Td>
                          {isAdmin && person._id !== user?._id && (
                            <MemberMenu onRemove={() => setRemoving(person)} />
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Below 768px the table becomes a stack. Tasks created and Last
                active live here, where there is room for them. */}
            <ul className="divide-y divide-line md:hidden">
              {visible.map((person) => {
                const row = statsFor(stats.data, person._id);

                return (
                  <li key={person._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/tasks?assigneeId=${person._id}`}
                        className="flex min-w-0 items-center gap-3"
                      >
                        <PersonAvatar person={person} size="md" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {person.name}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {person.email}
                          </span>
                        </span>
                      </Link>

                      <StatusPill status={person.status} />
                    </div>

                    <dl className="mt-3 grid grid-cols-4 gap-2 text-xs">
                      <Stat label="Role" value={ROLE_LABELS[person.role]} />
                      <Stat label="Assigned" value={row?.assigned} />
                      <Stat label="Created" value={row?.created} />
                      <Stat
                        label="Last active"
                        value={
                          row
                            ? row.lastActiveAt
                              ? formatRelative(row.lastActiveAt)
                              : "Never"
                            : undefined
                        }
                      />
                    </dl>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* The last row of the card, not a caption floating under it.
            Suppressed when the request failed: a seat count below an error
            message would be a number with nothing behind it. */}
        {!failed && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted">
            {/* Both halves are real numbers, from GET /api/users/workspace. */}
            <p>
              {workspace.data
                ? `${workspace.data.members} ${plural(workspace.data.members, "member")} · ${workspace.data.seatsRemaining} ${plural(workspace.data.seatsRemaining, "seat")} remaining`
                : ""}
            </p>

            {/* Drawn, and going nowhere. There is no billing in this project,
                so a working "Manage seats" would need a payment provider. Same
                treatment as the notification bell and the acceptable-use link.
                The dotted underline is gone for the design's sake, but it is
                still disabled, still shows the not-allowed cursor and still
                explains itself on hover — not a control that pretends. */}
            <button
              type="button"
              disabled
              title="There is no billing in this build — the limit is the SEAT_LIMIT setting"
              className="cursor-not-allowed font-medium text-accent opacity-70"
            >
              Manage seats
            </button>
          </div>
        )}
      </Card>

      <InviteMemberDialog
        open={inviting}
        onOpenChange={setInviting}
        seatsRemaining={workspace.data?.seatsRemaining}
      />

      {removing && (
        <RemoveMemberDialog
          person={removing}
          assigned={statsFor(stats.data, removing._id)?.assigned}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}

/**
 * The Role cell — a dropdown for an admin, plain text for everybody else.
 *
 * An admin does not get one on their OWN row. The server refuses to demote the
 * last admin, and the commonest way to hit that refusal is by accident on your
 * own row; offering a control that will usually be rejected is worse than not
 * offering it.
 */
function RoleCell({
  person,
  editable,
  isMe,
}: {
  person: TeamMember;
  editable: boolean;
  isMe: boolean;
}) {
  const changeRole = useChangeRole();

  return (
    <RoleChip
      role={person.role}
      editable={editable && !isMe}
      onChange={(role) => changeRole.mutate({ userId: person._id, role })}
      pending={changeRole.isPending}
    />
  );
}

/**
 * Active or Invited.
 *
 * No dot, unlike the task status badge: the design draws these two as outlined
 * pills with the label itself carrying the colour. `cn` is tailwind-merge, so
 * the text colour here wins over the tone's own `text-ink` without touching
 * Badge, which task statuses still rely on exactly as it is.
 */
function StatusPill({ status }: { status: TeamMember["status"] | undefined }) {
  if (!status) {
    return (
      <span className="text-muted" title="No status recorded for this person">
        —
      </span>
    );
  }

  return status === "active" ? (
    <Badge tone="success" className="text-success">
      {USER_STATUS_LABELS.active}
    </Badge>
  ) : (
    <Badge tone="warning" className="text-warning">
      {USER_STATUS_LABELS.invited}
    </Badge>
  );
}

function MemberMenu({ onRemove }: { onRemove: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Member actions"
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink focus:ring-2 focus:ring-accent/30 focus:outline-none"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-48 rounded-lg border border-line bg-white p-1 shadow-md"
        >
          <DropdownMenu.Item
            onSelect={onRemove}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive outline-none data-highlighted:bg-status-blocked-bg"
          >
            <UserMinus className="size-4 shrink-0" aria-hidden="true" />
            Remove from workspace
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Removing somebody, and saying plainly what happens to their work.
 *
 * The count is named for the same reason the delete-task dialog names its
 * comment count: "this will unassign 9 tasks" is something you can decide
 * about. "Are you sure?" is a shrug.
 */
function RemoveMemberDialog({
  person,
  assigned,
  onClose,
}: {
  person: TeamMember;
  assigned: number | undefined;
  onClose: () => void;
}) {
  const remove = useRemoveMember();

  return (
    <ConfirmDialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Remove from workspace?"
      confirmLabel="Remove member"
      pending={remove.isPending}
      onConfirm={() => remove.mutate(person._id, { onSuccess: onClose })}
    >
      <span className="text-ink">{person.name}</span> will lose access
      immediately.
      {assigned !== undefined && assigned > 0 && (
        <>
          {" "}
          Their{" "}
          <span className="text-ink">
            {assigned} {plural(assigned, "task")}
          </span>{" "}
          will become unassigned — the work is kept, not deleted.
        </>
      )}{" "}
      This can't be undone.
    </ConfirmDialog>
  );
}

/** "1 member" / "2 members". Grammar, not a number from anywhere. */
function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

// The server returns a row for every user, so this normally always finds one.
// Returns undefined rather than zeros otherwise, and the cells show "—".
// Takes undefined because the remove dialog renders outside the loading guard:
// it can be open while the stats request is still in flight, and "—" is the
// right answer then rather than a crash.
function statsFor(
  rows: UserStats[] | undefined,
  userId: string,
): UserStats | undefined {
  return rows?.find((row) => row.userId === userId);
}

/**
 * "9 tasks", or "—" when there is genuinely no row to read it from.
 *
 * The word is carried here rather than in the column heading because the design
 * puts it in the cell, and because "1 task" has to be able to differ from
 * "2 tasks".
 */
function Count({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return (
      <span className="text-muted" title="No figures for this person yet">
        —
      </span>
    );
  }

  return (
    <>
      {value} {plural(value, "task")}
    </>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value ?? "—"}</dd>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap text-muted ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 text-sm text-ink ${className ?? ""}`}>{children}</td>
  );
}

function TeamSkeleton() {
  return (
    <div aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="h-row flex items-center gap-4 border-b border-line px-4 last:border-0"
        >
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="ml-auto h-3.5 w-20" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-badge w-16 rounded-md" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading team
      </span>
    </div>
  );
}
