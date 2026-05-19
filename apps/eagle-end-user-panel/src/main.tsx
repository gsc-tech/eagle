import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { usePositionsStore, useAlertsStore } from "@gsc-tech/eagle-widget-library";

// Keep alerts in sync with position changes even when the calendar widget is not mounted.
usePositionsStore.subscribe((state, prev) => {
  if (state.marex !== prev.marex || state.excel !== prev.excel) {
    useAlertsStore.getState().refreshAlerts(state.getPosition);
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);