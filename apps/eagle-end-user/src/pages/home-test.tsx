import { useEffect, useState, useMemo } from "react";
import { LayoutDashboard, ChevronDown, ChevronRight } from "lucide-react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import axios from "axios";
import DashboardCanvas from "@/components/dashboard-renderer/Canvas";
import type { LayoutItem } from "@/components/dashboard-renderer/types";
import { ThemeToggle } from "@/components/ThemeToggle";

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

export default function DashboardWorkspaceTest() {
    const [open, setOpen] = useState(true);
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selected, setSelected] = useState<Dashboard>();

    // Tabs State
    const [tabs, setTabs] = useState<Tab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);

    // Fetch dashboards on mount
    useEffect(() => {
        const fetchDashboards = async () => {
            try {
                const baseURL = import.meta.env.BACKEND__URL
                const resp = await axios.get(`${baseURL}/dashboards/end-user`);
                const data = resp.data;
                const filteredData = data.filter((d: Dashboard) => d.publishedLayout.tabs);
                console.log(filteredData);
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
            // Handle legacy array format
            parsedTabs = [{ id: "legacy", title: "Main", layout: initialData }];
        } else if (initialData.tabs && Array.isArray(initialData.tabs)) {
            // Handle new tabs format
            parsedTabs = initialData.tabs;
        } else {
            parsedTabs = [{ id: "default", title: "Main", layout: [] }];
        }

        setTabs(parsedTabs);
        if (parsedTabs.length > 0) {
            setActiveTabId(parsedTabs[0].id);
        }
    };

    const activeTab = useMemo(() =>
        tabs.find(t => t.id === activeTabId) || tabs[0]
        , [tabs, activeTabId]);

    const handleLayoutChange = (newLayout: LayoutItem[]) => {
        if (!activeTabId) return;
        setTabs(prev => prev.map(tab =>
            tab.id === activeTabId ? { ...tab, layout: newLayout } : tab
        ));
    };

    return (
        <SidebarProvider>
            <div className="flex h-screen w-screen overflow-hidden data-[sidebar-open=true]:pl-0 data-[sidebar-collapsed=true]:pl-0 bg-background text-foreground">
                <Sidebar collapsible="icon">
                    <SidebarHeader className="border-b border-border/50">
                        <div className="flex items-center gap-2 px-2 py-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <LayoutDashboard className="w-5 h-5 text-primary" />
                            </div>
                            <span className="font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">Eagle Dashboard</span>
                        </div>
                    </SidebarHeader>

                    <SidebarContent>
                        <Collapsible open={open} onOpenChange={setOpen} defaultOpen className="group/collapsible">
                            <SidebarGroup>
                                <CollapsibleTrigger asChild>
                                    <SidebarGroupLabel className="flex items-center cursor-pointer hover:bg-accent/50 transition-colors py-6">
                                        {open ? (<ChevronDown className="w-4 h-4 mr-2" />) : (<ChevronRight className="w-4 h-4 mr-2" />)}
                                        <span className="font-semibold uppercase tracking-wider text-xs text-muted-foreground">My Dashboards</span>
                                    </SidebarGroupLabel>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenu>
                                        {dashboards.map((d) => (
                                            <SidebarMenuItem key={d.dashboardID}>
                                                <SidebarMenuButton
                                                    onClick={() => handleSelect(d)}
                                                    isActive={selected?.dashboardID === d.dashboardID}
                                                    className="py-6"
                                                >
                                                    <LayoutDashboard className="w-4 h-4" />
                                                    <span className="font-medium">{d.name}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    </SidebarContent>
                    <SidebarFooter className="border-t border-border/50 p-4">
                        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                            <span className="text-sm font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">Appearance</span>
                            <ThemeToggle />
                        </div>
                    </SidebarFooter>
                    <SidebarRail />
                </Sidebar>

                <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
                    {selected ? (
                        <>
                            <header className="h-16 flex-shrink-0 bg-card/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-6 z-20">
                                <div className="flex items-center gap-4">
                                    <SidebarTrigger />
                                    <h1 className="text-xl font-bold tracking-tight text-foreground">{selected.name}</h1>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ThemeToggle />
                                </div>
                            </header>

                            {/* Tabs Bar */}
                            {tabs.length > 0 && (
                                <div className="flex items-center gap-1 px-6 pt-2 border-b border-border/10 bg-background/30 backdrop-blur-sm z-10 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTabId(tab.id)}
                                            className={`
                                                group flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-t-xl border-t border-l border-r transition-all duration-300 select-none whitespace-nowrap
                                                ${tab.id === activeTabId
                                                    ? "bg-card border-border/50 text-primary relative -mb-px z-10 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.05)]"
                                                    : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground hover:translate-y-[-1px]"}
                                            `}
                                        >
                                            {tab.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Canvas Area */}
                            <div className="flex-1 min-h-0 relative">
                                {activeTab && (
                                    <DashboardCanvas
                                        key={`${selected.dashboardID}-${activeTab.id}`} // Force remount on tab or dashboard change
                                        initialLayout={activeTab.layout}
                                        onLayoutChange={handleLayoutChange}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center bg-background relative overflow-hidden">
                            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                            <div className="text-center space-y-4 animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6 border border-primary/10">
                                    <LayoutDashboard className="w-10 h-10 text-primary/40" />
                                </div>
                                <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
                                <p className="text-muted-foreground max-w-[280px] mx-auto">
                                    Select a dashboard from the sidebar to start exploring your data.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </SidebarProvider>
    );
}
