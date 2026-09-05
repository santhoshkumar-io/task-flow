import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute, PublicOnlyRoute } from "./features/auth/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MyTasksRedirect } from "./pages/MyTasksRedirect";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TeamPage } from "./pages/TeamPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TaskListPage } from "./pages/TaskListPage";

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
          { path: "/tasks", element: <TaskListPage /> },
          { path: "/tasks/:id", element: <TaskDetailPage /> },
          { path: "/my-tasks", element: <MyTasksRedirect /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/team", element: <TeamPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
