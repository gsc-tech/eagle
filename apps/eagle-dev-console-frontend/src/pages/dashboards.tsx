import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/apiClient";
import { LayoutDashboard, Pencil, Shield, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type UserGroup = {
    groupId: string;
    name: string;
    description: string;
};

type Dashboard = {
    dashboardID: string;
    name: string;
    draftLayout: any;
    publishedLayout: any;
    accessibleGroups?: string[] | null;
}

export default function Dashboards() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);

    useEffect(() => {
        const fetchDashboards = async () => {
            try {
                const resp = await api.get("/dashboard");
                const data = resp.data;
                setDashboards(data);
            } catch (error) {
                console.error("Error fetching the dashboards", error);
            }
        }

        const fetchUserGroups = async () => {
            try {
                const resp = await api.get("/usergroups");
                const data = resp.data || [];
                // Normalize group data to handle specific backend field names (ug_id, ug_name)
                const normalized = data.map((g: any) => ({
                    groupId: String(g.ug_id || g.groupId || g.id || g.ID || (typeof g === 'string' ? g : "")),
                    name: String(g.ug_name || g.name || g.Name || g.GroupName || (typeof g === 'string' ? g : "Unnamed Group")),
                    description: g.description || g.Description || "",
                }));
                setUserGroups(normalized);
            } catch (error) {
                console.error("Error fetching user groups", error);
            }
        }

        fetchDashboards();
        fetchUserGroups();
    }, []);

    const navigate = useNavigate();

    const handleUnpublish = async (dashboard: Dashboard) => {
        if (!confirm(`Are you sure you want to unpublish "${dashboard.name}"?`)) return;
        console.log("Unpublish dashboard", dashboard.dashboardID);
        try {
            await api.put(`/dashboard/${dashboard.dashboardID}/unpublish`);
            setDashboards(prev => prev.map(d => d.dashboardID === dashboard.dashboardID ? { ...d, publishedLayout: { tabs: null } } : d));
        } catch (error) {
            console.error("Error unpublishing dashboard", error);
            alert("Failed to unpublish dashboard");
        }
    };
    const handleEdit = async (dashboard: Dashboard) => {
        try {
            const widgetsResp = await api.get("/widget");
            const widgetsData = widgetsResp.data;

            // Create a map of widgetId -> widget config for quick lookup
            const widgetMap = new Map<string, any>();
            Object.values(widgetsData).forEach((widgets: any) => {
                if (Array.isArray(widgets)) {
                    widgets.forEach((widget: any) => {
                        widgetMap.set(widget.widgetId, widget);
                    });
                }
            });

            // Transform saveLayoutItem[] to LayoutItem[] by adding widget objects
            const hydrateLayout = (layoutItems: any[]) => {
                if (!Array.isArray(layoutItems)) return [];
                return layoutItems
                    .map((item: any) => {
                        const widget = widgetMap.get(item.widgetId);
                        if (!widget) {
                            console.warn(`Widget not found for widgetId: ${item.widgetId}`);
                            return null;
                        }
                        return {
                            i: item.i,
                            x: item.x,
                            y: item.y,
                            w: item.w,
                            h: item.h,
                            minW: item.minW,
                            maxW: item.maxW,
                            minH: item.minH,
                            maxH: item.maxH,
                            static: item.static,
                            widget: widget,
                        };
                    })
                    .filter((item: any) => item !== null);
            };

            let initialData: any = [];

            if (dashboard.draftLayout) {
                if (dashboard.draftLayout.tabs && Array.isArray(dashboard.draftLayout.tabs)) {
                    // New Multi-Tab Format
                    initialData = {
                        tabs: dashboard.draftLayout.tabs.map((tab: any) => ({
                            ...tab,
                            layout: hydrateLayout(tab.layout)
                        }))
                    };
                } else if (Array.isArray(dashboard.draftLayout)) {
                    // Legacy Single Format
                    initialData = hydrateLayout(dashboard.draftLayout);
                }
            }

            console.log("Hydrated data:", initialData);


            navigate("/dashboard-builder", {
                state: {
                    initialData: initialData,
                    dashboardId: dashboard.dashboardID,
                    dashboardName: dashboard.name,
                    allowedUserGroups: dashboard.accessibleGroups || []
                }
            });

        } catch (error) {
            console.error("Error fetching widgets for dashboard edit:", error);
            // Fallback to original behavior if widget fetch fails
            navigate("/dashboard-builder", {
                state: {
                    initialData: dashboard.draftLayout || [],
                    dashboardId: dashboard.dashboardID,
                    dashboardName: dashboard.name,
                    allowedUserGroups: dashboard.accessibleGroups || []
                }
            });
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
            <div className="max-w-7xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                        Dashboards
                    </h1>
                    <p className="text-muted-foreground text-base">Manage and organize your dashboards</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dashboards.map((dashboard) => (
                        <Card
                            key={dashboard.dashboardID}
                            className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden"
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                                            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <CardTitle className="text-lg font-semibold truncate">{dashboard.name}</CardTitle>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {dashboard.publishedLayout?.tabs && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => { handleUnpublish(dashboard) }}
                                                className="h-9 w-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                                title="Unpublish"
                                            >
                                                <EyeOff className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => { handleEdit(dashboard) }}
                                            className="h-9 w-9 rounded-lg hover:bg-accent/80 transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Badge
                                            variant={dashboard.publishedLayout?.tabs !== null && dashboard.publishedLayout?.tabs !== undefined ? "default" : "secondary"}
                                            className={`${(dashboard.publishedLayout?.tabs !== null && dashboard.publishedLayout?.tabs !== undefined)
                                                ? "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                                                : "bg-secondary/80"
                                                } px-3 py-1 rounded-full font-medium`}
                                        >
                                            {dashboard.publishedLayout?.tabs !== null && dashboard.publishedLayout?.tabs !== undefined ? "Published" : "Draft"}
                                        </Badge>
                                    </div>

                                    {/* User Group Access Display */}
                                    {dashboard.accessibleGroups && dashboard.accessibleGroups.length > 0 && (
                                        <div className="border-t border-border/50 pt-3">
                                            <div className="flex items-start gap-2">
                                                <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Accessible by:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {dashboard.accessibleGroups.map((groupId) => {
                                                            const group = userGroups.find(g => g.groupId === groupId);
                                                            return (
                                                                <Badge
                                                                    key={groupId}
                                                                    variant="outline"
                                                                    className="text-xs px-2 py-0.5"
                                                                >
                                                                    {group?.name || groupId}
                                                                </Badge>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};