import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/Logo";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-canvas px-4 text-center">
      <Logo />
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-muted">
          That address does not match anything in TaskFlow.
        </p>
      </div>
      <Link to="/tasks">
        <Button>Go to tasks</Button>
      </Link>
    </main>
  );
}
