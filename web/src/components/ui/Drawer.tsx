import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

// The 480px right-hand drawer from section 5, and its full-screen phone form.
//
// Radix Dialog underneath, because the things a panel over a dimmed page has
// to get right are all invisible when they work: focus moves into the panel
// and is trapped there, Tab cannot reach the page behind, Escape closes,
// focus returns to whatever opened it, and the rest of the page is hidden
// from screen readers. Hand-rolling that is how a drawer ends up unusable
// with a keyboard.

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** Pinned to the bottom, outside the scrolling area. */
  footer?: ReactNode;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: DrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="tf-fade fixed inset-0 z-50 bg-ink/40" />

        <Dialog.Content
          className={cn(
            "tf-slide-panel fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-md",
            // 480px from the token, and full-screen below 768px — section 8.9.
            "md:w-drawer",
          )}
        >
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <Dialog.Title className="font-heading text-xl font-semibold text-ink">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-xs text-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>

            <Dialog.Close
              aria-label="Close"
              className="-mr-1 shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </Dialog.Close>
          </header>

          {/* Only this middle part scrolls, so the footer buttons stay put on
              a short phone screen instead of being pushed off the bottom. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {children}
          </div>

          {footer && (
            <footer className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
