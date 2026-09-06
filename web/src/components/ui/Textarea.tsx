import { AlertCircle } from "lucide-react";
import {
  forwardRef,
  useId,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Sits under the field on the left — "Markdown supported". */
  hint?: ReactNode;
  /** Sits under the field on the right — the live "0 / 2000" counter. */
  counter?: ReactNode;
}

// Same shape and same error treatment as Input, so a form built from both
// looks like one thing. The hint-and-counter row under the field is what
// section 5 draws.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, error, hint, counter, className, id, rows = 4, ...rest },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const errorId = `${textareaId}-error`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "w-full rounded-lg border bg-white px-3 py-2 text-sm text-ink",
            "placeholder:text-muted",
            "focus:ring-2 focus:ring-accent/30 focus:outline-none",
            error
              ? "border-destructive focus:border-destructive"
              : "border-line focus:border-accent",
            className,
          )}
          {...rest}
        />

        {(hint || counter) && (
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted">
            <span>{hint}</span>
            <span>{counter}</span>
          </div>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 flex items-center gap-1 text-xs text-destructive"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  },
);
