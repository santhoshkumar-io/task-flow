import { createContext, useContext } from "react";

// The Create button exists in two places the design puts OUTSIDE the task
// list: the round + in the mobile bottom bar, and the header button on the
// list itself. Both open the same drawer, so who owns it has to be the frame,
// not the page.
//
// A context rather than passing a callback down through AppLayout → Outlet:
// the drawer is opened from a sibling of <Outlet />, so there is no prop path
// between them that does not go through the router.
//
// In its own file, not next to the provider component, because a file that
// exports both a component and a hook cannot be hot-reloaded on its own. That
// cost us three lint warnings in V6 — see docs/notes/v6.md.

export interface CreateTaskHandle {
  open: () => void;
}

export const CreateTaskContext = createContext<CreateTaskHandle | null>(null);

export function useCreateTask(): CreateTaskHandle {
  const handle = useContext(CreateTaskContext);

  if (!handle) {
    // A clear failure at the first render beats a Create button that silently
    // does nothing because the provider was left out.
    throw new Error("useCreateTask must be used inside AppLayout");
  }

  return handle;
}
