import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        return (localStorage.getItem("theme") as "light" | "dark") || "light";
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem("theme", theme);

        // Dispatch custom event for components outside React context or legacy listeners
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
            className="w-10 h-10 rounded-full hover:bg-accent transition-colors"
        >
            {theme === "light" ? (
                <Moon className="h-5 w-5 transition-all text-muted-foreground" />
            ) : (
                <Sun className="h-5 w-5 transition-all text-primary" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
