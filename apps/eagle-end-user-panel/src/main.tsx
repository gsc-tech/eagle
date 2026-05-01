import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { usePositionsStore, useAlertsStore } from "@gsc-tech/eagle-widget-library";

// Keep alerts in sync with position changes even when the calendar widget is not mounted.
usePositionsStore.subscribe((state, prev) => {
  if (state.marex !== prev.marex || state.excel !== prev.excel) {
    useAlertsStore.getState().refreshAlerts(state.getPosition);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
