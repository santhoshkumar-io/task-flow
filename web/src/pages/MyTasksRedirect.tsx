import { Navigate } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../features/auth/auth-context";

// /my-tasks is a real route that sends you to your own filtered task list.
//
// It has to be a component rather than a plain redirect in routes.tsx, because
// the destination contains your user id and that only exists once the auth
// check has answered.
//
// Redirecting rather than building a second list screen means one screen, one
// set of filters, one cache. The assignee chip then shows your name and can be
// cleared, which is honest: you are looking at the task list with a filter on.

export function MyTasksRedirect() {
  const { user, status } = useAuth();

  // ProtectedRoute has usually settled this already, but a direct visit to
  // /my-tasks can arrive here first.
  if (status === "checking") {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" className="text-muted" label="Loading your tasks" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/tasks?assigneeId=${user._id}`} replace />;
}
