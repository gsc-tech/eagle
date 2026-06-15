"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Search, X, ChevronDown,
  Calendar, Package, Layers, TrendingUp, RefreshCw,
} from "lucide-react";
import type { ParameterValues } from "../../types";
import { useWidgetData } from "../../hooks/useWidgetData";
import { useParameterDefaults } from "../../hooks/useParameterDefaults";
import { WidgetContainer } from "../../components/WidgetContainer";
import { usePositionsStore } from "../../store/positionsStore";
import { useAlertsStore } from "../../store/alertsStore";
import {
  type ExpiryCalendarWidgetProps, type ExpiryEvent, type ViewMode,
  GROUP_ORDER, PRODUCT_GROUPS,
  getToday, toDateKey, isoToLocal, parseApiResponse, getPositionForEvent, getGroupConfig,
} from "./expiryCalendarConfig";
import {
  FilterPopover, CB, Chip, GroupDot, ViewModeToggle,
  DayCell, DayDetailPanel, UpcomingItem, Legend,
} from "./ExpiryCalendarParts";

export { type ExpiryCalendarWidgetProps };

export const ExpiryCalendarWidget: React.FC<ExpiryCalendarWidgetProps & { darkMode?: boolean }> = ({
  apiUrl,
  title = "Expiry Calendar",
  parameters = [],
  darkMode = true,
  staticData,
  productGroupOverride,
  onGroupedParametersChange,
  groupedParametersValues,
  initialWidgetState,
}) => {
  const dk = darkMode;

  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(
    () => initialWidgetState?.parameters ?? defaultParams
  );

  const today    = useMemo(() => getToday(), []);
  const todayKey = useMemo(() => toDateKey(today), [today]);

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });
  const viewYear  = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [viewMode, setViewMode]   = useState<ViewMode>("both");
  const [sidebarShowAll, setSidebarShowAll] = useState(false);
  const [search,         setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(() => new Set());
  const [symbolFilter,   setSymbolFilter]   = useState<Set<string>>(() => new Set());

  const fetchUrl = useMemo(() => {
    if (!apiUrl) return "__noop__";
    try {
      const u = new URL(apiUrl);
      u.searchParams.set("year", String(viewYear));
      return u.toString();
    } catch {
      const sep = apiUrl.includes("?") ? "&" : "?";
      return `${apiUrl}${sep}year=${viewYear}`;
    }
  }, [apiUrl, viewYear]);

  const shouldFetch = !staticData && !!apiUrl;
  const { data: raw } = useWidgetData(
    shouldFetch ? fetchUrl : "__noop__",
    { parameters: currentParams, pollInterval: 0 }
  );

  const allEventsRef  = useRef<ExpiryEvent[]>([]);
  const yearCacheRef  = useRef<Record<number, ExpiryEvent[]>>({});
  const [parseVersion, setParseVersion] = useState(0);

  useEffect(() => {
    if (!staticData) return;
    allEventsRef.current = parseApiResponse(staticData, productGroupOverride);
    setParseVersion(v => v + 1);
  }, [staticData, productGroupOverride]);

  useEffect(() => {
    if (!raw || (raw as unknown[]).length === 0) return;
    const parsed = parseApiResponse(raw, productGroupOverride);
    yearCacheRef.current[viewYear] = parsed;
    allEventsRef.current = ([] as ExpiryEvent[]).concat(...Object.values(yearCacheRef.current));
    setParseVersion(v => v + 1);
  }, [raw, productGroupOverride, viewYear]);

  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    allEventsRef.current.forEach(e => s.add(e._group));
    const known = GROUP_ORDER.filter(g => s.has(g));
    const dynamic = [...s].filter(g => !GROUP_ORDER.includes(g) && g !== "Other").sort();
    const other = s.has("Other") ? ["Other"] : [];
    return [...known, ...dynamic, ...other];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  const availableSymbols = useMemo(() => {
    const s = new Set<string>();
    allEventsRef.current.forEach(e => s.add(e.symbol));
    return Array.from(s).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEventsRef.current.filter(e => {
      if (viewMode !== "both" && e.dateType !== viewMode) return false;
      if (categoryFilter.size > 0 && !categoryFilter.has(e._group)) return false;
      if (symbolFilter.size > 0   && !symbolFilter.has(e.symbol))   return false;
      if (q) {
        const symbolMatch = e.symbol.toLowerCase().includes(q);
        const codeMatch   = e.contractCode.toLowerCase().includes(q);
        if (q.length <= 2) {
          if (!symbolMatch && !codeMatch) return false;
        } else {
          const productMatch  = e.productName.toLowerCase().includes(q);
          const exchangeMatch = e.exchange.toLowerCase().includes(q);
          if (!symbolMatch && !codeMatch && !productMatch && !exchangeMatch) return false;
        }
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion, viewMode, search, categoryFilter, symbolFilter]);

  const eventsByDate = useMemo<Record<string, ExpiryEvent[]>>(() => {
    const map: Record<string, ExpiryEvent[]> = {};
    filteredEvents.forEach(e => { (map[e.date] ??= []).push(e); });
    return map;
  }, [filteredEvents]);

  const getPosition       = usePositionsStore((s) => s.getPosition);
  const posMarex          = usePositionsStore((s) => s.marex);
  const posExcel          = usePositionsStore((s) => s.excel);
  const setCalendarEvents = useAlertsStore((s) => s.setCalendarEvents);
  const refreshAlerts     = useAlertsStore((s) => s.refreshAlerts);

  const positionDateKeys = useMemo(() => {
    const keys = new Set<string>();
    Object.entries(eventsByDate).forEach(([dateKey, evts]) => {
      if (evts.some(e => getPositionForEvent(e, getPosition).active !== 0)) {
        keys.add(dateKey);
      }
    });
    return keys;
  }, [eventsByDate, getPosition, posMarex, posExcel]);

  useEffect(() => {
    setCalendarEvents(filteredEvents);
    refreshAlerts(getPosition);
  }, [filteredEvents, getPosition, setCalendarEvents, refreshAlerts, posMarex, posExcel]);

  const upcomingDates = useMemo(() => {
    return Object.keys(eventsByDate)
      .filter(key => {
        if (!sidebarShowAll) {
          return key.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`);
        }
        return true;
      })
      .sort()
      .map(key => ({ key, events: eventsByDate[key] }));
  }, [eventsByDate, sidebarShowAll, viewYear, viewMonth]);

  const monthLabel = useMemo(
    () => new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [viewYear, viewMonth]
  );

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
    setSelectedDateKey(null);
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
    setSelectedDateKey(null);
  }, []);

  const handleToday = useCallback(() => {
    const d = new Date(today); d.setDate(1);
    setViewDate(d);
    setSelectedDateKey(todayKey);
  }, [today, todayKey]);

  const gridCells = useMemo(() => {
    const cells: { day: number; dateKey: string; isCurrentMonth: boolean }[] = [];
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const jsDay0 = firstOfMonth.getDay();
    const daysBack = jsDay0 === 0 ? 6 : jsDay0 - 1;
    const startDate = new Date(viewYear, viewMonth, 1 - daysBack);
    const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const jsDay1 = lastOfMonth.getDay();
    const fwdMap: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 0, 6: 6 };
    const endDate = new Date(lastOfMonth);
    endDate.setDate(lastOfMonth.getDate() + fwdMap[jsDay1]);
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) {
        const d = cur.getDate(), y = cur.getFullYear(), m = cur.getMonth();
        cells.push({
          day: d,
          dateKey: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          isCurrentMonth: m === viewMonth && y === viewYear,
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [viewYear, viewMonth]);

  const selectedEvents = selectedDateKey ? (eventsByDate[selectedDateKey] ?? []) : [];
  const selectedDate   = selectedDateKey ? isoToLocal(selectedDateKey) : null;
  const hasActiveFilters = categoryFilter.size > 0 || symbolFilter.size > 0 || search.trim().length > 0;
  const clearFilters = useCallback(() => { setCategoryFilter(new Set()); setSymbolFilter(new Set()); setSearch(""); }, []);
  const totalInView  = filteredEvents.length;
  const expTotal     = filteredEvents.filter(e => e.dateType === "expiry").length;
  const ftdTotal     = filteredEvents.filter(e => e.dateType === "ftd").length;
  const isYearCached = !!yearCacheRef.current[viewYear];
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <WidgetContainer
      title={title}
      parameters={parameters}
      onParametersChange={setCurrentParams}
      darkMode={dk}
      initialParameterValues={currentParams}
      onGroupedParametersChange={onGroupedParametersChange}
      groupedParametersValues={groupedParametersValues}
    >
      <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-gray-200 dark:border-zinc-800 shrink-0 flex-wrap bg-gray-50 dark:bg-zinc-950">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-md bg-transparent border-none cursor-pointer text-gray-500 dark:text-zinc-400 flex items-center hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-extrabold min-w-[150px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-md bg-transparent border-none cursor-pointer text-gray-500 dark:text-zinc-400 flex items-center hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight size={17} />
          </button>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 text-xs font-bold rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 cursor-pointer shadow-sm dark:shadow-none hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Today
          </button>
          {shouldFetch && !isYearCached && (
            <span className="text-[9px] font-bold text-amber-500 flex items-center gap-1">
              <RefreshCw size={9} className="animate-spin" />
              Fetching {viewYear}…
            </span>
          )}
          <div className="flex-1" />
          {totalInView > 0 && (
            <div className="flex gap-1">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                {totalInView}
              </span>
              {expTotal > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-500">
                  {expTotal} EXP
                </span>
              )}
              {ftdTotal > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500">
                  {ftdTotal} FTD
                </span>
              )}
            </div>
          )}
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 min-w-[110px] max-w-[150px] shadow-sm dark:shadow-none">
            <Search size={10} className="text-gray-400 dark:text-zinc-500 shrink-0" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="bg-transparent border-none outline-none text-xs font-medium flex-1 min-w-0 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="bg-transparent border-none cursor-pointer p-0 flex items-center">
                <X size={9} className="text-gray-400 dark:text-zinc-500" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <FilterPopover trigger={
            <Chip active={categoryFilter.size > 0}>
              <Layers size={10} />
              {categoryFilter.size > 0 ? `${categoryFilter.size} Groups` : "Category"}
              <ChevronDown size={9} />
            </Chip>
          }>
            <div className="px-3.5 py-2.5 border-b border-gray-200 dark:border-zinc-700">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex justify-between items-center">
                Commodity Group
                {categoryFilter.size > 0 && (
                  <button
                    onClick={() => setCategoryFilter(new Set())}
                    className="bg-transparent border-none cursor-pointer text-blue-500 text-[10px] font-bold"
                  >Clear</button>
                )}
              </div>
            </div>
            <div className="px-3.5 py-2 pb-2.5">
              {availableGroups.map(g => {
                const cfg = getGroupConfig(g);
                const checked = categoryFilter.size === 0 || categoryFilter.has(g);
                return (
                  <label key={g} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <CB checked={checked} onChange={() => {
                      setCategoryFilter(prev => {
                        if (prev.size === 0) return new Set([g]);
                        const next = new Set(prev);
                        next.has(g) ? next.delete(g) : next.add(g);
                        return (next.size === 0 || next.size === availableGroups.length) ? new Set() : next;
                      });
                    }} />
                    <span className="text-xs font-semibold flex items-center gap-1 select-none" style={{ color: cfg.color }}>
                      <span>{cfg.icon}</span>{g}
                    </span>
                  </label>
                );
              })}
            </div>
          </FilterPopover>

          {/* Symbol filter */}
          <FilterPopover trigger={
            <Chip active={symbolFilter.size > 0}>
              <Package size={10} />
              {symbolFilter.size > 0 ? `${symbolFilter.size} Symbols` : "Symbol"}
              <ChevronDown size={9} />
            </Chip>
          }>
            <div className="px-3.5 py-2.5 border-b border-gray-200 dark:border-zinc-700">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex justify-between items-center">
                Products / Symbols
                {symbolFilter.size > 0 && (
                  <button
                    onClick={() => setSymbolFilter(new Set())}
                    className="bg-transparent border-none cursor-pointer text-blue-500 text-[10px] font-bold"
                  >Clear</button>
                )}
              </div>
            </div>
            <div className="max-h-[280px] overflow-y-auto px-3.5 py-2 pb-2.5 widget-scrollbar">
              {availableSymbols.map(sym => {
                const group = allEventsRef.current.find(e => e.symbol === sym)?._group ?? PRODUCT_GROUPS[sym]?.groupName ?? "Other";
                const cfg   = getGroupConfig(group);
                const checked = symbolFilter.size === 0 || symbolFilter.has(sym);
                const pName = allEventsRef.current.find(e => e.symbol === sym)?.productName ?? sym;
                return (
                  <label key={sym} className="flex items-center gap-2 py-1 cursor-pointer">
                    <CB checked={checked} onChange={() => {
                      setSymbolFilter(prev => {
                        if (prev.size === 0) return new Set([sym]);
                        const next = new Set(prev);
                        next.has(sym) ? next.delete(sym) : next.add(sym);
                        return (next.size === 0 || next.size === availableSymbols.length) ? new Set() : next;
                      });
                    }} />
                    <GroupDot group={group} size={6} />
                    <span className="text-[11px] font-extrabold min-w-[28px]" style={{ color: cfg.color }}>{sym}</span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-500 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{pName}</span>
                  </label>
                );
              })}
            </div>
          </FilterPopover>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-md border border-gray-200 dark:border-zinc-700 bg-transparent text-gray-400 dark:text-zinc-500 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={8} />Reset
            </button>
          )}
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 min-h-0 flex overflow-hidden">

          {/* ── Upcoming sidebar ── */}
          <div className="w-[186px] shrink-0 border-r border-gray-200 dark:border-zinc-800 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 border-b border-gray-200 dark:border-zinc-800 shrink-0 bg-gray-50 dark:bg-zinc-950">
              <div className="flex items-center justify-between">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                  <TrendingUp size={9} />
                  {sidebarShowAll
                    ? "All Dates"
                    : new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <button
                  onClick={() => setSidebarShowAll(v => !v)}
                  className={`px-1 py-0.5 text-[8px] font-bold rounded border cursor-pointer transition-colors
                    ${sidebarShowAll
                      ? "border-blue-500 bg-blue-500/10 text-blue-500"
                      : "border-gray-200 dark:border-zinc-700 bg-transparent text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
                    }`}
                >
                  {sidebarShowAll ? "Month" : "All"}
                </button>
              </div>
              <div className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                {upcomingDates.length} dates
              </div>
            </div>
            <div className="flex-1 overflow-y-auto widget-scrollbar">
              {upcomingDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                  <Calendar size={22} className="text-gray-400 dark:text-zinc-500" />
                  <span className="text-[11px] text-gray-400 dark:text-zinc-500 text-center">
                    {parseVersion > 0 ? "No data for this month" : "Loading…"}
                  </span>
                </div>
              ) : (
                upcomingDates.map(({ key, events }) => (
                  <UpcomingItem
                    key={key} dateKey={key} events={events} dk={dk}
                    isSelected={selectedDateKey === key}
                    onClick={() => {
                      setSelectedDateKey(prev => prev === key ? null : key);
                      const d = isoToLocal(key);
                      const vd = new Date(d); vd.setDate(1);
                      setViewDate(vd);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Calendar grid ── */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <div className="grid grid-cols-5 px-2 pt-1.5 shrink-0 gap-1 bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-extrabold uppercase tracking-widest text-gray-500 dark:text-zinc-400 pb-1.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-5 [grid-auto-rows:1fr] p-1.5 gap-1 overflow-auto widget-scrollbar">
              {gridCells.map(({ day, dateKey, isCurrentMonth }) => (
                <DayCell
                  key={dateKey} day={day}
                  events={eventsByDate[dateKey] ?? []}
                  isToday={dateKey === todayKey}
                  isSelected={dateKey === selectedDateKey}
                  isCurrentMonth={isCurrentMonth}
                  hasPosition={positionDateKeys.has(dateKey)}
                  dk={dk}
                  onClick={() => {
                    if ((eventsByDate[dateKey] ?? []).length > 0)
                      setSelectedDateKey(prev => prev === dateKey ? null : dateKey);
                  }}
                />
              ))}
            </div>
            <Legend activeGroups={availableGroups} />
          </div>

          {/* ── Day detail panel ── */}
          {selectedDate && selectedEvents.length > 0 && (
            <div className="w-64 shrink-0 animate-slide-in-right">
              <DayDetailPanel
                date={selectedDate} events={selectedEvents} dk={dk}
                onClose={() => setSelectedDateKey(null)}
                getPosition={getPosition}
              />
            </div>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
};

export const ExpiryCalendarWidgetDef = { component: ExpiryCalendarWidget };
export default ExpiryCalendarWidget;
