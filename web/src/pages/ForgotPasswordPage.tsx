import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import * as authApi from "../api/auth.api";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { AuthCard } from "../features/auth/AuthCard";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "../lib/validation";

export function ForgotPasswordPage() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);

    try {
      await authApi.forgotPassword(values.email);
      setSentTo(values.email);
    } catch (error) {
      // A rate limit or a dead server. NOT "no such account" — the server never
      // says that, and neither can this screen.
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  // The confirmation is deliberately the same whether or not that address has
  // an account. The server answers identically for both, so saying anything
  // more specific here would undo that and turn this form into a way of asking
  // "does this person have an account?".
  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="If that address is registered, a reset link is on its way."
        footer={
          <>
            Remembered it?{" "}
            <Link
              to="/login"
              className="font-medium text-accent hover:underline"
            >
              Back to sign in
            </Link>
          </>
        }
      >
        <div className="text-sm text-muted">
          <p>
            We sent a link to{" "}
            <span className="font-medium text-ink">{sentTo}</span>.
          </p>
          <p className="mt-3">
            The link works for one hour and can only be used once. If nothing
            arrives, check the spam folder, or try again with a different
            address.
          </p>

          <Button
            variant="secondary"
            fullWidth
            className="mt-6"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </Button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Type your email and we'll send you a link to set a new one."
      formError={formError}
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
