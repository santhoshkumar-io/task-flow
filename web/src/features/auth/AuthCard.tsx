import type { ReactNode } from "react";
import { Card } from "../../components/ui/Card";
import { Logo } from "../../components/Logo";

interface AuthCardProps {
  title: string;
  subtitle: string;
  /** A whole-form error from the server, such as "Invalid email or password". */
  formError?: string | null;
  children: ReactNode;
  footer: ReactNode;
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
  children,
  footer,
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
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 fill-current"
              >
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              {formError}
            </div>
          )}

          {children}
        </Card>

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  );
}
