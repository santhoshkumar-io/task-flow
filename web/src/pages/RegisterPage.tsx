import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { Input } from "../components/ui/Input";
import { AuthCard } from "../features/auth/AuthCard";
import { useAuth } from "../features/auth/auth-context";
import { PasswordInput } from "../features/auth/PasswordInput";
import { registerSchema, type RegisterValues } from "../lib/validation";

export function RegisterPage() {
  const { register: createAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", rememberMe: true },
  });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);

    try {
      await createAccount(values);
      navigate("/tasks", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.fields.length > 0) {
          for (const field of error.fields) {
            setError(field.field as keyof RegisterValues, {
              message: field.message,
            });
          }
        } else if (error.code === "EMAIL_TAKEN") {
          // Put it beside the email box rather than at the top, because that is
          // the field the person has to change.
          setError("email", { message: error.message });
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Start tracking your team's work in a minute."
      formError={formError}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Name"
          autoComplete="name"
          placeholder="Sarah Chen"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <PasswordInput
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />

        <Checkbox label="Keep me signed in" {...register("rememberMe")} />

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
