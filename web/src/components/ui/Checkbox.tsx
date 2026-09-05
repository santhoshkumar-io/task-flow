import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, className, id, ...rest }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          // A real checkbox, not a styled div. It is keyboard operable, it
          // works with a screen reader, and the browser handles the space key
          // for free.
          className={cn(
            "size-4 shrink-0 cursor-pointer rounded border-line accent-ink",
            className,
          )}
          {...rest}
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm text-ink select-none"
        >
          {label}
        </label>
      </div>
    );
  },
);
