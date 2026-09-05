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

  // "unreachable" falls through to the screen deliberately.
  //
  // Nothing answered, so we do not know whether this person is signed in — and
  // sending them to login on a guess is the harmful direction: it loses their
  // place over a server restart when their cookie was still valid. Staying put
  // lets the screen show its own error state, which is what the design draws.
  //
  // It is also self-correcting. If they really are signed out, the screen's own
  // requests come back 401 and the global handler drops them to login for a
  // real reason rather than a guessed one.
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

  // "unreachable" shows the login form. Not because we think they are signed
  // out, but because it is the one screen that is useful when the server is
  // down: they can try, and the attempt fails with a message that says the
  // server could not be reached.
  return <Outlet />;
}
