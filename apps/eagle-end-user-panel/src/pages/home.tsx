import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
    Wifi,
    WifiOff,
    Loader,
    AlertCircle,
    Database,
    Bell,
    Plus,
} from "lucide-react";
import { useDataConnectorSync, useAlertsStore, ConnectorsProvider } from "@gsc-tech/eagle-widget-library";
import type { ConnectorStatus } from "@gsc-tech/eagle-widget-library";
import { useConnectorsStore, NATIVE_CONNECTOR_URLS } from "@/store/connectorsStore";
import { AlertBanner } from "@/components/AlertBanner";
import { ConnectorConfig } from "@/components/ConnectorConfig";
import { AlertHistoryPanel } from "@/components/AlertHistoryPanel";
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
import { dashboardsApi } from "@/services/dashboardsApi";
import type { DashboardRecord } from "@/services/dashboardsApi";
import DashboardCanvas from "@/components/dashboard-renderer/Canvas";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import AddWidgetModal from "@/components/AddWidgetModal";
import EditWidgetModal from "@/components/EditWidgetModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useFirebaseToken } from "@/hooks/useFirebaseToken";
import { useDashboardLoader } from "@/hooks/useDashboardLoader";
import { auth } from "@/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { useDashboardStateStore } from "@/store/dashboardStateStore";

export type Tab = {
    id: string;
    title: string;
    layout: LayoutItem[];
};

type Dashboard = DashboardRecord;

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

function connectorStatusColor(status: ConnectorStatus): string {
    if (status === "connected")  return "#22c55e";
    if (status === "connecting") return "#eab308";
    if (status === "error" || status === "failed") return "#ef4444";
    return "#52525b";
}

function ConnectorStatusIcon({ status }: { status: ConnectorStatus }) {
    if (status === "connected")  return <Wifi size={12} />;
    if (status === "connecting") return <Loader size={12} className="animate-spin" />;
    if (status === "error" || status === "failed") return <AlertCircle size={12} />;
    return <WifiOff size={12} />;
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

    // ── Add Widget modal ─────────────────────────────────────────────────────
    const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

    const handleAddWidget = useCallback(
        ({
            componentName,
            widgetTitle,
            localDataConfig,
            fieldMapping,
        }: {
            componentName: string;
            widgetTitle: string;
            localDataConfig: any;
            fieldMapping: Record<string, string>;
        }) => {
            if (!activeTabId || !selected) return;
            const newItem: LayoutItem = {
                i: `user-widget-${Date.now()}`,
                x: 0,
                y: Infinity, // react-grid-layout places it at the bottom
                w: 6,
                h: 5,
                minW: 2,
                minH: 2,
                widget: {
                    componentName,
                    name: widgetTitle,
                    defaultProps: {
                        ...fieldMapping,
                        localDataConfig,
                    },
                },
            };
            setTabs((prev) =>
                prev.map((tab) =>
                    tab.id === activeTabId
                        ? { ...tab, layout: [...tab.layout, newItem] }
                        : tab
                )
            );
            setAddWidgetModalOpen(false);
        },
        [activeTabId, selected]
    );

    // ── Alert history panel ───────────────────────────────────────────────────
    const [alertPanelOpen, setAlertPanelOpen] = useState(false);
    const activeAlertCount = useAlertsStore((s) => s.alerts.filter((a) => !a.addressed).length);
    const totalAlertCount  = useAlertsStore((s) => s.alerts.length);

    // ── Data Connectors ───────────────────────────────────────────────────────
    const [connectorConfigOpen, setConnectorConfigOpen] = useState(false);
    const connectors     = useConnectorsStore((s) => s.connectors);
    const marexConnector = connectors.find((c) => c.type === "marex") ?? null;
    const excelConnector = connectors.find((c) => c.type === "excel") ?? null;

    const getFirebaseToken = useFirebaseToken();

    const { status: marexStatus } = useDataConnectorSync(
        marexConnector ? { ...marexConnector, wsUrl: NATIVE_CONNECTOR_URLS.marex, getFirebaseToken } : null
    );
    const { status: excelStatus } = useDataConnectorSync(
        excelConnector ? { ...excelConnector, wsUrl: NATIVE_CONNECTOR_URLS.excel } : null
    );

    const connectorStatuses = useMemo<Record<string, ConnectorStatus>>(() => {
        const m: Record<string, ConnectorStatus> = {};
        if (marexConnector) m[marexConnector.id] = marexStatus;
        if (excelConnector) m[excelConnector.id] = excelStatus;
        return m;
    }, [marexConnector, excelConnector, marexStatus, excelStatus]);


    const setStoredActiveTabId = useDashboardStateStore((s) => s.setActiveTabId);
    const updateStoredTabLayout = useDashboardStateStore((s) => s.updateTabLayout);

    const { loadDashboard } = useDashboardLoader();

    const editingWidget = useMemo(() => {
        if (!editingWidgetId) return null;
        return tabs.find((t) => t.id === activeTabId)?.layout.find((item) => item.i === editingWidgetId) || null;
    }, [editingWidgetId, tabs, activeTabId]);

    const handleSaveEdit = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (widgetId: string, widgetTitle: string, newDefaultProps: Record<string, any>) => {
            if (!activeTabId || !selected) return;
            setTabs((prev) => {
                const newTabs = prev.map((tab) => {
                    if (tab.id !== activeTabId) return tab;
                    return {
                        ...tab,
                        layout: tab.layout.map((item) =>
                            item.i !== widgetId
                                ? item
                                : { ...item, widget: { ...item.widget, name: widgetTitle, defaultProps: newDefaultProps } }
                        ),
                    };
                });
                // Persist immediately — handleLayoutChange won't fire for config-only changes
                const updatedLayout = newTabs.find((t) => t.id === activeTabId)?.layout || [];
                updateStoredTabLayout(selected.dashboardID, activeTabId, updatedLayout);
                return newTabs;
            });
            setEditingWidgetId(null);
        },
        [activeTabId, selected, updateStoredTabLayout]
    );

    // Fetch dashboards on mount
    useEffect(() => {
        dashboardsApi
            .list()
            .then((data) => setDashboards(data.filter((d) => d.publishedLayout?.tabs)))
            .catch((err) => console.error("Error fetching dashboards:", err));
    }, []);

    // Handle dashboard selection
    const handleSelect = (dashboard: Dashboard) => {
        setSelected(dashboard);
        const { tabs: resolvedTabs, activeTabId: resolvedActiveTabId } =
            loadDashboard(dashboard.dashboardID, dashboard.publishedLayout);
        setTabs(resolvedTabs);
        setActiveTabId(resolvedActiveTabId);
        setProfileOpen(false);
        setIsLoadingSnapshots(true);
        fetchWorkbookSnapshots(dashboard.dashboardID);
    };

    const fetchWorkbookSnapshots = (dashboardId: string) => {
        dashboardsApi
            .getSnapshots(dashboardId)
            .then(setWorkbookSnapshots)
            .catch((err) => {
                console.error("Error fetching workbook snapshots:", err);
                setWorkbookSnapshots({});
            })
            .finally(() => setIsLoadingSnapshots(false));
    };

    const latestSnapshotsRef = useRef<Record<string, { snapshot: Record<string, any>; parameters: any[] }>>({});
    const dirtyWidgetsRef = useRef<Set<string>>(new Set());

    // Receiving a snapshot only marks it dirty — the interval does the actual saving.
    const handleSaveWorkbook = useCallback((widgetId: string, snapshot: Record<string, any>, parameters?: any[]) => {
        if (!selected) return;
        latestSnapshotsRef.current[widgetId] = { snapshot, parameters: parameters || [] };
        dirtyWidgetsRef.current.add(widgetId);
    }, [selected]);

    // Flush dirty snapshots to the backend every 30 s.
    // Also flushes on cleanup so switching dashboards doesn't lose the last edit.
    useEffect(() => {
        if (!selected) return;
        const dashboardId = selected.dashboardID;

        const flush = () => {
            const dirty = [...dirtyWidgetsRef.current];
            if (dirty.length === 0) return;
            dirtyWidgetsRef.current.clear();

            for (const widgetId of dirty) {
                const entry = latestSnapshotsRef.current[widgetId];
                if (!entry) continue;
                dashboardsApi
                    .saveSnapshot(dashboardId, widgetId, entry.snapshot, entry.parameters)
                    .then(() => setWorkbookSnapshots((prev) => ({ ...prev, [widgetId]: entry })))
                    .catch((err) => {
                        console.error("Error saving workbook snapshot:", err);
                        dirtyWidgetsRef.current.add(widgetId); // retry next interval
                    });
            }
        };

        const id = setInterval(flush, 30_000);
        return () => { clearInterval(id); flush(); };
    }, [selected]);

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
        
        // Preserve full config for user-added (CSV) widgets; strip widget config from backend widgets
        const layoutToStore = newLayout.map((item) => {
            if (item.widget?.defaultProps?.localDataConfig) return item;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { widget: _w, ...rest } = item;
            return rest;
        });
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
                            <span className="font-bold text-lg tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden [font-family:'Raleway',sans-serif] [letter-spacing:-0.01em]">
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

                    {/* Footer — Connector status + Theme toggle + User profile */}
                    <SidebarFooter className="border-t border-sidebar-border p-0">

                        {/* ── Connector Status Bar — always visible ── */}
                        <button
                            onClick={() => setConnectorConfigOpen(true)}
                            className="w-full text-left hover:bg-sidebar-accent/60 transition-colors border-b border-sidebar-border"
                            title="Data Connectors"
                        >
                            {/* Expanded sidebar view */}
                            <div className="px-4 py-3 group-data-[collapsible=icon]:hidden">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Database className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Data Connectors
                                        </span>
                                    </div>
                                    <Settings className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-2.5">
                                    {[
                                        { label: "Marex",  configured: !!marexConnector, status: marexStatus },
                                        { label: "Excel",  configured: !!excelConnector, status: excelStatus },
                                    ].map(({ label, configured, status }) => {
                                        const color = configured ? connectorStatusColor(status) : "#52525b";
                                        const displayStatus = configured ? status : "not set";
                                        return (
                                            <div key={label} className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full shrink-0 inline-block" style={{ background: color }} />
                                                <span className="text-sm font-semibold text-sidebar-foreground flex-1">{label}</span>
                                                <span className="flex items-center gap-1 text-xs font-bold" style={{ color }}>
                                                    {configured && <ConnectorStatusIcon status={status} />}
                                                    <span className="capitalize">{displayStatus}</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Collapsed / icon-only view: two stacked status dots */}
                            <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center justify-center gap-2 py-3">
                                {[
                                    { configured: !!marexConnector, status: marexStatus },
                                    { configured: !!excelConnector, status: excelStatus },
                                ].map(({ configured, status }, i) => {
                                    const color = configured ? connectorStatusColor(status) : "#52525b";
                                    return (
                                        <span key={i} className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                                    );
                                })}
                            </div>
                        </button>

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
                                        <h1 className="text-2xl font-[800] tracking-tight text-foreground [font-family:'Raleway',sans-serif] [letter-spacing:-0.015em]">
                                            {selected.name}
                                        </h1>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            Drag and resize widgets to customize your view
                                        </p>
                                    </div>
                                </div>
                                <div id="dashboard-toast-container" className="flex-1 flex items-center justify-end gap-3">
                                    {/* Add Widget button */}
                                    <button
                                        onClick={() => setAddWidgetModalOpen(true)}
                                        title="Add widget from CSV"
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all duration-150 bg-blue-500/10 border border-blue-500/35 text-blue-300 hover:bg-blue-500/20"
                                    >
                                        <Plus size={15} />
                                        <span>Add Widget</span>
                                    </button>
                                    {/* Alert history button */}
                                    <button
                                        onClick={() => setAlertPanelOpen(true)}
                                        title="Alert History"
                                        className={cn(
                                            "relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-bold cursor-pointer transition-all duration-150",
                                            activeAlertCount > 0
                                                ? "bg-destructive/10 border border-destructive/40 text-red-300 hover:bg-destructive/20"
                                                : "bg-transparent border border-white/10 text-zinc-500 hover:bg-accent/50 hover:text-foreground"
                                        )}
                                    >
                                        <Bell size={16} />
                                        <span>Alerts</span>
                                        {totalAlertCount > 0 && (
                                            <span className={cn(
                                                "inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[11px] font-extrabold text-white px-1",
                                                activeAlertCount > 0 ? "bg-destructive" : "bg-zinc-600"
                                            )}>
                                                {totalAlertCount}
                                            </span>
                                        )}
                                    </button>
                                </div>
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
                                        <ConnectorsProvider connectors={connectors}>
                                            <DashboardCanvas
                                                key={`${selected.dashboardID}-${activeTab.id}`}
                                                dashboardId={selected.dashboardID}
                                                initialLayout={activeTab.layout}
                                                onLayoutChange={handleLayoutChange}
                                                onEditWidget={setEditingWidgetId}
                                                workbookSnapshots={workbookSnapshots}
                                                onSaveWorkbook={handleSaveWorkbook}
                                            />
                                        </ConnectorsProvider>
                                    )
                                )}
                            </div>
                        </>
                    ) : (
                        /* Empty state */
                        <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:32px_32px]" />
                            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500 px-6">
                                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6 border border-primary/10">
                                    <BarChart2 className="w-10 h-10 text-primary/40" />
                                </div>
                                <h2 className="text-3xl font-[800] text-foreground/40 mb-3 tracking-tight transition-all duration-700 [font-family:'Raleway',sans-serif] [letter-spacing:-0.015em]">
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

            {addWidgetModalOpen && (
                <AddWidgetModal
                    onClose={() => setAddWidgetModalOpen(false)}
                    onAdd={handleAddWidget}
                />
            )}

            {editingWidget && (
                <EditWidgetModal
                    item={editingWidget}
                    onClose={() => setEditingWidgetId(null)}
                    onSave={handleSaveEdit}
                />
            )}

            <AlertHistoryPanel
                open={alertPanelOpen}
                onClose={() => setAlertPanelOpen(false)}
            />

        </SidebarProvider>
    );
}
