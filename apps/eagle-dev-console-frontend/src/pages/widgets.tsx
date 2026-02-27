import { useEffect, useState } from "react";
import WidgetCard from "@/components/widget-card";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/utils/apiClient";
import { Label } from "@/components/ui/label";



export type widgetInfo = {
  widgetId: string;
  name: string;
  componentName: string;
  defaultProps: Record<string, any>;
}

export type widgetGroup = Record<string, widgetInfo[]>

export type widgetGroupWithStatus = Record<string, {
  widgets: widgetInfo[];
  isConnected: boolean;
}>

export default function Widgets() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const [widgetGroups, setWidgetGroups] = useState<widgetGroup>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWidget, setSelectedWidget] = useState<widgetInfo | null>(null);
  const [configJson, setConfigJson] = useState("");
  const [editName, setEditName] = useState("");
  const [editComponentName, setEditComponentName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchWidgets = async () => {
    try {
      const response = await api.get("/widget")
      const data = response.data
      setWidgetGroups(data)
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    fetchWidgets();
  }, [])

  const handleRefresh = () => {
    fetchWidgets();
  }

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleSettingsClick = (widget: widgetInfo) => {
    setSelectedWidget(widget);
    setEditName(widget.name);
    setEditComponentName(widget.componentName);
    setConfigJson(JSON.stringify(widget.defaultProps, null, 2));
    setIsModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedWidget) return;
    try {
      const parsedConfig = JSON.parse(configJson);
      console.log(selectedWidget.widgetId);
      await api.put(`/widget/${selectedWidget.widgetId}`, {
        widgetInfo: {
          name: editName,
          componentName: editComponentName,
          defaultProps: parsedConfig
        }
      });
      fetchWidgets();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save config", error);
      // You might want to show a toast notification here
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Widgets
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="rounded-lg hover:bg-accent/80 border-border/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
          <p className="text-muted-foreground text-base mb-6">
            Widgets are automatically discovered from connected backends
          </p>

          <Input
            placeholder="Search for a widget..."
            className="max-w-md rounded-xl border-border/50 bg-card/50 backdrop-blur-sm focus:bg-card transition-colors"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Widget Groups */}
        <div className="space-y-6">
          {Object.entries(widgetGroups).map(([group, widgets]) => {
            const filteredWidgets = widgets.filter(widget =>
              widget.name.toLowerCase().includes(searchQuery.toLowerCase())
            );

            return (
              <div key={group} className="space-y-4">
                <button
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-3 font-semibold text-lg text-foreground hover:text-primary transition-colors group/btn"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 group-hover/btn:bg-primary/20 transition-colors">
                    {openGroups[group] ? (
                      <ChevronDown className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  {group}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({filteredWidgets.length})
                  </span>
                </button>

                {openGroups[group] && (
                  <div className="space-y-3 pl-2">
                    {filteredWidgets.map((widget, idx) => (
                      <WidgetCard
                        key={idx}
                        name={widget.name}
                        description=""
                        status="active"
                        onSettings={() => handleSettingsClick(widget)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Edit Config Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Widget Config: {selectedWidget?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto py-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="widget-name">Name</Label>
                <Input
                  id="widget-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Widget Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component-name">Component Name</Label>
                <Input
                  id="component-name"
                  value={editComponentName}
                  onChange={(e) => setEditComponentName(e.target.value)}
                  placeholder="Component Name"
                />
              </div>
              <div className="space-y-2 flex flex-col min-h-[300px]">
                <Label htmlFor="default-props">Default Props (JSON)</Label>
                <textarea
                  id="default-props"
                  className="flex-1 w-full p-4 font-mono text-sm bg-muted/50 rounded-md border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={configJson}
                  onChange={(e) => setConfigJson(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
