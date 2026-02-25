import { useEffect, useState } from "react";
import { Render } from "@measured/puck";
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
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import axios from "axios"
import { widgetLibrary } from "@gsc-tech/eagle-widget-library"
import { extractTypes } from "@/helpers/utils";

type Dashboard = {
  dashboardID: string;
  name: string;
  draftLayout: any;
  publishedLayout: any;
  componentMap: Record<string, string>
}

type FullPageGridProps = {
  children: React.ElementType;
  columns?: number;
  rowHeight?: number;
  gap?: number;
}

export const FullPageGrid: React.FC<FullPageGridProps> = ({ children: Children, columns = 24, rowHeight = 40, gap = 8 }) => {
  console.log(Children);
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      padding: "16px",
      backgroundColor: "#f3f4f6",
      boxSizing: "border-box"
    }}>
      <Children
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridAutoRows: `${rowHeight}px`,
          gap: `${gap}px`,
          width: "100%",
          minHeight: "calc(100vh - 32px)"
        }}
      />
    </div>
  );
};


export default function DashboardWorkspace() {
  const [open, setOpen] = useState(true)
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selected, setSelected] = useState<Dashboard>();
  const [componentConfig, setComponentConfig] = useState({});

  // later we would have user_id after login
  // const autoSave = async (instanceID: string, data: any) => {
  //   // console.log("Auto save");
  //   try {
  //     const res = await axios.post("http://localhost:900/widgets/save-state", {
  //       dashboardID: selected?.dashboardID,
  //       userID: "123", // would come from the authContext.
  //       instanceID: instanceID,
  //       state: data
  //     })
  //     console.log(res.data);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }
  // instance id wil be in dashboard layout and we will pass it to widgets while rendering as prop.!
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        const resp = await axios.get("http://localhost:9002/dashboards/end-user");
        const data = resp.data;
        setDashboards(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchDashboards()
  }, [])

  const handleSelect = (dashboard: Dashboard) => {
    const result = {
      FullPageGrid: {
        fields: {
          columns: {
            type: "number",
            label: "Grid Columns",
            min: 12,
            max: 48
          },
          rowHeight: {
            type: "number",
            label: "Row Height (px)",
            min: 20,
            max: 100
          },
          gap: {
            type: "number",
            label: "Gap (px)",
            min: 4,
            max: 32
          },
          children: {
            type: "slot",
          }
        },
        render: (props: any) => {
          return <FullPageGrid {...props} />
        }
      }
    }
    console.log(result);
    console.log(dashboard.componentMap);
    extractTypes(dashboard.publishedLayout, result, dashboard.componentMap, widgetLibrary);
    setSelected(dashboard);
    setComponentConfig(result);
  }



  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden data-[sidebar-open=true]:pl-0 data-[sidebar-collapsed=true]:pl-0">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarTrigger />
          </SidebarHeader>

          <SidebarContent>
            <Collapsible open={open} onOpenChange={setOpen}>
              <SidebarGroup>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="flex items-center cursor-pointer">
                    {open ? (<ChevronDown className="w-4 h-4 mr-1" />) : (<ChevronRight className="w-4 h-4 mr-1" />)}
                    Dashboards
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenu>
                    {dashboards.map((d) => (
                      <SidebarMenuItem key={d.dashboardID}>
                        <SidebarMenuButton onClick={() => handleSelect(d)} isActive={selected?.dashboardID === d.dashboardID}>
                          <LayoutDashboard className="w-4 h-4" />
                          <span>{d.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>

        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {selected !== undefined && componentConfig !== undefined &&
            <Render
              config={{ components: componentConfig }}
              data={selected?.publishedLayout} />
          }
        </div>
      </div>
    </SidebarProvider>
  );
}