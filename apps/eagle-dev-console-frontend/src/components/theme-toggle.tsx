import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        // Check if user has a saved preference
        const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
        setTheme(initialTheme);
        applyTheme(initialTheme);
    }, []);

    const applyTheme = (newTheme: "light" | "dark") => {
        const root = document.documentElement;
        if (newTheme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === "light" ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
        localStorage.setItem("theme", newTheme);

        // Dispatch custom event to notify other components of theme change
        window.dispatchEvent(new Event("theme-change"));
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
            {theme === "light" ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
