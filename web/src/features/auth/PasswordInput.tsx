import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "../../components/ui/Input";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

// The show/hide eye from the design's login card.
//
// It lives here rather than in components/ui/ because it is a password field
// specifically, not a general building block — and it is only ever used by the
// two auth screens.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label = "Password", error, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        label={label}
        error={error}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            // Without this a screen reader announces an unlabelled button.
            aria-label={visible ? "Hide password" : "Show password"}
            // The eye is a convenience, not a form control — keep it out of the
            // tab order so Tab goes from password straight to the next field.
            tabIndex={-1}
            className="text-muted transition-colors hover:text-ink"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        }
        {...rest}
      />
    );
  },
);

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 fill-none stroke-current stroke-[1.5]"
    >
      <path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 fill-none stroke-current stroke-[1.5]"
    >
      <path d="M8.2 4.7A7.6 7.6 0 0110 4.5c5.5 0 8.5 5.5 8.5 5.5a15 15 0 01-2.3 3M5.2 6.2A14.6 14.6 0 001.5 10S4.5 15.5 10 15.5c1.2 0 2.3-.3 3.3-.7" />
      <path d="M2.5 2.5l15 15" />
    </svg>
  );
}
