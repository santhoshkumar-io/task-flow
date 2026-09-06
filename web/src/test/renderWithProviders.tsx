import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthProvider";
import { CreateTaskContext } from "../features/tasks/create-task-context";

// Every screen in this app sits inside four things: a router, the query cache,
// the auth state, and the frame that owns the Create drawer. A component
// rendered without them throws — useCreateTask says so on purpose.
//
// One helper rather than the same wrapper copied into each test file: when a
// fifth provider is added, the tests should not all need editing.

interface Options {
  /** Starting URL. The task list reads its filters straight from this. */
  route?: string;
  /** Spy for the Create button, so a test can assert it was pressed. */
  onCreate?: () => void;
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", onCreate = () => {} }: Options = {},
) {
  // A fresh cache per test. A shared one would let an earlier test's result
  // satisfy a later test's query, so the later one would pass without its own
  // request ever happening.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Off, because a test asserting an error state should not wait through
        // three silent retries first — and would time out instead of failing
        // with a useful message.
        retry: false,
        gcTime: 0,
      },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CreateTaskContext.Provider value={{ open: onCreate }}>
              {children}
            </CreateTaskContext.Provider>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}
