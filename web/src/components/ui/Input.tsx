import { AlertCircle } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** The message under the field. Its presence is what turns the field red. */
  error?: string;
  /** Sits inside the field on the right — the password show/hide eye. */
  trailing?: ReactNode;
  /**
   * Sits inside the field on the LEFT — the magnifier on a search box.
   *
   * Decorative by contract: it is wrapped in `pointer-events-none` so a click
   * anywhere in the field, icon included, still lands on the input. Pass an
   * icon, not a button.
   */
  leading?: ReactNode;
  /**
   * Sits on the LABEL row, pushed to the right — the design's
   * "Password … Forgot password?" pair. Outside the field rather than inside
   * it, so it is a sibling of the label and not part of the input's own
   * description.
   */
  labelAction?: ReactNode;
}

// forwardRef because React Hook Form needs a handle on the real input element
// to read its value and to move focus to the first field with a problem.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, trailing, leading, labelAction, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {(label || labelAction) && (
        // One row, so the label and whatever sits opposite it share a baseline
        // instead of the action floating on its own line.
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label ? (
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-ink"
            >
              {label}
            </label>
          ) : (
            <span />
          )}
          {labelAction}
        </div>
      )}

      <div className="relative">
        {leading && (
          // pointer-events-none so the icon is not a dead zone: clicking it
          // focuses the field, which is what anyone aiming at a search box
          // expects.
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            {leading}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          // Tells a screen reader this field is wrong, and which message
          // belongs to it. Without these the red border means nothing to
          // someone who cannot see it.
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-10 w-full rounded-lg border bg-white px-3 text-sm text-ink",
            "placeholder:text-muted",
            "focus:outline-none focus:ring-2 focus:ring-accent/30",
            error
              ? "border-destructive focus:border-destructive"
              : "border-line focus:border-accent",
            trailing && "pr-10",
            leading && "pl-9",
            className,
          )}
          {...rest}
        />

        {trailing && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {trailing}
          </div>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          // Read out when it appears, so the message is not silent.
          role="alert"
          className="mt-1.5 flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
});
