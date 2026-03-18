import { useState } from "react";
import DashboardPage from "@/pages/home";
import LoginPage from "@/pages/login";
import "./index.css";

// Apply saved theme on startup
const savedTheme = localStorage.getItem("theme") || "dark";
document.documentElement.classList.add(savedTheme);

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
    return <LoginPage onLogin={handleLogin} />;
  }

  return <DashboardPage onLogout={handleLogout} />;
}
