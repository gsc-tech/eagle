import React, { useMemo } from "react";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import {
  useFinancialTimeInputStore,
  useFinancialTradingAccountsStore,
  useFilterModificationStatusStore,
  useLoadingStatusStore,
  fetchFinancialStatements,
  fetchDeepAnalysisStatements,
  getClient,
  type StatementParams,
} from "@gsc-tech/backoffice-core";
import type { BaseWidgetProps } from "../../types";
import { AccountSelectorPopover } from "./topbar/AccountSelectorPopover";
import { PresetButtons, PresetKey, getPresetRange } from "./topbar/PresetButtons";
import { DateFilterPanel } from "./topbar/DateFilterPanel";

dayjs.extend(weekOfYear);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BackOfficeTopbarWidgetProps extends BaseWidgetProps {
  /** Override the admin flag; defaults to localStorage "isAdmin" === "true". */
  isAdmin?: boolean;
  /** Account grouping field for the tree view. Defaults to "clearer". */
  groupingField?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildStatementParams(
  selectedAccounts: string[],
  tradingAccounts: any[],
  selectedYears: string[],
  selectedMonths: string[],
  selectedWeeks: string[],
  date: { from: dayjs.Dayjs | null; to: dayjs.Dayjs | null },
): StatementParams {
  const accounts = tradingAccounts
    .filter((a) => selectedAccounts.includes(a.nickname))
    .map((a) => ({
      // BackOffice uses `accountName` from the trading account object as the payload's `accountId`.
      accountId: a.accountName ?? a.nickname,
      clearingCorp: a.clearer ?? "",
      nickname: a.nickname,
    }));

  // year/month/week are always included (as empty arrays when not selected) to
  // match the BackOffice payload contract. Values stay as strings — no Number() cast.
  const timeInput: StatementParams["timeInput"] = {
    year: selectedYears,
    month: selectedMonths,
    week: selectedWeeks,
  };

  if (date.from) {
    if (date.to && !date.from.isSame(date.to, "day")) {
      timeInput.fromDate = date.from.format("YYYY-MM-DD");
      timeInput.toDate = date.to.format("YYYY-MM-DD");
    } else {
      timeInput.day = date.from.format("YYYY-MM-DD");
    }
  }

  return { accounts, timeInput };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BackOfficeTopbarWidget: React.FC<BackOfficeTopbarWidgetProps & { darkMode?: boolean }> = ({
  getFirebaseToken,
  isAdmin: isAdminProp,
  groupingField = "clearer",
}) => {
  const { tradingAccounts, selectedAccounts, setTradingAccounts, setSelectedAccounts } =
    useFinancialTradingAccountsStore();

  const {
    date, selectedYears, selectedMonths, selectedWeeks,
    setDate, setSelectedYears, setSelectedMonths, setSelectedWeeks, resetTimeFilters,
  } = useFinancialTimeInputStore();

  const { setLoading } = useLoadingStatusStore();
  const { isModified, setModified, setDebounceStart } = useFilterModificationStatusStore();

  const abortC = React.useRef<AbortController | null>(null);
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always holds latest filter values — read by scheduleSubmit at fire time.
  const latestArgs = React.useRef({ selectedAccounts, tradingAccounts, selectedYears, selectedMonths, selectedWeeks, date });
  React.useEffect(() => {
    latestArgs.current = { selectedAccounts, tradingAccounts, selectedYears, selectedMonths, selectedWeeks, date };
  });

  const isAdmin = isAdminProp ?? (typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true");

  // ── Bootstrap: fetch accounts + default date to YTD ──────────────────────
  React.useEffect(() => {
    setModified(false);
    if (!date.from && !date.to) {
      const ytd = getPresetRange("YTD");
      setDate({ from: ytd.from, to: ytd.to });
    }
    if (selectedAccounts.length === 0) {
      (async () => {
        try {
          const token = getFirebaseToken ? await getFirebaseToken() : null;
          const client = getClient();
          const { data } = await client.get("/user/tradingAccounts/", {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const accounts = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
          setTradingAccounts(accounts);
          if (accounts[0]?.nickname) setSelectedAccounts([accounts[0].nickname]);
        } catch (err) {
          console.error("[BackOfficeTopbarWidget] Failed to fetch trading accounts", err);
        }
      })();
    }
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  // Run once on mount only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-fetch once accounts are loaded.
  React.useEffect(() => {
    if (tradingAccounts.length > 0) submitNow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingAccounts]);

  // ── Debounced submit ──────────────────────────────────────────────────────
  const scheduleSubmit = React.useRef((delay: number) => {
    useFilterModificationStatusStore.getState().setDebounceStart(Date.now(), delay);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      submitNow();
      useFilterModificationStatusStore.getState().setModified(false);
    }, delay);
  }).current;

  function submitNow() {
    const { selectedAccounts, tradingAccounts, selectedYears, selectedMonths, selectedWeeks, date } =
      latestArgs.current;
    if (tradingAccounts.length === 0) return;
    abortC.current?.abort();
    abortC.current = new AbortController();
    const params = buildStatementParams(selectedAccounts, tradingAccounts, selectedYears, selectedMonths, selectedWeeks, date);
    // Populate both the flat store (legacy widgets) and group "A" of the deep analysis store
    // (FinancialAnalysisWidget reads from the deep analysis store with activeGroups=["A"]).
    Promise.all([
      fetchFinancialStatements(params, abortC.current.signal),
      fetchDeepAnalysisStatements("A", params, abortC.current.signal),
    ]).catch((err) => {
      if (err?.name !== "CanceledError") console.error("[BackOfficeTopbarWidget] Fetch failed", err);
    });
  }

  // ── Active preset detection ───────────────────────────────────────────────
  const activePreset = useMemo<PresetKey | null>(() => {
    if (!date.from || !date.to) return null;
    const PRESET_KEYS: PresetKey[] = ["1D", "1W", "1M", "YTD", "1Y", "MAX"];
    for (const key of PRESET_KEYS) {
      const range = getPresetRange(key);
      if (date.from.isSame(range.from, "day") && date.to.isSame(range.to, "day")) return key;
    }
    return null;
  }, [date]);

  // ── Dynamic week options (filtered by selected months) ───────────────────
  const [weeksOptions, setWeeksOptions] = React.useState(
    Array.from({ length: 53 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString() })),
  );

  React.useEffect(() => {
    if (selectedMonths.length === 0) {
      setWeeksOptions(Array.from({ length: 53 }, (_, i) => ({ value: (i + 1).toString(), label: (i + 1).toString() })));
    } else {
      setSelectedWeeks([]);
      const filtered: { value: string; label: string }[] = [];
      const seen = new Set<string>();
      for (let i = 1; i <= 53; i++) {
        const year = selectedYears.length > 0 ? parseInt(selectedYears[0]) : dayjs().year();
        const wStart = dayjs().year(year).week(i).day(1);
        const wEnd = dayjs().year(year).week(i).day(5);
        selectedMonths.forEach((m) => {
          const month = parseInt(m);
          const matches =
            (i === 1 && wEnd.year() === year && wEnd.month() + 1 === month) ||
            (i === 53 && wStart.year() === year && wStart.month() + 1 === month) ||
            wStart.month() + 1 === month;
          if (matches && !seen.has(i.toString())) {
            filtered.push({ value: i.toString(), label: i.toString() });
            seen.add(i.toString());
          }
        });
      }
      setWeeksOptions(filtered);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonths]);

  const yearOptions = useMemo(() => {
    const cur = dayjs().year();
    return Array.from({ length: cur - 2023 + 1 }, (_, i) => {
      const y = (cur - i).toString();
      return { value: y, label: y };
    });
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePreset = (key: PresetKey) => {
    const range = getPresetRange(key);
    resetTimeFilters();
    setDate({ from: range.from, to: range.to });
    setModified(true);
    scheduleSubmit(2000);
  };

  const handleDateRangeChange = (from: string, to: string) => {
    if (!from) return;
    resetTimeFilters();
    setDate({ from: dayjs(from), to: to ? dayjs(to) : dayjs(from) });
    setModified(true);
    scheduleSubmit(3200);
  };

  const handleYmwChange = (setter: (vals: string[]) => void, vals: string[]) => {
    setDate({ from: null, to: null });
    setter(vals);
    setModified(true);
    scheduleSubmit(2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex items-center gap-x-2 px-3 border-b border-border bg-background overflow-hidden">
      <AccountSelectorPopover
        tradingAccounts={tradingAccounts}
        selectedAccounts={selectedAccounts}
        onSelectionChange={(accounts) => {
          setSelectedAccounts(accounts);
          setModified(true);
          scheduleSubmit(3000);
        }}
        isAdmin={isAdmin}
        groupingField={groupingField}
      />

      {/* Separator */}
      <div className="w-px h-5 bg-border/60 shrink-0" />

      <PresetButtons activePreset={activePreset} onSelect={handlePreset} />

      <div className="w-px h-5 bg-border/60 shrink-0" />

      <DateFilterPanel
        date={date}
        onDateRangeChange={handleDateRangeChange}
        selectedYears={selectedYears}
        selectedMonths={selectedMonths}
        selectedWeeks={selectedWeeks}
        yearOptions={yearOptions}
        weeksOptions={weeksOptions}
        onYearChange={(vals) => handleYmwChange(setSelectedYears, vals)}
        onMonthChange={(vals) => handleYmwChange(setSelectedMonths, vals)}
        onWeekChange={(vals) => handleYmwChange(setSelectedWeeks, vals)}
        onClear={() => { resetTimeFilters(); setDate({ from: null, to: null }); setModified(true); }}
      />

      {/* Dirty-filter indicator */}
      {isModified && (
        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="Filters modified — fetching…" />
      )}

    </div>
  );
};

export const BackOfficeTopbarWidgetDef = {
  component: BackOfficeTopbarWidget,
  name: "BackOffice Topbar",
  description: "Account + date filter bar for BackOffice financial views. Writes to shared stores consumed by chart widgets.",
  defaultProps: { isTokenRequired: true },
  category: "BackOffice",
};
