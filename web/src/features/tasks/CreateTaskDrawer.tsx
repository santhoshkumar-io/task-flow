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
import { Avatar } from "../../components/ui/Avatar";
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
  dueDate: "",
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
      // Same shape for the date: an empty box means no due date, not "".
      dueDate: values.dueDate || null,
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
      description="Add a task and assign it to a teammate."
      hideCloseBelowMd
      header={
        <div className="flex w-full min-w-0 items-center justify-between gap-3 md:block">
          {/* Phone: Cancel · Create Task · Create, as the frame draws it.
              Both Create buttons submit the same form through the form=
              attribute, so neither of them is decoration. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-muted hover:text-ink md:hidden"
          >
            Cancel
          </button>

          <span className="font-heading text-base font-semibold text-ink md:hidden">
            Create Task
          </span>

          <button
            type="submit"
            form="create-task-form"
            disabled={mutation.isPending}
            className="text-sm font-medium text-accent disabled:opacity-50 md:hidden"
          >
            Create
          </button>

          {/* Desktop: the title and its subtitle, exactly as before. */}
          <span className="hidden md:block">
            <span className="block font-heading text-xl font-semibold text-ink">
              Create Task
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Add a task and assign it to a teammate.
            </span>
          </span>
        </div>
      }
      footer={
        <>
          {/* Cancel already sits in the phone header, so this one would be
              the second Cancel on the same screen. */}
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            className="hidden md:inline-flex"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-task-form"
            loading={mutation.isPending}
            className="w-full md:w-auto"
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
          placeholder="e.g. Implement user authentication"
          error={errors.title?.message}
          // Focus starts here rather than on the close button, so typing can
          // begin the moment the drawer opens.
          autoFocus
          {...register("title")}
        />

        <Textarea
          label="Description"
          placeholder="Add context, acceptance criteria or links…"
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

        {/* Side by side only once there is room. At 390px two columns leave
            the four priority buttons about 38px each, which is not enough
            for the word "Medium". */}
        <div className="grid gap-4 md:grid-cols-2">
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

          {/* The label points at the segmented group on a phone and at the
              dropdown on desktop, because only one of the two is on screen
              at a time. Pointing at whichever is hidden attaches the label
              to nothing the reader can see. */}
          <Field
            label="Priority"
            htmlFor="create-priority"
            mobileHtmlFor="create-priority-group"
          >
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <>
                  {/* Phone: four segmented buttons, as section 5 draws it.
                      A dropdown for four short options costs two taps where
                      this costs one. */}
                  <div
                    id="create-priority-group"
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
                  // The frame draws the initials badge beside the name
                  // here, as every other screen does where a person is
                  // named.
                  label: (
                    <>
                      <Avatar name={user.name} size="sm" />
                      {user.name}
                    </>
                  ),
                  text: user.name,
                }))}
                className="w-full"
              />
            )}
          />
        </Field>

        {/* New in this pass. The frame draws it, the server has always
            accepted and checked it, and until now the only way to set a
            due date was to create the task and then edit it. */}
        <Input
          type="date"
          label="Due Date"
          error={errors.dueDate?.message}
          {...register("dueDate")}
        />
      </form>
    </Drawer>
  );
}

function Field({
  label,
  htmlFor,
  mobileHtmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  /** When the phone shows a different control, the id of that one. */
  mobileHtmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {mobileHtmlFor ? (
        <>
          <label
            htmlFor={mobileHtmlFor}
            className="mb-1.5 block text-sm font-medium text-ink md:hidden"
          >
            {label}
          </label>
          <label
            htmlFor={htmlFor}
            className="mb-1.5 hidden text-sm font-medium text-ink md:block"
          >
            {label}
          </label>
        </>
      ) : (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-ink"
        >
          {label}
        </label>
      )}
      {children}
    </div>
  );
}
