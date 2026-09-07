import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ApiError } from "../../api/client";
import type { UpdateTaskPayload } from "../../api/tasks.api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { cn } from "../../lib/cn";
import {
  DESCRIPTION_LIMIT,
  PAST_DUE_DATE_MESSAGE,
  editTaskSchema,
  isPastDueDate,
  type EditTaskValues,
} from "../../lib/validation";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type PersonRef,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "../../types";
import { DangerZone } from "./DangerZone";
import { UnsavedChangesCard, type FieldChange } from "./UnsavedChangesCard";

// In edit mode the WHOLE screen is the form — the left column and the right
// rail both. That is why this component renders both columns rather than
// handing its state up to the page: the Save button lives in the rail, and
// having it inside the same <form> is what lets it submit without wiring, and
// keeps the live diff on the same paint as the fields it describes.

const STATUS_OPTIONS = TASK_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));

const PRIORITY_OPTIONS = TASK_PRIORITIES.map((priority) => ({
  value: priority,
  label: PRIORITY_LABELS[priority],
}));

interface TaskEditFormProps {
  task: Task;
  people: PersonRef[];
  saving: boolean;
  error: unknown;
  canDelete: boolean;
  onSave: (payload: UpdateTaskPayload) => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function TaskEditForm({
  task,
  people,
  saving,
  error,
  canDelete,
  onSave,
  onCancel,
  onDelete,
}: TaskEditFormProps) {
  const initial = toFormValues(task);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, dirtyFields, isValid },
  } = useForm<EditTaskValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: initial,
    // Live, because the Unsaved changes card and the Save button both react to
    // every keystroke.
    mode: "onChange",
  });

  const values = useWatch({ control }) as EditTaskValues;

  // The past-date rule is checked only when the date was actually CHANGED.
  //
  // The server deliberately left this rule out of updateTaskSchema so an
  // already-overdue task can still be moved to Done. Applying it to the value
  // rather than to the edit would make every overdue task permanently
  // uneditable — the form would be invalid the moment it loaded.
  const dueDateError =
    dirtyFields.dueDate && isPastDueDate(values.dueDate)
      ? PAST_DUE_DATE_MESSAGE
      : undefined;

  const changes = describeChanges(initial, values, people);
  const blocked = !isValid || Boolean(dueDateError);

  const submit = handleSubmit((next) => {
    if (dueDateError) return;
    onSave(changedFieldsOnly(initial, next));
  });

  return (
    <form onSubmit={submit}>
      {/* Cancel and Save sit at the top right, where the design puts them.
          They live inside the <form> rather than in the page above it so the
          submit button can read isValid and the change list directly — lifting
          that state into the page would mean two copies of the same truth. */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">{task.key}</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
            Edit task
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={blocked || changes.length === 0}
            loading={saving}
          >
            Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-5">
        {formError(error) && (
          <p
            role="alert"
            className="rounded-lg border border-destructive bg-status-blocked-bg px-3 py-2 text-xs text-destructive"
          >
            {formError(error)}
          </p>
        )}

        <Input
          label="Task Title"
          error={errors.title?.message}
          {...register("title")}
        />

        <Textarea
          label="Description"
          rows={8}
          error={errors.description?.message}
          hint="Markdown supported"
          counter={
            <span
              className={cn(
                (values.description?.length ?? 0) > DESCRIPTION_LIMIT &&
                  "text-destructive",
              )}
            >
              {values.description?.length ?? 0} / {DESCRIPTION_LIMIT}
            </span>
          }
          {...register("description")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="edit-status">
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  id="edit-status"
                  value={field.value}
                  onChange={field.onChange}
                  options={STATUS_OPTIONS}
                  className="w-full"
                />
              )}
            />
          </Field>

          <Field label="Priority" htmlFor="edit-priority">
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select
                  id="edit-priority"
                  value={field.value}
                  onChange={field.onChange}
                  options={PRIORITY_OPTIONS}
                  className="w-full"
                />
              )}
            />
          </Field>

          <Field label="Assignee" htmlFor="edit-assignee">
            <Controller
              control={control}
              name="assigneeId"
              render={({ field }) => (
                <Select
                  id="edit-assignee"
                  value={field.value}
                  onChange={field.onChange}
                  emptyLabel="Unassigned"
                  options={people.map((person) => ({
                    value: person._id,
                    label: person.name,
                  }))}
                  className="w-full"
                />
              )}
            />
          </Field>

          <Input
            type="date"
            label="Due date"
            error={dueDateError}
            {...register("dueDate")}
          />
        </div>
      </div>

      <div className="w-full shrink-0 space-y-6 lg:w-[300px]">
        <UnsavedChangesCard
          changes={changes}
          blocked={blocked}
          saving={saving}
          onCancel={onCancel}
        />

        {canDelete && <DangerZone onDelete={onDelete} />}
      </div>
      </div>
    </form>
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

/** The task as the form holds it. An <input type="date"> wants "2026-09-29". */
function toFormValues(task: Task): EditTaskValues {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId?._id ?? "",
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
  };
}

/**
 * Only the fields that actually changed.
 *
 * PATCH means "change these", not "replace the record". Sending every field
 * would overwrite work somebody else saved a second earlier in a field this
 * person never touched — see docs/decisions/0013-last-write-wins.md.
 */
function changedFieldsOnly(
  initial: EditTaskValues,
  next: EditTaskValues,
): UpdateTaskPayload {
  const payload: UpdateTaskPayload = {};

  if (next.title !== initial.title) payload.title = next.title;
  if (next.description !== initial.description) {
    payload.description = next.description;
  }
  if (next.status !== initial.status) payload.status = next.status;
  if (next.priority !== initial.priority) payload.priority = next.priority;

  // "" from the dropdown means nobody, which the API spells as null.
  if (next.assigneeId !== initial.assigneeId) {
    payload.assigneeId = next.assigneeId || null;
  }
  if (next.dueDate !== initial.dueDate) {
    payload.dueDate = next.dueDate || null;
  }

  return payload;
}

/** The live "Priority · High → Urgent" list. */
function describeChanges(
  initial: EditTaskValues,
  next: EditTaskValues,
  people: PersonRef[],
): FieldChange[] {
  const nameOf = (id: string) =>
    id
      ? (people.find((person) => person._id === id)?.name ?? "someone")
      : "Unassigned";

  const rows: FieldChange[] = [];

  if (next.title !== initial.title) {
    rows.push({ label: "Title", from: initial.title, to: next.title });
  }
  if (next.description !== initial.description) {
    // The text itself would swamp a 300px card, so this only says it changed.
    rows.push({ label: "Description", from: "before", to: "edited" });
  }
  if (next.status !== initial.status) {
    rows.push({
      label: "Status",
      from: STATUS_LABELS[initial.status as TaskStatus],
      to: STATUS_LABELS[next.status as TaskStatus],
    });
  }
  if (next.priority !== initial.priority) {
    rows.push({
      label: "Priority",
      from: PRIORITY_LABELS[initial.priority as TaskPriority],
      to: PRIORITY_LABELS[next.priority as TaskPriority],
    });
  }
  if (next.assigneeId !== initial.assigneeId) {
    rows.push({
      label: "Assignee",
      from: nameOf(initial.assigneeId),
      to: nameOf(next.assigneeId),
    });
  }
  if (next.dueDate !== initial.dueDate) {
    rows.push({
      label: "Due date",
      from: initial.dueDate || "None",
      to: next.dueDate || "None",
    });
  }

  return rows;
}

function formError(error: unknown): string | undefined {
  if (error instanceof ApiError && error.fields.length === 0) {
    return error.message;
  }
  return undefined;
}
