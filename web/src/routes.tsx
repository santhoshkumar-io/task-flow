import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./features/auth/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { RegisterPage } from "./pages/RegisterPage";

// The URL map.
//
// Note the shape: AppLayout is a LAYOUT ROUTE with children rather than a
// component each page imports. That is what keeps the sidebar mounted when the
// URL changes, so it never flashes or re-renders between screens.
export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <Navigate to="/tasks" replace /> },
          {
            path: "/tasks",
            element: <PlaceholderPage title="Tasks" arrivesIn="V7" />,
          },
          {
            path: "/tasks/:id",
            element: <PlaceholderPage title="Task detail" arrivesIn="V8" />,
          },
          {
            path: "/my-tasks",
            element: <PlaceholderPage title="My Tasks" arrivesIn="V7" />,
          },
          {
            path: "/dashboard",
            element: <PlaceholderPage title="Dashboard" arrivesIn="V9" />,
          },
          {
            path: "/team",
            element: <PlaceholderPage title="Team" arrivesIn="V9" />,
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
