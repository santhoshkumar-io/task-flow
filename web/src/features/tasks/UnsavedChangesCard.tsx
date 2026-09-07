import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export interface FieldChange {
  label: string;
  from: string;
  to: string;
}

interface UnsavedChangesCardProps {
  changes: FieldChange[];
  /** True while any field is invalid — Save stays disabled. */
  blocked: boolean;
  saving: boolean;
  onCancel: () => void;
}

// The right rail in edit mode — a live list of what you changed.
//
// It looks expensive and is about fifteen lines: React Hook Form already tracks
// which fields are dirty, so this is a comparison against the values the form
// loaded with, not new bookkeeping.

export function UnsavedChangesCard({
  changes,
  blocked,
  saving,
  onCancel,
}: UnsavedChangesCardProps) {
  return (
    <Card padding="none">
      <h2 className="border-b border-line px-4 py-3 font-heading text-sm font-semibold text-ink">
        Unsaved changes
      </h2>

      {changes.length === 0 ? (
        <p className="px-4 py-3 text-xs text-muted">
          Nothing changed yet.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {changes.map((change) => (
            <li key={change.label} className="px-4 py-2.5 text-xs">
              <span className="font-medium text-ink">{change.label}</span>
              <span className="text-muted"> · </span>
              <span className="text-muted">{change.from}</span>
              <span aria-hidden="true" className="text-muted"> → </span>
              <span className="text-ink">{change.to}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line px-4 py-3">
        {blocked && (
          <p className="mb-2 text-xs text-muted">
            Save is disabled until validation errors are resolved
          </p>
        )}

        <div className="flex items-center gap-2">
          {/* No `form` attribute needed: this card sits INSIDE the edit
              form, which is why TaskEditForm renders both columns. */}
          <Button
            type="submit"
            size="sm"
            // Also disabled with nothing changed: a PATCH with an empty body is
            // a 400 from the server, and pressing Save on an untouched form
            // should do nothing rather than fail.
            disabled={blocked || changes.length === 0}
            loading={saving}
          >
            Save changes
          </Button>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
