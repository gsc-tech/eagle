import { useState } from "react";
import DashboardPage from "@/pages/home";
import LoginPage from "@/pages/login";
import { QuickViewChartModal } from "@/components/QuickViewChartModal";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";
import { useFirebaseToken } from "@/hooks/useFirebaseToken";

// Apply saved theme before first render to avoid flash-of-wrong-theme.
// Reads the Zustand-persisted state directly since the store hasn't hydrated yet.
try {
    const persisted = JSON.parse(localStorage.getItem("eagle-theme") || "{}");
    const isDark = persisted?.state?.isDark ?? true;
    document.documentElement.classList.add(isDark ? "dark" : "light");
} catch {
    document.documentElement.classList.add("dark");
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem("eagle_auth") === "true"
  );

  const handleLogin = () => {
    localStorage.setItem("eagle_auth", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("eagle_auth");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <>
        <ToastContainer position="top-right" theme="light" />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <ToastContainer position="top-right" />
      <DashboardPage onLogout={handleLogout} />
      <QuickViewChartModal />
    </>
  );
}