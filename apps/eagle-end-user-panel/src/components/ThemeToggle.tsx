import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        return (localStorage.getItem("theme") as "light" | "dark") || "dark";
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem("theme", theme);
        window.dispatchEvent(new Event("theme-change"));
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="w-8 h-8 rounded-full hover:bg-accent transition-colors"
            aria-label="Toggle theme"
        >
            {theme === "light" ? (
                <Moon className="h-4 w-4 transition-all text-muted-foreground" />
            ) : (
                <Sun className="h-4 w-4 transition-all text-primary" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
