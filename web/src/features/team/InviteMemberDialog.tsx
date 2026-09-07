import * as Dialog from "@radix-ui/react-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus, X } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { ApiError } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useInviteMember } from "../../hooks/useTeam";
import { inviteSchema, type InviteValues } from "../../lib/validation";
import { ROLE_LABELS, USER_ROLES } from "../../types";

// The dialog behind the design's "Invite Member" button.
//
// Built on Radix Dialog directly, the same as ConfirmDialog and Drawer — this
// one holds a form, so it needs its own footer and cannot reuse ConfirmDialog's
// single-confirm shape.

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown when the workspace is full, so the form can say so before sending. */
  seatsRemaining: number | undefined;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  seatsRemaining,
}: InviteMemberDialogProps) {
  const invite = useInviteMember();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", email: "", role: "engineer" },
  });

  // useWatch, not watch(): watch returns a new function each render, which the
  // React Compiler cannot memoize — the same lint rule that caught this in V8.
  const role = useWatch({ control, name: "role" });
  const full = seatsRemaining !== undefined && seatsRemaining <= 0;

  function close(next: boolean) {
    if (!next) {
      // Cleared on the way out, so reopening does not show the last person's
      // details half-filled in.
      reset();
      invite.reset();
    }
    onOpenChange(next);
  }

  async function onSubmit(values: InviteValues) {
    await invite.mutateAsync(values);
    close(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-white p-6 shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-heading text-lg font-semibold text-ink">
                Invite a member
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted">
                They will get an email with a link to choose a password.
              </Dialog.Description>
            </div>

            <Dialog.Close
              aria-label="Close"
              className="rounded-lg p-1 text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {/* Said before they type, not after they press send. */}
          {full && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-warning/30 bg-status-review-bg px-3 py-2 text-xs text-warning"
            >
              This workspace has no seats left. Remove somebody first, or raise
              SEAT_LIMIT.
            </p>
          )}

          {invite.error instanceof ApiError && invite.error.fields.length === 0 && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive bg-status-blocked-bg px-3 py-2 text-xs text-destructive"
            >
              {invite.error.message}
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
            <Input
              label="Name"
              placeholder="Sarah Chen"
              autoFocus
              error={errors.name?.message}
              {...register("name")}
            />

            <Input
              label="Email"
              type="email"
              placeholder="sarah@company.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Role
              </span>
              <Select
                value={role}
                onChange={(next) => setValue("role", next as InviteValues["role"])}
                options={USER_ROLES.map((value) => ({
                  value,
                  label: ROLE_LABELS[value],
                }))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting} disabled={full}>
                <UserPlus className="size-5" aria-hidden="true" />
                Send invitation
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
