import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Spinner } from "./Spinner";

// Five variants, from section 8.5 of the design reference.
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "destructive-outline"
  | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90",
  secondary: "bg-white text-ink border border-line hover:bg-surface",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  "destructive-outline":
    "bg-white text-destructive border border-destructive hover:bg-destructive/5",
  ghost: "bg-transparent text-ink hover:bg-surface",
};

const SIZES = {
  sm: "h-8 px-3 text-xs",
  // 40px, the same height as an input, so a button beside a field lines up.
  md: "h-10 px-4 text-sm",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  // A button that is busy must not be clickable twice.
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      // Tells a screen reader the button is working, without moving focus.
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" label="" />}
      {children}
    </button>
  );
}
