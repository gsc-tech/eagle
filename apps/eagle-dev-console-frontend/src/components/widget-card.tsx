import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import { Button } from "./ui/button";

interface WidgetCardProps {
    name: string;
    description: string;
    status?: "active" | "inactive"
    onSettings?: () => void;
}

export default function WidgetCard({
    name,
    description,
    status = "active",
    onSettings,
}: WidgetCardProps) {
    return (
        <div className="group border border-border/50 rounded-xl p-5 bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 flex justify-between items-center">
            <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="p-2.5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl group-hover:from-primary/20 group-hover:to-primary/10 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">W</span>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-card-foreground mb-1 truncate">{name}</h2>
                    <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                </div>
            </div>

            <div className="flex gap-3 items-center ml-4">
                <span className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium shadow-sm whitespace-nowrap",
                    status === "active"
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                )}>
                    {status === "active" ? "Active" : "Inactive"}
                </span>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSettings}
                    className="h-9 w-9 rounded-lg hover:bg-accent/80 transition-colors"
                >
                    <Settings className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}