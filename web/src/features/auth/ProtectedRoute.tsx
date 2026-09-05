import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "./auth-context";

// A gate in front of every screen that needs a login.
//
// This is a CONVENIENCE, not security. Anyone can edit the JavaScript in their
// own browser and walk straight past it. The real protection is on the server,
// where every task route requires a valid pass. This just stops a logged-out
// person seeing a broken screen full of failing requests.
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  // The state that stops the login screen flashing on every refresh.
  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" className="text-muted" label="Checking your session" />
      </div>
    );
  }

  if (status === "signedOut") {
    // Remember where they were going, so login can send them back there
    // instead of dumping everyone on the same page.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

// The opposite gate: login and register should not be reachable when already
// signed in.
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner size="lg" className="text-muted" label="Checking your session" />
      </div>
    );
  }

  if (status === "signedIn") {
    return <Navigate to="/tasks" replace />;
  }

  return <Outlet />;
}
