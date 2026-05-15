import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/themeStore";

export function ThemeToggle() {
    const isDark = useThemeStore((s) => s.isDark);
    const toggle = useThemeStore((s) => s.toggle);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            id="theme-toggle-btn"
            className="w-8 h-8 rounded-full hover:bg-accent transition-colors"
            aria-label="Toggle theme"
        >
            {isDark ? (
                <Sun className="h-4 w-4 transition-all text-primary" />
            ) : (
                <Moon className="h-4 w-4 transition-all text-muted-foreground" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}
