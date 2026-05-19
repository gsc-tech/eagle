import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WidgetOverlayButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "default" | "destructive" | "accent";
}

/**
 * Small icon button that floats over a widget tile (minimize, edit, etc.).
 * Positioned by the parent — this component only handles appearance.
 */
export function WidgetOverlayButton({
    children,
    variant = "default",
    className,
    ...props
}: WidgetOverlayButtonProps) {
    return (
        <button
            {...props}
            className={cn(
                "inline-flex items-center justify-center w-[22px] h-[22px] p-0 rounded border-none",
                "bg-transparent cursor-pointer transition-colors duration-150",
                "text-muted-foreground/85 dark:text-muted-foreground/85",
                variant === "default" && "hover:bg-white/15 dark:hover:bg-white/15 hover:text-foreground",
                variant === "accent"  && "hover:bg-primary/20 hover:text-primary",
                variant === "destructive" && "hover:bg-destructive/20 hover:text-destructive",
                className
            )}
        >
            {children}
        </button>
    );
}