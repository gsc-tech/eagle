import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Link, Settings, Trash2, RefreshCw } from "lucide-react";

interface BackendCardProps {
  name: string;
  status: "connected" | "disconnected";
  url: string;
  onSettings?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
}


export default function BackendCard({
  name,
  status,
  url,
  onSettings,
  onDelete,
  onRefresh,
}: BackendCardProps) {
  return (
    <Card className="group w-full hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
      <CardHeader className="flex flex-row justify-between items-center pb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl shadow-lg transition-all",
            status === "connected"
              ? "bg-gradient-to-br from-primary to-primary/80 shadow-primary/20 group-hover:shadow-primary/30"
              : "bg-gradient-to-br from-destructive/80 to-destructive/60 shadow-destructive/20"
          )}>
            <Link className="w-5 h-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">{name}</CardTitle>
            <Badge
              className={cn(
                "mt-1.5 rounded-full px-3 py-0.5 text-xs font-medium shadow-sm",
                status === "connected"
                  ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                  : "bg-gradient-to-r from-destructive/80 to-destructive/70"
              )}
            >
              {status === "connected" ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              title="Refresh Status"
              className="h-9 w-9 p-0 rounded-lg hover:bg-accent/80 border-border/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onSettings}
            className="h-9 w-9 p-0 rounded-lg hover:bg-accent/80 border-border/50 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-9 w-9 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 border-border/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <div className="flex items-center gap-2 text-sm px-3 py-2 bg-muted/50 rounded-lg">
          <Link className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors truncate font-medium"
          >
            {url}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
