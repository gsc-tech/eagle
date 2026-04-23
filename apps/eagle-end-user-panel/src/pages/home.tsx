import { useEffect, useState, useMemo, useCallback } from "react";
import eagleLogo from "@/assets/eagle-2.png";
import eagleDarkLogo from "@/assets/eagle-2-dark.png";
import {
    BarChart2,
    TrendingUp,
    BarChart,
    GitCompare,
    ChevronDown,
    ChevronRight,
    Settings,
    LogOut,
    Search,
} from "lucide-react";
import { useDataConnectorSync } from "@gsc-tech/eagle-widget-library";
import type { ConnectorStatus } from "@gsc-tech/eagle-widget-library";
import { useConnectorsStore } from "@/store/connectorsStore";
import { AlertBanner } from "@/components/AlertBanner";
import { ConnectorConfig } from "@/components/ConnectorConfig";
import {
    Sidebar,
    SidebarProvider,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarRail,
    SidebarFooter,
} from "@/components/ui/sidebar";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import axios from "axios";
import DashboardCanvas from "@/components/dashboard-renderer/Canvas";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { getToken } from "@/firebase/authService";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useDashboardStateStore } from "@/store/dashboardStateStore";

export type Tab = {
    id: string;
    title: string;
    layout: LayoutItem[];
};

type Dashboard = {
    dashboardID: string;
    name: string;
    publishedLayout: any;
};

// Map dashboard name to icon
const DASHBOARD_ICONS: Record<string, React.ReactNode> = {
    default: <BarChart2 className="w-4 h-4" />,
};

function getDashboardIcon(name: string) {
    const lower = name.toLowerCase();
    if (lower.includes("earning") || lower.includes("update"))
        return <TrendingUp className="w-4 h-4" />;
    if (lower.includes("chart")) return <BarChart className="w-4 h-4" />;
    if (lower.includes("compar") || lower.includes("view"))
        return <GitCompare className="w-4 h-4" />;
    return <BarChart2 className="w-4 h-4" />;
}

interface DashboardPageProps {
    onLogout: () => void;
}

export default function DashboardPage({ onLogout }: DashboardPageProps) {
    const [open, setOpen] = useState(true);
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selected, setSelected] = useState<Dashboard | undefined>();
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // Workbook snapshots state
    const [workbookSnapshots, setWorkbookSnapshots] = useState<Record<string, any>>({});
    const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);

    // User profile expansion
    const [profileOpen, setProfileOpen] = useState(false);

    // Dynamic user info from Firebase
    const [displayName, setDisplayName] = useState("User");
    const [email, setEmail] = useState("");
    const [initials, setInitials] = useState("U");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                const name = user.displayName || user.email?.split('@')[0] || "User";
                setDisplayName(name);
                setEmail(user.email || "");
                
                // Get initials (up to 2 letters)
                const nameParts = name.trim().split(" ");
                if (nameParts.length > 1 && nameParts[0].length > 0 && nameParts[nameParts.length - 1].length > 0) {
                    setInitials((nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase());
                } else if (name.length > 0) {
                    setInitials(name.substring(0, 2).toUpperCase());
                } else {
                    setInitials("U");
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // ── Data Connectors ───────────────────────────────────────────────────────
    const [connectorConfigOpen, setConnectorConfigOpen] = useState(false);
    const connectors     = useConnectorsStore((s) => s.connectors);
    const marexConnector = connectors.find((c) => c.type === "marex") ?? null;
    const excelConnector = connectors.find((c) => c.type === "excel") ?? null;

    const getFirebaseToken = useCallback(async () => {
        try { return await getToken(); } catch { return ""; }
    }, []);

    const { status: marexStatus } = useDataConnectorSync(
        marexConnector ? { ...marexConnector, getFirebaseToken } : null
    );
    const { status: excelStatus } = useDataConnectorSync(
        excelConnector ? { ...excelConnector } : null
    );

    const connectorStatuses = useMemo<Record<string, ConnectorStatus>>(() => {
        const m: Record<string, ConnectorStatus> = {};
        if (marexConnector) m[marexConnector.id] = marexStatus;
        if (excelConnector) m[excelConnector.id] = excelStatus;
        return m;
    }, [marexConnector, excelConnector, marexStatus, excelStatus]);

    const setStoredActiveTabId = useDashboardStateStore((s) => s.setActiveTabId);
    const updateStoredTabLayout = useDashboardStateStore((s) => s.updateTabLayout);
    const setStoredTabLayouts = useDashboardStateStore((s) => s.setTabLayouts);
    const getStoredDashboardState = useDashboardStateStore((s) => s.getDashboardState);

    // Fetch dashboards on mount
    useEffect(() => {
        const fetchDashboards = async () => {
            try {
                const baseURL =
                    import.meta.env.VITE_API_BASE_URL || "http://localhost:9002/api";
                const token = await getToken();
                const resp = await axios.get(`${baseURL}/dashboards/end-user`, {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    }
                });
                const data = resp.data;
                const filteredData = data.filter(
                    (d: Dashboard) => d.publishedLayout?.tabs
                );
                setDashboards(filteredData);
            } catch (error) {
                console.error("Error fetching dashboards:", error);
            }
        };
        fetchDashboards();
    }, []);

    // Handle dashboard selection
    const handleSelect = (dashboard: Dashboard) => {
        setSelected(dashboard);
        const { dashboardID, publishedLayout: initialData } = dashboard;

        // Parse backend tabs
        let backendTabs: Tab[] = [];
        if (!initialData) {
            backendTabs = [{ id: "default", title: "Main", layout: [] }];
        } else if (Array.isArray(initialData)) {
            backendTabs = [{ id: "legacy", title: "Main", layout: initialData }];
        } else if (initialData.tabs && Array.isArray(initialData.tabs)) {
            backendTabs = initialData.tabs;
        } else {
            backendTabs = [{ id: "default", title: "Main", layout: [] }];
        }

        // Get stored state for this specific dashboard
        const stored = getStoredDashboardState(dashboardID);
        
        let finalTabs = backendTabs;
        let finalActiveTabId = backendTabs[0]?.id || null;

        if (stored.layouts && Object.keys(stored.layouts).length > 0) {
            // Check for override: Do they have the same tabs and widget count?
            const storedTabIds = Object.keys(stored.layouts);
            const backendTabIds = backendTabs.map(t => t.id);

            const tabsMatch = storedTabIds.length === backendTabIds.length && 
                              storedTabIds.every(id => backendTabIds.includes(id));

            // Check widget IDs in the first tab (heuristic for layout change)
            let widgetsMatch = true;
            if (tabsMatch && backendTabs.length > 0) {
                const firstTabId = backendTabs[0].id;
                const backendWidgets = backendTabs[0].layout.map(l => l.i).sort().join(",");
                const storedWidgets = (stored.layouts[firstTabId] || []).map(l => l.i).sort().join(",");
                if (backendWidgets !== storedWidgets) {
                    widgetsMatch = false;
                }
            }

            if (tabsMatch && widgetsMatch) {
                // Use stored layout for positioning, but ALWAYS keep backend widget configuration
                finalTabs = backendTabs.map(bt => {
                    const storedTabLayout = stored.layouts[bt.id];
                    if (!storedTabLayout) return bt;

                    const mergedLayout = bt.layout.map(backendItem => {
                        const storedItem = storedTabLayout.find(si => si.i === backendItem.i);
                        if (storedItem) {
                            // Merge: take user-adjustable layout props from stored, but everything else from backend
                            return {
                                ...backendItem,
                                x: storedItem.x,
                                y: storedItem.y,
                                w: storedItem.w,
                                h: storedItem.h,
                            };
                        }
                        return backendItem;
                    });

                    return {
                        ...bt,
                        layout: mergedLayout
                    };
                });

                if (stored.activeTabId && backendTabIds.includes(stored.activeTabId)) {
                    finalActiveTabId = stored.activeTabId;
                }
            } else {
                console.log("[Eagle Persistence] Dashboard changed in dev console. Overriding local state.");
                // Initialize store with fresh backend layout
                const initialLayoutsMap: Record<string, LayoutItem[]> = {};
                backendTabs.forEach(t => { initialLayoutsMap[t.id] = t.layout; });
                setStoredTabLayouts(dashboardID, initialLayoutsMap);
            }
        } else {
             // First time load: initialize store
             const initialLayoutsMap: Record<string, LayoutItem[]> = {};
             backendTabs.forEach(t => { initialLayoutsMap[t.id] = t.layout; });
             setStoredTabLayouts(dashboardID, initialLayoutsMap);
        }

        setTabs(finalTabs);
        setActiveTabId(finalActiveTabId);
        setProfileOpen(false);

        // Fetch workbook snapshots
        setIsLoadingSnapshots(true);
        fetchWorkbookSnapshots(dashboardID);
    };

    const fetchWorkbookSnapshots = async (dashboardId: string) => {
        try {
            const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:9002/api";
            // Example endpoint: fetch all snapshots for a dashboard
            // Adjust endpoint path as needed based on your backend API
            const token = await getToken();
            const resp = await axios.get(`${baseURL}/dashboards/snapshots/${dashboardId}`, {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            if (resp.data) {
                setWorkbookSnapshots(resp.data);
            } else {
                setWorkbookSnapshots({});
            }
        } catch (error) {
            console.error("Error fetching workbook snapshots:", error);
            // Default to empty if not found or errors
            setWorkbookSnapshots({});
        } finally {
            setIsLoadingSnapshots(false);
        }
    };

    const handleSaveWorkbook = async (widgetId: string, snapshot: Record<string, any>, parameters?: any[]) => {
        if (!selected) return;
        try {
            const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:9002";
            // Example endpoint: save snapshot for a specific widget
            let token = "";
            try {
                token = await getToken();
            } catch (err) {
                console.error("Could not get token for snapshot save:", err);
            }

            // Using fetch with keepalive: true ensures the request completes
            // even if the user is in the process of closing the browser window.
            await fetch(`${baseURL}/dashboards/snapshots/save`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    dashboardId: selected.dashboardID,
                    itemId: widgetId,
                    snapshot: snapshot,
                    parameters: parameters || [],
                }),
            });

            // Update local state immediately
            setWorkbookSnapshots(prev => ({
                ...prev,
                [widgetId]: { snapshot, parameters: parameters || [] }
            }));
        } catch (error) {
            console.error("Error saving workbook snapshot:", error);
        }
    };

    const activeTab = useMemo(
        () => tabs.find((t) => t.id === activeTabId) || tabs[0],
        [tabs, activeTabId]
    );

    const handleLayoutChange = (newLayout: LayoutItem[]) => {
        if (!activeTabId || !selected) return;
        setTabs((prev) =>
            prev.map((tab) =>
                tab.id === activeTabId ? { ...tab, layout: newLayout } : tab
            )
        );
        
        // Strip widget config before saving to local storage (save only layout/positioning)
        const layoutToStore = newLayout.map(({ widget, ...rest }) => rest);
        updateStoredTabLayout(selected.dashboardID, activeTabId, layoutToStore as LayoutItem[]);
    };

    const handleTabChange = (tabId: string) => {
        setActiveTabId(tabId);
        if (selected) {
            setStoredActiveTabId(selected.dashboardID, tabId);
        }
    };

    const handleSignOut = () => {
        onLogout();
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
                {/* ── Sidebar ── */}
                <Sidebar collapsible="icon">
                    {/* Logo + Brand */}
                    <SidebarHeader className="border-b border-sidebar-border">
                        <div className="flex items-center gap-3 px-1 py-3">
                            {/* Eagle logo mark */}
                            <div className="w-12 h-12 shrink-0 flex items-center justify-center overflow-hidden">
                                <img 
                                    src={eagleLogo} 
                                    alt="Eagle Logo" 
                                    className="w-full h-full object-contain dark:hidden"
                                />
                                <img 
                                    src={eagleDarkLogo} 
                                    alt="Eagle Logo" 
                                    className="w-full h-full object-contain hidden dark:block"
                                />
                            </div>
                            <span 
                                className="font-bold text-lg tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden"
                                style={{ fontFamily: "'Raleway', sans-serif", letterSpacing: "-0.01em" }}
                            >
                                Project Eagle
                            </span>
                        </div>
                    </SidebarHeader>

                    {/* Search */}
                    <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2 bg-muted/50 border border-sidebar-border rounded-md px-3 h-9 text-sm text-muted-foreground">
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span className="flex-1">Search...</span>
                            <kbd className="text-[10px] font-medium bg-muted border border-border rounded px-1 py-0.5">
                                ⌘K
                            </kbd>
                        </div>
                    </div>

                    {/* Dashboards List */}
                    <SidebarContent>
                        <Collapsible
                            open={open}
                            onOpenChange={setOpen}
                            defaultOpen
                            className="group/collapsible"
                        >
                            <SidebarGroup>
                                <CollapsibleTrigger asChild>
                                    <SidebarGroupLabel className="flex items-center cursor-pointer hover:bg-sidebar-accent/50 transition-colors py-5 group-data-[collapsible=icon]:hidden">
                                        {open ? (
                                            <ChevronDown className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                        )}
                                        <span className="font-semibold uppercase tracking-widest text-[10px] text-muted-foreground">
                                            My Dashboards
                                        </span>
                                    </SidebarGroupLabel>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenu>
                                        {dashboards.map((d) => (
                                            <SidebarMenuItem key={d.dashboardID}>
                                                <SidebarMenuButton
                                                    onClick={() => handleSelect(d)}
                                                    isActive={selected?.dashboardID === d.dashboardID}
                                                    className={cn(
                                                        "py-5 rounded-lg transition-all duration-150 text-sm",
                                                        selected?.dashboardID === d.dashboardID
                                                            ? "bg-sidebar-accent text-primary font-semibold"
                                                            : "text-sidebar-foreground/80 hover:text-sidebar-foreground"
                                                    )}
                                                    id={`dashboard-btn-${d.dashboardID}`}
                                                >
                                                    <span className={cn(
                                                        selected?.dashboardID === d.dashboardID
                                                            ? "text-primary"
                                                            : "text-muted-foreground"
                                                    )}>
                                                        {getDashboardIcon(d.name)}
                                                    </span>
                                                    <span>{d.name}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    </SidebarContent>

                    {/* Footer — Theme toggle + User profile */}
                    <SidebarFooter className="border-t border-sidebar-border p-0">
                        {/* Theme toggle */}
                        <div className="flex items-center justify-center py-3 group-data-[collapsible=icon]:py-2">
                            <ThemeToggle />
                        </div>

                        {/* User profile */}
                        <div className="border-t border-sidebar-border">
                            <button
                                id="user-profile-btn"
                                onClick={() => setProfileOpen((p) => !p)}
                                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-sidebar-accent/60 transition-colors group-data-[collapsible=icon]:justify-center"
                            >
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-semibold text-primary">
                                        {initials}
                                    </span>
                                </div>
                                {/* Name / email */}
                                <div className="flex-1 min-w-0 text-left group-data-[collapsible=icon]:hidden">
                                    <p className="text-sm font-semibold text-sidebar-foreground truncate">
                                        {displayName}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {email}
                                    </p>
                                </div>
                                <ChevronDown
                                    className={cn(
                                        "w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                        profileOpen && "rotate-180"
                                    )}
                                />
                            </button>

                            {/* Expanded profile menu */}
                            {profileOpen && (
                                <div className="pb-2 px-2 space-y-0.5 group-data-[collapsible=icon]:hidden">
                                    <button
                                        id="settings-btn"
                                        onClick={() => setConnectorConfigOpen(true)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
                                    >
                                        <Settings className="w-4 h-4 text-muted-foreground" />
                                        Settings
                                    </button>
                                    <button
                                        id="sign-out-btn"
                                        onClick={handleSignOut}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </SidebarFooter>

                    <SidebarRail />
                </Sidebar>

                {/* ── Main Content ── */}
                <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                    <AlertBanner />
                    {selected ? (
                        <>
                            {/* Dashboard header */}
                            <header className="h-auto flex-shrink-0 bg-background border-b border-border/50 flex items-center justify-between px-6 py-4 z-20 gap-3 relative">
                                <div className="flex items-start gap-3">
                                    <SidebarTrigger className="mt-0.5 shrink-0" />
                                    <div>
                                        <h1 
                                            className="text-2xl font-[800] tracking-tight text-foreground"
                                            style={{ fontFamily: "'Raleway', sans-serif", letterSpacing: "-0.015em" }}
                                        >
                                            {selected.name}
                                        </h1>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Drag and resize widgets to customize your view
                                        </p>
                                    </div>
                                </div>
                                <div id="dashboard-toast-container" className="flex-1 flex justify-end"></div>
                            </header>

                            {/* Tab bar */}
                            {tabs.length > 1 && (
                                <div className="flex items-center gap-1 px-6 pt-2 border-b border-border/10 bg-background/30 backdrop-blur-sm z-10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            id={`tab-btn-${tab.id}`}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={cn(
                                                "group flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-t-xl border-t border-l border-r transition-all duration-300 select-none whitespace-nowrap",
                                                tab.id === activeTabId
                                                    ? "bg-card border-border/50 text-primary relative -mb-px z-10"
                                                    : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                            )}
                                        >
                                            {tab.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Canvas area */}
                            <div className="flex-1 min-h-0 relative overflow-hidden">
                                {activeTab && (
                                    isLoadingSnapshots ? (
                                        <div className="h-full flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    ) : (
                                        <DashboardCanvas
                                            key={`${selected.dashboardID}-${activeTab.id}`}
                                            dashboardId={selected.dashboardID}
                                            initialLayout={activeTab.layout}
                                            onLayoutChange={handleLayoutChange}
                                            workbookSnapshots={workbookSnapshots}
                                            onSaveWorkbook={handleSaveWorkbook}
                                        />
                                    )
                                )}
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                style={{
                                    backgroundImage:
                                        "radial-gradient(circle, currentColor 1px, transparent 1px)",
                                    backgroundSize: "32px 32px",
                                }}
                            />
                            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500 px-6">
                                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6 border border-primary/10">
                                    <BarChart2 className="w-10 h-10 text-primary/40" />
                                </div>
                                <h2 
                                className="text-3xl font-[800] text-foreground/40 mb-3 tracking-tight transition-all duration-700"
                                style={{ fontFamily: "'Raleway', sans-serif", letterSpacing: "-0.015em" }}
                            >
                                Select a Dashboard
                            </h2>
                                <p className="text-muted-foreground max-w-[280px] mx-auto text-sm leading-relaxed">
                                    Select a dashboard from the sidebar to start exploring your
                                    data.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {connectorConfigOpen && (
                <ConnectorConfig
                    statuses={connectorStatuses}
                    onClose={() => setConnectorConfigOpen(false)}
                />
            )}
        </SidebarProvider>
    );
}
