import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { usePositionsStore, useAlertsStore } from "@gsc-tech/eagle-widget-library";
import {
  init as initBackOfficeClient,
  useMeasureRegistryStore,
  DEFAULT_SCALARS,
  DEFAULT_EXTENDED_COLUMNS,
  DEFAULT_FORMULAS,
} from "@gsc-tech/backoffice-core";
import { getAuth } from "firebase/auth";

// Initialise the backoffice API client once so all backoffice widgets can
// call getClient() without ever seeing the "not initialised" error.
initBackOfficeClient({
  baseUrl: (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "http://192.168.0.74:8005/backoffice",
  getFirebaseToken: async () => {
    try {
      const user = getAuth().currentUser;
      return user ? await user.getIdToken(false) : null;
    } catch {
      return null;
    }
  },
});

// Seed default scalars / extended columns / formulas into the measure registry
// so KPI cards and formula measures work out of the box on first load.
// addScalar / addExtendedColumn / addFormula are all no-ops when the name already exists.
{
  const { addScalar, addExtendedColumn, addFormula } = useMeasureRegistryStore.getState();
  DEFAULT_SCALARS.forEach(addScalar);
  DEFAULT_EXTENDED_COLUMNS.forEach(addExtendedColumn);
  DEFAULT_FORMULAS.forEach(addFormula);
}

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