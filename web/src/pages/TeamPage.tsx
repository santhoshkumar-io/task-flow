import { Link } from "react-router-dom";
import { Avatar } from "../components/ui/Avatar";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { ErrorState } from "../features/tasks/ErrorState";
import { formatFullDate, formatRelative } from "../lib/time";
import { useUsers } from "../hooks/useTasks";
import { useUserStats } from "../hooks/useStats";
import type { UserStats } from "../types";

// Five columns, and every one of them is true.
//
// The design's last two are Role (Admin / Member) and status (Active /
// Invited). Neither exists: the User record holds a name, an email and a
// password hash, and there is no invite system. Rather than draw two columns of
// dashes, they are replaced by two things the data genuinely answers —
// Tasks created and Last active.
// See docs/decisions/0014-team-columns-from-real-data.md.

export function TeamPage() {
  const users = useUsers();
  const stats = useUserStats();

  const failed = users.isError || stats.isError;
  const loading = users.isPending || stats.isPending;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
        Team
      </h1>
      <p className="mt-1 text-sm text-muted">
        {/* Only ever the length of what the API returned. */}
        {users.data
          ? `${users.data.length} ${users.data.length === 1 ? "person" : "people"} in this workspace`
          : " "}
      </p>

      <Card padding="none" className="mt-6 overflow-hidden">
        {failed ? (
          <ErrorState
            error={users.error ?? stats.error}
            onRetry={() => {
              void users.refetch();
              void stats.refetch();
            }}
            retrying={users.isFetching || stats.isFetching}
          />
        ) : loading ? (
          <TeamSkeleton />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    <Th className="w-[34%]">Person</Th>
                    <Th>Email</Th>
                    <Th>Assigned</Th>
                    <Th>Tasks created</Th>
                    <Th>Last active</Th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((person) => {
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
                            <Avatar name={person.name} size="sm" />
                            {person.name}
                          </Link>
                        </Td>
                        <Td className="text-muted">{person.email}</Td>
                        <Td>
                          <Count value={row?.assigned} />
                        </Td>
                        <Td>
                          <Count value={row?.created} />
                        </Td>
                        <Td className="text-muted">
                          <LastActive at={row?.lastActiveAt ?? null} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Below 768px the table becomes a stack, like the task list. */}
            <ul className="divide-y divide-line md:hidden">
              {users.data.map((person) => {
                const row = statsFor(stats.data, person._id);

                return (
                  <li key={person._id} className="p-4">
                    <Link
                      to={`/tasks?assigneeId=${person._id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar name={person.name} size="md" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {person.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {person.email}
                        </span>
                      </span>
                    </Link>

                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
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
      </Card>
    </div>
  );
}

/**
 * Somebody who has never changed anything has no activity row at all, so the
 * server sends null. "Never" is the true answer; a date would be invented and
 * a blank cell would look like a bug.
 */
function LastActive({ at }: { at: string | null }) {
  if (!at) return <span>Never</span>;

  return <span title={formatFullDate(at)}>{formatRelative(at)}</span>;
}

// The server returns a row for every user, so this normally always finds one.
// It can miss only if somebody registers between the two requests.
//
// Returns undefined rather than zeros in that case, and the cells show "—".
// Zeros would be a number nobody counted — and this screen's whole point is
// that every number on it came from a response.
function statsFor(
  rows: UserStats[],
  userId: string,
): UserStats | undefined {
  return rows.find((row) => row.userId === userId);
}

/** A count, or "—" when there is genuinely no row to read it from. */
function Count({ value }: { value: number | undefined }) {
  if (value === undefined) {
    return (
      <span className="text-muted" title="No figures for this person yet">
        —
      </span>
    );
  }

  return <>{value}</>;
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
          <Skeleton className="ml-auto h-3.5 w-10" />
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading team
      </span>
    </div>
  );
}
