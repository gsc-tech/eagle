import { Puck, createUsePuck, type Config } from "@measured/puck"
import "@measured/puck/dist/index.css";
import { api } from "@/utils/apiClient";
import { generatePuckConfig } from "@/lib/puck/config-generator";
import { useState, useEffect } from "react";
import { widgetLibrary } from "@gsc-tech/eagle-widget-library"
import type { widgetGroup, widgetInfo } from "./widgets";
import type { BackendWidgetConfig } from "@/lib/puck/types";
import { useLocation } from "react-router-dom";

type FullPageGridProps = {
  children: React.ElementType;
  columns?: number;
  rowHeight?: number;
  gap?: number;
}

export const FullPageGrid: React.FC<FullPageGridProps> = ({ children: Content, columns = 24, rowHeight = 40, gap = 8 }) => {
  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      padding: "16px",
      backgroundColor: "#f3f4f6",
      boxSizing: "border-box"
    }}>
      <Content
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


export default function DashboardBuilder() {

  const { state } = useLocation();
  const initialData = state ? state.initialData : {};
  const dashboardId = state ? state.dashboardId : null;


  const usePuck = createUsePuck()
  const [backendConfigs, setBackendConfigs] = useState<BackendWidgetConfig[]>([]);



  useEffect(() => {
    const fetchWidgets = async () => {
      try {
        const resp = await api.get("/widget");
        const data: widgetGroup = resp.data;
        const configs = Object.values(data).flat().map((x: widgetInfo) => x.config)
        setBackendConfigs(configs)
        console.log("backend configs are", configs)
      } catch (error) {
        console.log(error);
      }
    }

    fetchWidgets();
  }, [])

  const saveDraft = async (data: any) => {
    try {
      console.log(data)
      const payload: any = {
        name: data["root"]["props"]["title"],
        draftLayout: data,
      }
      if (dashboardId !== null) {
        payload.dashboardId = dashboardId;
      }
      console.log(payload)
      const response = await api.post("/dashboard/draft", payload)
      if (response.status == 201) {
        alert("dashboard saved successfully");
      }
    } catch (error) {
      alert("Unable to save the dashboard");
      console.error("Error saving the dashboard", error);
    }
  };

  const publish = async (data: any, map: Record<string, string>) => {
    console.log(map)
    try {
      const response = await api.post("/dashboard/publish", {
        dashboardId: dashboardId,
        name: data["root"]["props"]["title"],
        publishedLayout: data,
        draftLayout: data,
        componentMap: map
      })
      if (response.status == 201) {
        alert("dashboard saved successfully");
      }
    } catch (error) {
      alert("Unable to save the dashboard");
      console.error("Error saving the dashboard", error);
    }
  }


  const { config, widgetNameToComponentNameMap } = generatePuckConfig(widgetLibrary, backendConfigs)

  return (
    <div style={{ height: "100vh" }}>
      <Puck
        config={config}
        overrides={{
          headerActions: () => {
            const appState = usePuck((s) => s.appState);

            return (
              <>
                <button style={{ marginRight: '8px' }} onClick={() => {
                  saveDraft(appState.data)
                }}>Save Draft</button>

                <button style={{
                  background: 'green',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }} onClick={() => {
                  publish(appState.data, widgetNameToComponentNameMap)
                }}>publish Dashboard</button>
              </>
            )


          }
        }}
        data={initialData}
      />
    </div>
  )
}
