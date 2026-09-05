import * as RadixToast from "@radix-ui/react-toast";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

// The corner toast from section 7.
//
// Radix handles the parts that are easy to get wrong and invisible when they
// are: it announces the message to a screen reader through a live region, it
// pauses the dismiss timer while the pointer is over it or the window is in
// the background, and swipe-to-dismiss works on a phone.

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <RadixToast.Provider swipeDirection="right" duration={Infinity}>
      {children}
      {/* Bottom-right, as drawn. Above everything, and out of the way of the
          mobile bottom bar so it never covers the tabs. */}
      <RadixToast.Viewport className="fixed right-4 bottom-20 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 outline-none md:bottom-4" />
    </RadixToast.Provider>
  );
}

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tone?: "neutral" | "destructive";
  action?: ReactNode;
}

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  tone = "neutral",
  action,
}: ToastProps) {
  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      // Errors are announced immediately; anything else waits for a gap so it
      // does not interrupt what is being read out.
      type={tone === "destructive" ? "foreground" : "background"}
      className={cn(
        "tf-slide-panel",
        "flex items-start gap-3 rounded-lg border border-line bg-white p-4 shadow-md",
      )}
    >
      {tone === "destructive" && (
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive text-white"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-3.5 fill-current"
            aria-hidden="true"
          >
            <path d="M8 3a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4A.75.75 0 018 3zm0 9a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </span>
      )}

      <div className="min-w-0 flex-1">
        <RadixToast.Title className="text-sm font-medium text-ink">
          {title}
        </RadixToast.Title>
        {description && (
          <RadixToast.Description className="mt-0.5 text-xs text-muted">
            {description}
          </RadixToast.Description>
        )}
        {action && <div className="mt-2">{action}</div>}
      </div>

      <RadixToast.Close
        aria-label="Dismiss"
        className="shrink-0 text-muted hover:text-ink"
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
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
