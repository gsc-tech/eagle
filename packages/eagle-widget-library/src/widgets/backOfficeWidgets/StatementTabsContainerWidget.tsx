import React, { useMemo, useState } from "react";
import {
  useDeepAnalysisFinancialDataStore,
  useMeasureRegistryStore,
  useGroupColorStore,
  useLoadingStatusStore,
  buildChartsFromV2Config,
  type WidgetConfig,
  type ProductWiseSlice,
} from "@gsc-tech/backoffice-core";
import type { BaseWidgetProps } from "../../types";
import { WidgetContainer } from "../../components/WidgetContainer";
import { BackofficeDataTableWidget } from "../../backoffice/table/BackofficeDataTableWidget";

// ── Tab definitions ───────────────────────────────────────────────────────────

type Tab = "daily" | "weekly" | "monthly";

const STATEMENT_MEASURES: WidgetConfig["measures"] = [
  { kind: "column", name: "charges" },
  { kind: "column", name: "rebates" },
  { kind: "column", name: "volume" },
  { kind: "column", name: "grossPL" },
  { kind: "column", name: "transCost" },
  { kind: "column", name: "netPL" },
  { kind: "column", name: "netPLExclRebatesAndCharges" },
  { kind: "column", name: "traderOpeningBalance" },
  { kind: "column", name: "traderClosingBalance" },
];

const DEFAULT_CONFIGS: Record<Tab, WidgetConfig> = {
  daily: {
    id: "stc-daily",
    title: "Daily Statement",
    version: "v2",
    vizType: "data-table",
    datasetId: "financial",
    rowDimension: "time",
    groupByDimension: "date",
    showGroupByToggle: true,
    w: 9, h: 7, x: 0, y: 0,
    measures: [...STATEMENT_MEASURES, { kind: "column", name: "notes" }],
  },
  weekly: {
    id: "stc-weekly",
    title: "Weekly Statement",
    version: "v2",
    vizType: "data-table",
    datasetId: "financial:weekly",
    rowDimension: "time",
    groupByDimension: "date",
    showGroupByToggle: true,
    w: 9, h: 7, x: 0, y: 0,
    measures: STATEMENT_MEASURES,
  },
  monthly: {
    id: "stc-monthly",
    title: "Monthly Statement",
    version: "v2",
    vizType: "data-table",
    datasetId: "financial:monthly",
    rowDimension: "time",
    groupByDimension: "date",
    showGroupByToggle: true,
    w: 9, h: 7, x: 0, y: 0,
    measures: STATEMENT_MEASURES,
  },
};

const TABS: { key: Tab; label: string }[] = [
  { key: "daily",   label: "Daily" },
  { key: "weekly",  label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatementTabsContainerWidgetProps extends BaseWidgetProps {
  defaultTab?: Tab;
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="w-full h-full flex flex-col gap-2 p-3 animate-pulse">
      <div className="h-3 w-1/3 rounded bg-muted/40" />
      <div className="flex-1 rounded bg-muted/40" />
    </div>
  );
}

// ── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({
  config,
  onUpdate,
}: {
  config: WidgetConfig;
  onUpdate: (patch: Partial<WidgetConfig>) => void;
}) {
  const financialData = useDeepAnalysisFinancialDataStore((s) => s.data);
  const registryScalars = useMeasureRegistryStore((s) => s.scalars);
  const registryFormulas = useMeasureRegistryStore((s) => s.formulas);
  const registryExtendedColumns = useMeasureRegistryStore((s) => s.extendedColumns);
  const registryDerivedDatasets = useMeasureRegistryStore((s) => s.derivedDatasets);
  const groupColors = useGroupColorStore((s) => s.colors);
  const isLoading = useLoadingStatusStore((s) => s.isLoading);

  const charts = useMemo(() => buildChartsFromV2Config(
    config,
    financialData,
    {} as Record<"A" | "B" | "C" | "D", ProductWiseSlice>,
    useMeasureRegistryStore.getState(),
    ["A"],
  ), [
    config,
    financialData,
    registryScalars,
    registryFormulas,
    registryExtendedColumns,
    registryDerivedDatasets,
    groupColors,
  ]);

  if (isLoading) return <LoadingSkeleton />;
  if (charts.length === 0) return (
    <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">
      No data — apply filters via the topbar widget
    </div>
  );

  return (
    <BackofficeDataTableWidget
      widget={config}
      charts={charts}
      activeGroups={["A"]}
      groupColorTokens={{ A: "--chart-1" }}
      isEditing={true}
      onUpdate={(_id, patch) => onUpdate(patch)}
    />
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export const StatementTabsContainerWidget: React.FC<StatementTabsContainerWidgetProps> = ({
  darkMode = false,
  defaultTab = "daily",
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  // Per-tab config stored in state so edits (measure changes, groupBy toggles) persist
  // while the widget is mounted.
  const [configs, setConfigs] = useState<Record<Tab, WidgetConfig>>(DEFAULT_CONFIGS);

  const handleUpdate = (tab: Tab, patch: Partial<WidgetConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], ...patch },
    }));
  };

  return (
    <WidgetContainer title="Statement" darkMode={darkMode}>
      <div className="h-full flex flex-col">

        {/* Tab strip */}
        <div className="shrink-0 flex items-center gap-1 px-3 pt-2 pb-1 border-b border-border/20">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${
                activeTab === t.key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Table content — key forces remount on tab switch to reset sort/scroll */}
        <div className="flex-1 min-h-0">
          <TabPanel
            key={activeTab}
            config={configs[activeTab]}
            onUpdate={(patch) => handleUpdate(activeTab, patch)}
          />
        </div>

      </div>
    </WidgetContainer>
  );
};

export const StatementTabsContainerWidgetDef = {
  component: StatementTabsContainerWidget,
  name: "Statement Tabs",
  description: "Daily / Weekly / Monthly financial statement tables with BackOffice parity. Requires a BackOffice Topbar widget on the same dashboard.",
  defaultProps: {
    defaultTab: "daily" as Tab,
  },
  category: "BackOffice",
};
