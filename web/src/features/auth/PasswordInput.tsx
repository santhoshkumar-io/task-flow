import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Input } from "../../components/ui/Input";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Passed straight through — the login screen's "Forgot password?". */
  labelAction?: ReactNode;
}

// The show/hide eye from the design's login card.
//
// It lives here rather than in components/ui/ because it is a password field
// specifically, not a general building block — and it is only ever used by the
// two auth screens.
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label = "Password", error, labelAction, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        label={label}
        error={error}
        labelAction={labelAction}
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
    <Eye className="size-5" aria-hidden="true" />
  );
}

function EyeOffIcon() {
  return (
    <EyeOff className="size-5" aria-hidden="true" />
  );
}
