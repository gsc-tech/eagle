import { useState, useEffect, useMemo, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { api } from "@/utils/apiClient";
import type { widgetGroupWithStatus, LayoutItem } from "@gsc-tech/dashboard-builder";
import { Sidebar as WidgetSidebar, DroppableCanvas } from "@gsc-tech/dashboard-builder";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocation, useBlocker } from "react-router-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import axios from "axios";
import { Shield, ChevronDown, Plus, X } from "lucide-react";

type UserGroup = {
    groupId: string;
    name: string;
    description: string;
};

export type Tab = {
    id: string;
    title: string;
    layout: LayoutItem[];
};

export default function DashBuilder() {
    const { setHasUnsavedChanges: setGlobalUnsavedChanges } = useUnsavedChanges();
    const [widgetGroups, setWidgetGroups] = useState<widgetGroupWithStatus>({});

    const { state } = useLocation();

    // Helper to generate IDs
    const generateId = () => Math.random().toString(36).substring(2, 9);

    // Initial Data Parsing
    const initialTabs: Tab[] = useMemo(() => {
        if (!state || !state.initialData) {
            return [{ id: generateId(), title: "Tab 1", layout: [] }];
        }
        // Handle legacy array format
        if (Array.isArray(state.initialData)) {
            return [{ id: generateId(), title: "Tab 1", layout: state.initialData }];
        }
        // Handle new tabs format
        if (state.initialData.tabs && Array.isArray(state.initialData.tabs)) {
            return state.initialData.tabs;
        }
        // Fallback
        return [{ id: generateId(), title: "Tab 1", layout: [] }];
    }, [state]);

    const dashboardIdFromState = state ? state.dashboardId : null;
    const dashboardName = state ? state.dashboardName : "untitled";
    const initialAllowedGroups: string[] = state?.allowedUserGroups || [];

    const [loading, setLoading] = useState(true);

    // Tabs State
    const [tabs, setTabs] = useState<Tab[]>(initialTabs);
    const [activeTabId, setActiveTabId] = useState<string>(initialTabs[0].id);
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState<string>("");

    // Saved state for unsaved changes detection (deep compare)
    const [savedTabs, setSavedTabs] = useState<Tab[]>(initialTabs);


    const [dashboardNameState, setDashboardNameState] = useState<string>(dashboardName);
    const [currentDashboardId, setCurrentDashboardId] = useState<string | null>(dashboardIdFromState);

    // User groups state
    const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
    const [selectedUserGroups, setSelectedUserGroups] = useState<string[]>(initialAllowedGroups);
    const [showUserGroupDropdown, setShowUserGroupDropdown] = useState(false);

    const [backends, setBackends] = useState<any[]>([]);

    const fetchWidgets = useCallback(async () => {
        try {
            setLoading(true);
            // Fetch widgets
            const widgetsResp = await api.get("/widget");
            const widgetsData = widgetsResp.data;

            // Fetch backends to get their status
            const backendsResp = await api.get("/backend", { timeout: 1000 });
            const backendsData = backendsResp.data;
            setBackends(backendsData);

            // Check backend connectivity
            const backendStatusMap: Record<string, boolean> = {};
            await Promise.all(
                backendsData.map(async (backend: any) => {
                    try {
                        const res = await axios.get(`${backend.backendUrl}/widgets`, { timeout: 300 });
                        backendStatusMap[backend.name] = res.status === 200;
                    } catch (error) {
                        backendStatusMap[backend.name] = false;
                    }
                })
            );

            // Combine widgets with backend status
            const widgetsWithStatus: widgetGroupWithStatus = {};
            // Initialize with all backends, even if they have no widgets yet
            backendsData.forEach((backend: any) => {
                widgetsWithStatus[backend.name] = {
                    widgets: widgetsData[backend.name] || [],
                    isConnected: backendStatusMap[backend.name] ?? false
                };
            });
            // Also include any widgets that might be from backends not in the list (if any edge case)
            Object.entries(widgetsData).forEach(([backendName, widgets]) => {
                if (!widgetsWithStatus[backendName]) {
                    widgetsWithStatus[backendName] = {
                        widgets: widgets as any,
                        isConnected: backendStatusMap[backendName] ?? false
                    };
                }
            });

            setWidgetGroups(widgetsWithStatus);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchUserGroups = async () => {
            try {
                const response = await api.get("/usergroups");
                const data = response.data || [];
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
        };

        fetchWidgets();
        fetchUserGroups();
    }, [fetchWidgets]);

    const checkBackend = async (url: string) => {
        try {
            const response = await axios.get(`${url}/widgets`, { timeout: 500 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    const handleRefreshBackend = async (backendName: string) => {
        const backend = backends.find(b => b.name === backendName);
        if (!backend) {
            console.error("Backend not found:", backendName);
            return;
        }

        try {
            const isBackendConnected = await checkBackend(backend.backendUrl);
            if (isBackendConnected) {
                await api.put("backend/widgetRefresh", {
                    backendId: backend.backendId,
                    backendUrl: backend.backendUrl
                });
                // Re-fetch widgets to update list and status
            }
            await fetchWidgets();
        } catch (error) {
            console.error("Error refreshing backend:", error);
            // alert("Unable to refresh the backend. Please try again.");
        }
    };

    const activeTab = useMemo(() =>
        tabs.find(t => t.id === activeTabId) || tabs[0]
        , [tabs, activeTabId]);

    const hasUnsavedChanges = useMemo(() => {
        return JSON.stringify(tabs) !== JSON.stringify(savedTabs);
    }, [tabs, savedTabs]);

    useEffect(() => {
        setGlobalUnsavedChanges(hasUnsavedChanges);
        return () => setGlobalUnsavedChanges(false);
    }, [hasUnsavedChanges, setGlobalUnsavedChanges]);


    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname
    );

    const handleLayoutChange = useCallback((layout: LayoutItem[]) => {
        setTabs(prev => prev.map(tab =>
            tab.id === activeTabId ? { ...tab, layout } : tab
        ));
    }, [activeTabId]);


    const handleSaveDraft = async (): Promise<boolean> => {
        if (dashboardNameState === "untitled") {
            alert("Please enter a dashboard name");
            return false;
        }
        try {
            // Collect all widget IDs from all tabs
            const usedWidgets = tabs.flatMap(tab => tab.layout.map(item => item.widget.widgetId));

            // Clean layout data for saving
            const cleanTabs = tabs.map(tab => ({
                ...tab,
                layout: tab.layout.map(item => ({
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
                    widgetId: item.widget.widgetId
                }))
            }));

            const payload: any = {
                name: dashboardNameState,
                draftLayout: { tabs: cleanTabs }, // Saving object with tabs
                usedWidgets: [...new Set(usedWidgets)], // specific unique widgets
                accessibleGroups: selectedUserGroups
            }

            if (currentDashboardId) {
                payload.dashboardId = currentDashboardId;
            }

            console.log(payload);

            const resp = await api.post("/dashboard/draft", payload);
            if (resp.status === 201) {
                if (resp.data && (resp.data.dashboardID || resp.data.dashboardId)) {
                    setCurrentDashboardId(resp.data.dashboardID || resp.data.dashboardId);
                }
                alert("Draft saved successfully");
                setSavedTabs(tabs); // Update saved state
                return true;
            }
            return false;
        } catch (error) {
            console.log(error);
            alert("Unable to save the draft");
            return false;
        }
    };


    const handlePublish = async (): Promise<boolean> => {
        if (dashboardNameState === "untitled") {
            alert("Please enter a dashboard name");
            return false;
        }
        if (selectedUserGroups.length === 0) {
            alert("Please select at least one user group that can access this dashboard");
            return false;
        }
        try {
            // Collect all widget IDs from all tabs
            const usedWidgets = tabs.flatMap(tab => tab.layout.map(item => item.widget.widgetId));

            // Clean layout data for publishing
            const cleanTabs = tabs.map(tab => ({
                ...tab,
                layout: tab.layout.map(item => ({
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
                    widgetId: item.widget.widgetId
                }))
            }));

            const payload: any = {
                name: dashboardNameState,
                publishedLayout: { tabs: cleanTabs },
                draftLayout: { tabs: cleanTabs },
                usedWidgets: [...new Set(usedWidgets)],
                accessibleGroups: selectedUserGroups
            }

            if (currentDashboardId) {
                payload.dashboardId = currentDashboardId;
            }

            const resp = await api.post("/dashboard/publish", payload);
            if (resp.status === 201) {
                if (resp.data && (resp.data.dashboardID || resp.data.dashboardId)) {
                    setCurrentDashboardId(resp.data.dashboardID || resp.data.dashboardId);
                }
                alert("Published successfully");
                setSavedTabs(tabs);
                return true;
            }
            return false;
        } catch (error) {
            console.log(error);
            alert("Unable to publish the dashboard");
            return false;
        }
    };


    // Toggle user group selection
    const toggleUserGroup = (groupId: string) => {
        setSelectedUserGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(id => id !== groupId)
                : [...prev, groupId]
        );
    };

    const handleAddTab = () => {
        const newId = generateId();
        const newTab: Tab = {
            id: newId,
            title: `Tab ${tabs.length + 1}`,
            layout: []
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newId);
    };

    const handleDeleteTab = (tabId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (tabs.length === 1) {
            alert("Last tab cannot be deleted.");
            return;
        }

        const tabIndex = tabs.findIndex(t => t.id === tabId);
        const newTabs = tabs.filter(t => t.id !== tabId);
        setTabs(newTabs);

        // If deleting active tab, switch to nearest neighbor
        if (tabId === activeTabId) {
            const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
            setActiveTabId(newTabs[newActiveIndex].id);
        }
    };

    const startEditingTab = (tab: Tab) => {
        setEditingTabId(tab.id);
        setEditingTitle(tab.title);
    };

    const saveTabTitle = () => {
        if (editingTabId && editingTitle.trim()) {
            setTabs(prev => prev.map(t =>
                t.id === editingTabId ? { ...t, title: editingTitle.trim() } : t
            ));
        }
        setEditingTabId(null);
    };



    return (
        <DndProvider backend={HTML5Backend}>
            <div className="h-screen overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
                <div className="flex h-full">
                    {/* Widget List Sidebar */}
                    <WidgetSidebar
                        widgetGroups={widgetGroups}
                        loading={loading}
                        onRefreshBackend={handleRefreshBackend}
                    />

                    {/* Canvas Area */}
                    <div className="flex-1 flex flex-col min-w-0 max-h-screen">
                        <div className="h-16 flex-shrink-0 bg-card/80 backdrop-blur-sm border-b border-border/50 flex items-center justify-between px-6 shadow-sm relative z-10">
                            <div className="flex items-center gap-4 flex-1">
                                <SidebarTrigger className="-ml-2" />
                                <label htmlFor="dashboard-name" className="text-sm font-medium text-foreground whitespace-nowrap">
                                    Dashboard Name:
                                </label>
                                <input
                                    id="dashboard-name"
                                    type="text"
                                    value={dashboardNameState}
                                    onChange={(e) => setDashboardNameState(e.target.value)}
                                    placeholder="Enter dashboard name..."
                                    className="flex-1 max-w-md px-3 py-2 text-sm bg-background/50 text-foreground border border-border/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                />

                                {/* User Group Access Control */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserGroupDropdown(!showUserGroupDropdown)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm bg-background/50 text-foreground border border-border/50 rounded-lg hover:bg-accent/50 transition-all"
                                    >
                                        <Shield className="w-4 h-4" />
                                        <span className="whitespace-nowrap">
                                            Access ({selectedUserGroups.length})
                                        </span>
                                        <ChevronDown className="w-4 h-4" />
                                    </button>

                                    {showUserGroupDropdown && (
                                        <div className="absolute top-full mt-2 right-0 z-[100] min-w-[280px] bg-card border border-border rounded-lg shadow-xl p-3">
                                            <div className="mb-2 pb-2 border-b border-border">
                                                <p className="text-xs font-medium text-muted-foreground">Select User Groups</p>
                                            </div>
                                            <div className="max-h-[200px] overflow-y-auto space-y-1">
                                                {userGroups.length === 0 ? (
                                                    <p className="text-sm text-muted-foreground p-2">No user groups available</p>
                                                ) : (
                                                    userGroups.map((group) => (
                                                        <label
                                                            key={group.groupId}
                                                            className="flex items-center gap-2 p-2 hover:bg-accent/50 rounded-md cursor-pointer transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUserGroups.includes(group.groupId)}
                                                                onChange={() => toggleUserGroup(group.groupId)}
                                                                className="rounded border-border"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-medium text-foreground">{group.name}</p>
                                                                {group.description && (
                                                                    <p className="text-xs text-muted-foreground">{group.description}</p>
                                                                )}
                                                            </div>
                                                        </label>
                                                    ))
                                                )}
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border flex justify-end">
                                                <button
                                                    onClick={() => setShowUserGroupDropdown(false)}
                                                    className="px-3 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleSaveDraft()}
                                    className="px-4 py-2 text-sm font-medium text-foreground bg-secondary/80 border border-border/50 rounded-lg hover:bg-secondary transition-all hover:shadow-md"
                                >
                                    Save Draft
                                </button>
                                <button
                                    onClick={() => handlePublish()}
                                    disabled={!dashboardNameState.trim() || selectedUserGroups.length === 0}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-md ${dashboardNameState.trim() && selectedUserGroups.length > 0
                                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
                                        : "bg-muted text-muted-foreground cursor-not-allowed"
                                        }`}
                                >
                                    Publish
                                </button>
                            </div>
                        </div>

                        {/* Tabs Bar */}
                        <div className="flex items-center gap-1 px-6 pt-2 border-b border-border/50 bg-background/50 backdrop-blur-sm z-0">
                            {tabs.map(tab => (
                                <div
                                    key={tab.id}
                                    onClick={() => setActiveTabId(tab.id)}
                                    onDoubleClick={() => startEditingTab(tab)}
                                    className={`
                                        group flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-t border-l border-r cursor-pointer transition-all select-none
                                        ${tab.id === activeTabId
                                            ? "bg-card border-border/50 text-primary relative -mb-px z-10 shadow-sm"
                                            : "border-transparent text-muted-foreground hover:bg-accent/30 hover:text-foreground"}
                                    `}
                                >
                                    {editingTabId === tab.id ? (
                                        <input
                                            autoFocus
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onBlur={saveTabTitle}
                                            onKeyDown={(e) => e.key === 'Enter' && saveTabTitle()}
                                            className="bg-transparent border-none outline-none font-medium text-primary w-24"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span>{tab.title}</span>
                                    )}
                                    {tabs.length > 1 && (
                                        <div
                                            onClick={(e) => handleDeleteTab(tab.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded-full transition-all ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={handleAddTab}
                                className="p-1.5 ml-1 text-muted-foreground hover:bg-accent/50 hover:text-foreground rounded-md transition-colors"
                                title="Add Tab"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Droppable Canvas - constrained to remaining height */}
                        <div className="flex-1 min-h-0 overflow-hidden relative">
                            <DroppableCanvas
                                key={activeTab.id} // Force remount on tab change
                                onLayoutChange={handleLayoutChange}
                                initialLayout={activeTab.layout}
                            />
                        </div>
                    </div>
                </div>

                {/* Unsaved Changes Dialog */}
                <Dialog open={blocker.state === "blocked"} onOpenChange={(open) => {
                    if (!open && blocker.state === "blocked") {
                        blocker.reset?.();
                    }
                }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Unsaved Changes</DialogTitle>
                            <DialogDescription>
                                You have unsaved changes. If you leave now, your changes will be lost.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-3 sm:gap-1">
                            <Button variant="outline" onClick={() => blocker.reset?.()}>
                                Stay on Page
                            </Button>
                            <Button variant="outline" onClick={() => blocker.proceed?.()}>
                                Leave Anyway
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DndProvider>
    );
}

