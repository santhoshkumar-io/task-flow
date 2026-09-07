import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { useRef, type ReactNode } from "react";
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
  /** Always required: Radix needs a name for the panel even when it is not drawn. */
  title: string;
  description?: string;
  children: ReactNode;
  /** Pinned to the bottom, outside the scrolling area. */
  footer?: ReactNode;
  /** The side it slides in from. The navigation sheet comes from the left. */
  side?: "right" | "left";
  /**
   * "panel" fills a phone screen and is 480px above 768px — the create and
   * filter sheets. "menu" is a narrow strip that never fills the screen, so
   * the dimmed page stays visible behind it — the navigation sheet.
   */
  width?: "panel" | "menu";
  /**
   * Replaces the default title row. `title` is still used, as a hidden label.
   * For the navigation sheet, which shows the logo where the title would be.
   */
  header?: ReactNode;
  /** Off when the content brings its own padding, as the navigation sheet does. */
  padded?: boolean;
  /**
   * Hides the × below 768px. For a sheet whose phone header offers its own way
   * out — the create sheet puts "Cancel" where the × would be — so the same
   * corner does not carry two of them.
   */
  hideCloseBelowMd?: boolean;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  width = "panel",
  header,
  padded = true,
  hideCloseBelowMd = false,
}: DrawerProps) {
  // Where focus goes when this closes.
  //
  // Radix returns focus to <Dialog.Trigger>, and none of these drawers has
  // one: every one of them is opened by a button somewhere else on the page —
  // the hamburger in the top bar, the Filters button in the list, the Create
  // Task pill floating over the tab bar. With no trigger to return to, focus
  // lands on <body> and a keyboard user is put back at the top of the
  // document, having lost the place they were working in.
  const restoreTo = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="tf-fade fixed inset-0 z-50 bg-ink/40" />

        <Dialog.Content
          // Fired before the panel takes focus, so this is still whatever the
          // person was on when they opened it.
          onOpenAutoFocus={() => {
            restoreTo.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            const target = restoreTo.current;
            // isConnected: the opener may be gone by now — a filter chip that
            // was removed, a row that has been deleted. Then Radix's own
            // behaviour is the better answer.
            if (target?.isConnected) {
              event.preventDefault();
              target.focus();
            }
          }}
          className={cn(
            "fixed inset-y-0 z-50 flex flex-col bg-white shadow-md",
            side === "right"
              ? "tf-slide-panel right-0"
              : "tf-slide-panel-left left-0",
            // 480px from the token, and full-screen below 768px — section 8.9.
            width === "panel" ? "w-full md:w-drawer" : "w-72",
          )}
        >
          <header
            className={cn(
              "flex items-start justify-between gap-4 border-b border-line",
              header ? "px-4 py-3" : "px-5 py-4",
            )}
          >
            {header ? (
              <>
                {/* Named for a screen reader even though the logo is what is
                    drawn. Radix warns, correctly, about an unnamed dialog. */}
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                {header}
              </>
            ) : (
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
            )}

            <Dialog.Close
              aria-label="Close"
              className={cn(
                "-mr-1 shrink-0 rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink",
                hideCloseBelowMd && "hidden md:block",
              )}
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </header>

          {/* Only this middle part scrolls, so the footer buttons stay put on
              a short phone screen instead of being pushed off the bottom. */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto",
              padded && "px-5 py-5",
            )}
          >
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
