import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Button } from "./Button";

// A small centred dialog over a dimmed page — the delete-confirm frame from
// section 7.
//
// Radix Dialog for the same reasons as the drawer: focus moves in and is
// trapped, Escape closes, focus returns to whatever opened it, and the page
// behind is hidden from screen readers.

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** The specific sentence. Generic confirm text is a visible miss. */
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  /** Blocks confirming while the dialog still does not know what it is
      about to destroy. */
  confirmDisabled?: boolean;
  tone?: "destructive" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  onConfirm,
  pending,
  confirmDisabled,
  tone = "destructive",
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="tf-fade fixed inset-0 z-50 bg-ink/40" />

        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-white p-6 shadow-md">
          <div className="flex flex-col items-center text-center">
            {tone === "destructive" && (
              <span
                aria-hidden="true"
                className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-status-blocked-bg text-destructive"
              >
                <BinIcon />
              </span>
            )}

            <Dialog.Title className="font-heading text-lg font-semibold text-ink">
              {title}
            </Dialog.Title>

            <Dialog.Description className="mt-2 text-sm text-muted">
              {children}
            </Dialog.Description>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button
              variant={tone === "destructive" ? "destructive" : "primary"}
              onClick={onConfirm}
              loading={pending}
              disabled={confirmDisabled}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M10 7V5h4v2M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}
