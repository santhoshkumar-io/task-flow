import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** The message under the field. Its presence is what turns the field red. */
  error?: string;
  /** Sits inside the field on the right — the password show/hide eye. */
  trailing?: ReactNode;
}

// forwardRef because React Hook Form needs a handle on the real input element
// to read its value and to move focus to the first field with a problem.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, trailing, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}

      <div className="relative">
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
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="size-3.5 shrink-0 fill-current"
          >
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});
