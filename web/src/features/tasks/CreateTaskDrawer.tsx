import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, useWatch } from "react-hook-form";
import { createTask } from "../../api/tasks.api";
import { ApiError } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Drawer } from "../../components/ui/Drawer";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { cn } from "../../lib/cn";
import {
  DESCRIPTION_LIMIT,
  createTaskSchema,
  type CreateTaskValues,
} from "../../lib/validation";
import { useUsers } from "../../hooks/useTasks";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
} from "../../types";

const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

const BLANK: CreateTaskValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: "",
};

export function CreateTaskDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const users = useUsers();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: BLANK,
    // Check as they type, but only AFTER the first submit. Turning a field red
    // before anyone has finished typing in it is nagging; staying silent after
    // they have seen the error is unhelpful.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // useWatch, not form.watch. Both give the live value the counter needs, but
  // watch() re-renders the WHOLE form on every keystroke in any field, and it
  // is a subscription React Compiler cannot memoize. useWatch subscribes to
  // this one field only.
  const description = useWatch({ control, name: "description" }) ?? "";

  const mutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      // Marks every cached page of tasks as out of date, whatever filters
      // each was fetched with, so the list refetches and the new task shows
      // up without a manual refresh.
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      reset(BLANK);
      onOpenChange(false);
    },
    onError: (error) => {
      // The server checks the same rules again, and it is the one that
      // decides. If it names fields, each message goes beside its own box
      // rather than becoming an anonymous banner.
      if (error instanceof ApiError && error.fields.length > 0) {
        for (const field of error.fields) {
          if (field.field in BLANK) {
            setError(field.field as keyof CreateTaskValues, {
              message: field.message,
            });
          }
        }
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      title: values.title,
      description: values.description || undefined,
      status: values.status,
      priority: values.priority,
      // The dropdown's empty choice is "", but the API wants null for nobody.
      assigneeId: values.assigneeId || null,
    });
  });

  // A whole-form message only for a failure with no field list — a 500, or the
  // server being down. Otherwise the message is already beside a box.
  const formError =
    mutation.error instanceof ApiError && mutation.error.fields.length === 0
      ? mutation.error.message
      : null;

  // Closing throws the draft away, so the next open starts clean rather than
  // showing yesterday's half-typed title. Every way out goes through here —
  // Cancel, the ×, Escape and clicking the dimmed page — so none of them can
  // be the one that forgets.
  const setOpen = (next: boolean) => {
    if (!next) {
      reset(BLANK);
      mutation.reset();
    }
    onOpenChange(next);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      title="Create Task"
      footer={
        <>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            loading={mutation.isPending}
          >
            Create Task
          </Button>
        </>
      }
    >
      {/* The form is here; its submit button is in the pinned footer outside
          it. `form="create-task-form"` on the button is what still connects
          the two. */}
      <form id="create-task-form" onSubmit={onSubmit} className="space-y-5">
        {formError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive bg-status-blocked-bg px-3 py-2 text-xs text-destructive"
          >
            {formError}
          </p>
        )}

        <Input
          label="Task Title"
          placeholder="What needs doing?"
          error={errors.title?.message}
          // Focus starts here rather than on the close button, so typing can
          // begin the moment the drawer opens.
          autoFocus
          {...register("title")}
        />

        <Textarea
          label="Description"
          placeholder="Add more detail…"
          rows={5}
          error={errors.description?.message}
          hint="Markdown supported"
          counter={
            <span
              className={cn(
                description.length > DESCRIPTION_LIMIT && "text-destructive",
              )}
            >
              {description.length} / {DESCRIPTION_LIMIT}
            </span>
          }
          {...register("description")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" htmlFor="create-status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  id="create-status"
                  value={field.value}
                  onChange={field.onChange}
                  options={STATUS_OPTIONS}
                  className="w-full"
                />
              )}
            />
          </Field>

          <Field label="Priority" htmlFor="create-priority">
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <>
                  {/* Phone: four segmented buttons, as section 5 draws it.
                      A dropdown for four short options costs two taps where
                      this costs one. */}
                  <div
                    role="group"
                    aria-label="Priority"
                    className="grid grid-cols-4 overflow-hidden rounded-lg border border-line md:hidden"
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        aria-pressed={field.value === priority}
                        onClick={() => field.onChange(priority)}
                        className={cn(
                          "h-10 border-r border-line text-xs font-medium last:border-r-0",
                          field.value === priority
                            ? "bg-ink text-white"
                            : "bg-white text-ink",
                        )}
                      >
                        {PRIORITY_LABELS[priority as TaskPriority]}
                      </button>
                    ))}
                  </div>

                  <Select
                    id="create-priority"
                    value={field.value}
                    onChange={field.onChange}
                    options={PRIORITY_OPTIONS}
                    className="hidden w-full md:inline-flex"
                  />
                </>
              )}
            />
          </Field>
        </div>

        <Field label="Assignee" htmlFor="create-assignee">
          <Controller
            control={control}
            name="assigneeId"
            render={({ field }) => (
              <Select
                id="create-assignee"
                value={field.value}
                onChange={field.onChange}
                emptyLabel="Unassigned"
                options={(users.data ?? []).map((user) => ({
                  value: user._id,
                  label: user.name,
                }))}
                className="w-full"
              />
            )}
          />
        </Field>
      </form>
    </Drawer>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
