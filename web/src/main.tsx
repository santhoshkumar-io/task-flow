import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthProvider";
import { router } from "./routes";
import "./index.css";

// TanStack Query is set up now so V7 inherits it rather than retrofitting it.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Do not refetch every time the window regains focus. On a task list that
      // is noise, not freshness.
      refetchOnWindowFocus: false,
      // A 401 or a 400 will not fix itself by asking again.
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider must sit above the router: the router's guards ask it
          whether we are checking, signed in or signed out. */}
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
