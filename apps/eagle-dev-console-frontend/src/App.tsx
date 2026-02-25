import { createBrowserRouter, RouterProvider, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import Home from "./pages/home";
import Backends from "./pages/backends";
import { LoginForm } from "./components/login-form";
import Widgets from "./pages/widgets";
import DashBuilder from "./pages/dash-builder";
import { auth } from "./firebase/config";
import Dashboards from "./pages/dashboards";
import Users from "./pages/users";
import { UnsavedChangesProvider } from "./contexts/UnsavedChangesContext";
import { onAuthStateChanged } from "firebase/auth";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const router = useMemo(
    () =>
      createBrowserRouter(
        createRoutesFromElements(
          <>
            <Route
              path="/login"
              element={<LoginForm onLogin={() => setIsLoggedIn(true)} />}
            />

            <Route
              path="/"
              element={
                isLoggedIn ? (
                  <Home
                    onLogout={() => {
                      auth.signOut();
                      setIsLoggedIn(false);
                    }}
                  />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            >
              <Route index element={<Navigate to="/backends" replace />} />
              <Route path="backends" element={<Backends />} />
              <Route path="widgets" element={<Widgets />} />
              <Route path="dashboards" element={<Dashboards />} />
              <Route path="dashboard-builder" element={<DashBuilder />} />
              <Route path="users" element={<Users />} />
            </Route>
          </>
        )
      ),
    [isLoggedIn]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground animate-pulse">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <UnsavedChangesProvider>
      <RouterProvider router={router} />
    </UnsavedChangesProvider>
  );
}

export default App;
