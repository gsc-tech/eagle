import { useEffect, useState, useMemo } from "react";
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
    const [workbookSnapshots, setWorkbookSnapshots] = useState<Record<string, Record<string, any>>>({});
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

        const initialData = dashboard.publishedLayout;
        let parsedTabs: Tab[] = [];

        if (!initialData) {
            parsedTabs = [{ id: "default", title: "Main", layout: [] }];
        } else if (Array.isArray(initialData)) {
            parsedTabs = [{ id: "legacy", title: "Main", layout: initialData }];
        } else if (initialData.tabs && Array.isArray(initialData.tabs)) {
            parsedTabs = initialData.tabs;
        } else {
            parsedTabs = [{ id: "default", title: "Main", layout: [] }];
        }

        setTabs(parsedTabs);
        if (parsedTabs.length > 0) {
            setActiveTabId(parsedTabs[0].id);
        }
        setProfileOpen(false);

        // Fetch workbook snapshots for this dashboard
        setIsLoadingSnapshots(true);
        fetchWorkbookSnapshots(dashboard.dashboardID);
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

    const handleSaveWorkbook = async (widgetId: string, snapshot: Record<string, any>) => {
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
                    snapshot: snapshot
                }),
            });

            // Update local state immediately
            setWorkbookSnapshots(prev => ({
                ...prev,
                [widgetId]: snapshot
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
        if (!activeTabId) return;
        setTabs((prev) =>
            prev.map((tab) =>
                tab.id === activeTabId ? { ...tab, layout: newLayout } : tab
            )
        );
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
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="w-5 h-5 text-primary-foreground"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
                                    <path d="M13 13l6 6" />
                                </svg>
                            </div>
                            <span className="font-bold text-base tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
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
                    {selected ? (
                        <>
                            {/* Dashboard header */}
                            <header className="h-auto flex-shrink-0 bg-background border-b border-border/50 flex items-start px-6 py-4 z-20 gap-3">
                                <SidebarTrigger className="mt-0.5 shrink-0" />
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-foreground">
                                        {selected.name}
                                    </h1>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        Drag and resize widgets to customize your view
                                    </p>
                                </div>
                            </header>

                            {/* Tab bar */}
                            {tabs.length > 1 && (
                                <div className="flex items-center gap-1 px-6 pt-2 border-b border-border/10 bg-background/30 backdrop-blur-sm z-10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {tabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            id={`tab-btn-${tab.id}`}
                                            onClick={() => setActiveTabId(tab.id)}
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
                                <h2 className="text-2xl font-bold text-foreground">
                                    Welcome Back
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
        </SidebarProvider>
    );
}
