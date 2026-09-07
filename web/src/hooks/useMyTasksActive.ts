import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/auth-context";

/**
 * Whether the task list currently on screen is the signed-in person's own.
 *
 * /my-tasks redirects to /tasks?assigneeId=<me>, so by the time anything is
 * drawn the URL says /tasks. Left alone, React Router lights up "Tasks" while
 * you are looking at your own filtered list, and "My Tasks" stays grey — which
 * reads as a broken menu.
 *
 * It lives here rather than inside the sidebar because TWO navigations need it:
 * the sidebar on a desktop and the tab bar on a phone. The tab bar had the bug
 * the sidebar had already fixed, which is what a second copy of a rule always
 * ends up meaning.
 */
export function useMyTasksActive(): boolean {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  return (
    location.pathname === "/tasks" &&
    Boolean(user) &&
    searchParams.get("assigneeId") === user?._id
  );
}
