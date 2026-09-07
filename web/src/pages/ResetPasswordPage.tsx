import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as authApi from "../api/auth.api";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { AuthCard } from "../features/auth/AuthCard";
import { PasswordInput } from "../features/auth/PasswordInput";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "../lib/validation";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  // The token rides in the URL because this page is reached by clicking a link
  // in an email — there is nowhere else it could come from.
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);

    try {
      await authApi.resetPassword(token, values.password);

      // Straight to the login screen, with a note explaining why they are being
      // asked to type it. The server deliberately does not sign you in: whoever
      // opened the link may not be the account's owner, and typing the new
      // password once is what proves they have it.
      navigate("/login", {
        replace: true,
        state: { notice: "Your password has been changed. Please sign in." },
      });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  // No token at all — somebody typed the address by hand, or a mail client
  // mangled the link. Saying so beats a form that can only ever fail.
  if (!token) {
    return (
      <AuthCard
        title="This link is not complete"
        subtitle="The address is missing its reset code."
        footer={
          <Link to="/login" className="font-medium text-accent hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="text-sm text-muted">
          <p>
            Open the link straight from the email rather than typing it, or ask
            for a new one.
          </p>

          <Link to="/forgot-password" className="mt-6 block">
            <Button fullWidth>Send a new link</Button>
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Pick something you have not used here before."
      formError={formError}
      footer={
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          autoFocus
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />

        <PasswordInput
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Type it again"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? "Saving…" : "Change password"}
        </Button>
      </form>
    </AuthCard>
  );
}
