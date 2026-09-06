import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "../../components/ui/Card";
import { Logo } from "../../components/Logo";

interface AuthCardProps {
  title: string;
  subtitle: string;
  /** A whole-form error from the server, such as "Invalid email or password". */
  formError?: string | null;
  /** Good news, such as "your password has been changed". Green, not red. */
  notice?: string | null;
  children: ReactNode;
  /** The "Don't have an account?" line. Sits INSIDE the card, under the form. */
  footer: ReactNode;
  /** The small grey line below the footer. Login only. */
  legal?: ReactNode;
}

// The centred card from the design's login frame.
//
// Register uses the SAME card. The design has no register frame — only a
// "Create an account" link — so matching login exactly is a judgement call
// rather than something read off the design. Written up in docs/notes/v6.md.
export function AuthCard({
  title,
  subtitle,
  formError,
  notice,
  children,
  footer,
  legal,
}: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        {/* Logo, then the heading and subtitle, all centred ABOVE the card.
            The card holds only the form itself. */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />

          <h1 className="mt-6 font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>

        <Card padding="lg">
          {formError && (
            // role="alert" so it is read out the moment it appears, rather than
            // being a red box a screen reader user never learns about.
            <div
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg border border-destructive/20 bg-status-blocked-bg px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {formError}
            </div>
          )}

          {notice && !formError && (
            // role="status" rather than "alert": this is worth announcing but
            // is not urgent, so it does not interrupt whatever is being read.
            <div
              role="status"
              className="mb-5 flex items-start gap-2 rounded-lg border border-success/20 bg-status-done-bg px-3 py-2.5 text-sm text-success"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {notice}
            </div>
          )}

          {children}

          {/* Inside the card, under the button, as the design draws it. It was
              below the card, which pushed it away from the form it belongs to
              and left the card ending on a black button. */}
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        </Card>

        {legal && (
          <p className="mt-6 text-center text-xs text-muted">{legal}</p>
        )}
      </div>
    </main>
  );
}
