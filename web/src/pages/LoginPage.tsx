import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { Input } from "../components/ui/Input";
import { AuthCard } from "../features/auth/AuthCard";
import { useAuth } from "../features/auth/auth-context";
import { PasswordInput } from "../features/auth/PasswordInput";
import { loginSchema, type LoginValues } from "../lib/validation";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  // Where they were trying to go before being sent here, so they land back
  // there instead of always on /tasks.
  const state = location.state as { from?: string; notice?: string } | null;
  const from = state?.from ?? "/tasks";

  // Set by the reset screen after a password change, so the person understands
  // why they are being asked to sign in rather than being let straight through.
  const notice = state?.notice ?? null;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    // The same Zod rules the server uses. This runs BEFORE any request, so a
    // malformed email never reaches the network.
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  async function onSubmit(values: LoginValues) {
    setFormError(null);

    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        // If the server named specific fields, show each message beside its own
        // box. Otherwise it is a whole-form problem such as a wrong password.
        if (error.fields.length > 0) {
          for (const field of error.fields) {
            setError(field.field as keyof LoginValues, {
              message: field.message,
            });
          }
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      // isSubmitting goes back to false on its own, so the button becomes
      // usable again without anything extra here.
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue to your workspace."
      formError={formError}
      notice={notice}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-accent hover:underline"
          >
            Create an account
          </Link>
        </>
      }
      legal={
        <>
          {/* NOT a link, and not a disabled button dressed as one either.
              There is no policy document in this project, so there is nothing
              to link to — and AGENTS.md's rule is that a control which silently
              does nothing is the worst option of the three. Plain words in a
              plain sentence are not a control at all, so the rule does not
              bite: nobody expects body text to be clickable.

              It reads exactly like the rest of the line, which is also how the
              design draws it. The title is the only trace, for anyone who
              wonders why it is not a link. */}
          By signing in you agree to the{" "}
          <span title="There is no policy document in this build — see the README">
            acceptable use policy
          </span>
          .
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordInput
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          labelAction={
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-accent hover:underline"
            >
              Forgot password?
            </Link>
          }
          {...register("password")}
        />

        <Checkbox label="Keep me signed in" {...register("rememberMe")} />

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>
    </AuthCard>
  );
}
