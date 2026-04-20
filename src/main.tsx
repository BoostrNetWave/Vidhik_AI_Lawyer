// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmationProvider } from "./context/ConfirmationContext";

// Pages
import DashboardPage from "./Pages/DashboardPage";
import ProfilePage from "./Pages/ProfilePage";
import BookingManagementPage from "./Pages/BookingManagementPage";
import PaymentPage from "./Pages/PaymentPage";
import BlogPostsPage from "./Pages/BlogPostsPage";
import SupportPage from "./Pages/SupportPage";
import CreateBlogPage from "./Pages/CreateBlogPage";
import EditBlogPage from "./Pages/EditBlogPage";
import ViewBlogPage from "./Pages/ViewBlogPage";
import SettingsPage from "./Pages/SettingsPage";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./Components/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "bookings", element: <BookingManagementPage /> },
      { path: "payments", element: <PaymentPage /> },
      { path: "blog-posts", element: <BlogPostsPage /> },
      { path: "blogs/create", element: <CreateBlogPage /> },
      { path: "blogs/view/:id", element: <ViewBlogPage /> },
      { path: "blogs/edit/:id", element: <EditBlogPage /> },
      { path: "support", element: <SupportPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
], {
  basename: "/lawyer"
});

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <ToastProvider>
          <ConfirmationProvider>
            <RouterProvider router={router} />
          </ConfirmationProvider>
        </ToastProvider>
      </AuthProvider>
    </React.StrictMode>
  );
}
