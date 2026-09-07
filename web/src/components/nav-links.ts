import { LayoutGrid, ListChecks, UserCheck, Users } from "lucide-react";

// The workspace menu, written down once.
//
// Two things read this: the sidebar (all four) and the phone tab bar (the
// first three — Team lives only in the sheet). V9 already lost time to those
// two menus disagreeing about which item was lit, and the fix then was one
// shared rule; this is the same idea applied to the list itself.
//
// It sits in its own file rather than being exported from Sidebar.tsx because
// a file that exports both a component and a constant loses fast refresh.
export const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/my-tasks", label: "My Tasks", icon: UserCheck },
  { to: "/team", label: "Team", icon: Users },
] as const;
