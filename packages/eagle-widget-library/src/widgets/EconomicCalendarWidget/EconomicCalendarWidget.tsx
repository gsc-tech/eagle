"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Search, ChevronLeft, ChevronRight, ChevronDown, Globe, Settings2, X, Clock } from "lucide-react";
import type { ParameterValues } from "../../types";
import { useWidgetData } from "../../hooks/useWidgetData";
import { useParameterDefaults } from "../../hooks/useParameterDefaults";
import { WidgetContainer } from "../../components/WidgetContainer";
import {
  type EconomicCalendarWidgetProps, type CalendarEvent, type TzOption,
  agDarkTheme, agLightTheme,
  TODAY, TODAY_STR, AG_ROW_HEIGHT, G20_CODES, TIMEZONES, IMPORTANCE_LEVELS,
  getFlagUrl, getCountryCode, importanceLevel, convertTime, findEventsInResponse,
} from "./economicCalendarConfig";
import {
  FilterPopover, DayButton, navBtnCls, Checkbox,
  ImpBarsRenderer, CountryRenderer, EventRenderer, DateGroupRenderer,
} from "./EconomicCalendarParts";

export { type EconomicCalendarWidgetProps };

const chipCls = (active: boolean) =>
  `flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors
  ${active
    ? "border-blue-500 bg-blue-500/10 text-blue-500"
    : "border-gray-200 dark:border-zinc-700 bg-transparent text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900"
  }`;

export const EconomicCalendarWidget: React.FC<EconomicCalendarWidgetProps & { darkMode?: boolean }> = ({
  apiUrl = "http://localhost:8080/api/data",
  title,
  parameters,
  darkMode = false,
  onGroupedParametersChange,
  groupedParametersValues,
  initialWidgetState,
  onWidgetStateChange,
}) => {
  const dk = darkMode;
  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
    return initialWidgetState?.parameters || defaultParams;
  });

  useEffect(() => {
    if (onWidgetStateChange) onWidgetStateChange({ parameters: currentParams });
  }, [currentParams, onWidgetStateChange]);

  const [importanceFilter, setImportanceFilter] = useState<Set<number>>(() => new Set([1, 2, 3]));
  const [countryFilter, setCountryFilter] = useState<Set<string>>(() => new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [baseDate, setBaseDate] = useState(TODAY);
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const dateRowIndexRef = useRef<Record<string, number>>({});
  const suppressScrollSyncRef = useRef(false);

  const [selectedTz, setSelectedTz] = useState<TzOption>(
    () => TIMEZONES.find(t => t.iana === "Asia/Culcutta") ?? TIMEZONES[12]
  );

  const { data: raw } = useWidgetData(apiUrl as string, { parameters: currentParams, pollInterval: 60000 });

  const allEventsRef = useRef<CalendarEvent[]>([]);
  const [parseVersion, setParseVersion] = useState(0);

  useEffect(() => {
    if (!raw) return;
    const found = findEventsInResponse(raw);
    allEventsRef.current = (found as any[]).map((item: any, idx: number) => {
      const imp = (item.importance ?? item.impact ?? "low").toString().toLowerCase();
      const country = (item.country ?? "US").toString().toUpperCase();
      return {
        id: item.id ?? `evt_${idx}`,
        datetime: item.datetime ?? item.lastUpdatedAt ?? "",
        date: item.date ?? (item.datetime ?? "").split("T")[0] ?? "",
        time: item.time ?? "",
        country,
        category: item.category ?? "Economic",
        event: item.event ?? "Event",
        importance: imp,
        actual: item.actual != null ? String(item.actual) : "",
        forecast: item.forecast != null ? String(item.forecast) : "",
        previous: item.previous != null ? String(item.previous) : "",
        _impLevel: importanceLevel(imp),
        _flagUrl: getFlagUrl(country),
        _countryCode: getCountryCode(country),
      } as CalendarEvent;
    });
    setParseVersion(v => v + 1);
  }, [raw]);

  const availableCountries = useMemo<string[]>(() => {
    const set = new Set<string>();
    allEventsRef.current.forEach(e => set.add(e.country));
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  const availableCategories = useMemo<string[]>(() => {
    const set = new Set<string>();
    allEventsRef.current.forEach(e => { if ((e as any).category) set.add((e as any).category); });
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  const daysInWeek = useMemo<Date[]>(() => {
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - baseDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [baseDate]);

  const weekDateKeys = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    daysInWeek.forEach(d => s.add(d.toISOString().split("T")[0]));
    return s;
  }, [daysInWeek]);

  const weekRangeLabel = useMemo(() => {
    const s = daysInWeek[0], e = daysInWeek[6];
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [daysInWeek]);

  const weekEvents = useMemo<CalendarEvent[]>(() => {
    const q = search.trim().toLowerCase();
    return allEventsRef.current.filter(e => {
      if (!weekDateKeys.has(e.date)) return false;
      if (!importanceFilter.has(e._impLevel)) return false;
      if (countryFilter.size > 0 && !countryFilter.has(e.country)) return false;
      if (categoryFilter.size > 0 && !categoryFilter.has((e as any).category)) return false;
      if (q && !e.event.toLowerCase().includes(q) && !e.country.toLowerCase().includes(q)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDateKeys, search, importanceFilter, countryFilter, categoryFilter, parseVersion]);

  const tzOffset = selectedTz.offset;

  const { rowData, colDefs } = useMemo(() => {
    const byDate: Record<string, CalendarEvent[]> = {};
    weekEvents.forEach(e => { if (!byDate[e.date]) byDate[e.date] = []; byDate[e.date].push(e); });

    const rows: any[] = [];
    const newDateRowIndex: Record<string, number> = {};

    Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, evts]) => {
        const dateObj = new Date(date + "T00:00:00Z");
        newDateRowIndex[date] = rows.length;
        rows.push({
          _isDateRow: true, id: `__date__${date}`, _date: date,
          event: dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        });
        evts.forEach(e => rows.push({ ...e, _date: date, time: convertTime(e.time, tzOffset) }));
      });

    dateRowIndexRef.current = newDateRowIndex;

    const cols: ColDef[] = [
      {
        field: "time", headerName: "Time", width: 70, pinned: "left",
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : (
            <span className="font-bold text-xs tabular-nums">{p.value || "—"}</span>
          ),
      },
      {
        field: "_countryCode", headerName: "Country", width: 80,
        cellRenderer: (p: ICellRendererParams) => p.data._isDateRow ? null : <CountryRenderer {...p} />,
      },
      {
        field: "_impLevel", headerName: "Imp", width: 54,
        cellRenderer: (p: ICellRendererParams) => p.data._isDateRow ? null : <ImpBarsRenderer {...p} />,
      },
      {
        field: "event", headerName: "Event", flex: 1, minWidth: 180,
        cellRenderer: (p: ICellRendererParams) => p.data._isDateRow ? <DateGroupRenderer {...p} /> : <EventRenderer {...p} />,
      },
      {
        field: "actual", headerName: "Actual", width: 110,
        type: "numericColumn", headerClass: "ag-right-aligned-header",
        cellStyle: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : (
            <span className={`font-extrabold ${p.value ? "" : "text-zinc-500"}`}>{p.value || "—"}</span>
          ),
      },
      {
        field: "forecast", headerName: "Forecast", width: 110,
        type: "numericColumn", headerClass: "ag-right-aligned-header",
        cellStyle: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : (
            <span className="text-zinc-500">{p.value || "—"}</span>
          ),
      },
      {
        field: "previous", headerName: "Prior", width: 110,
        type: "numericColumn", headerClass: "ag-right-aligned-header",
        cellStyle: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : (
            <span className="text-zinc-500">{p.value || "—"}</span>
          ),
      },
    ];

    return { rowData: rows, colDefs: cols };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEvents, tzOffset]);

  const handlePrevWeek = useCallback(() => setBaseDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }), []);
  const handleNextWeek = useCallback(() => setBaseDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }), []);
  const handleToday = useCallback(() => { setBaseDate(TODAY); setSelectedDate(TODAY); }, []);

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDate(day);
    const dateKey = day.toISOString().split("T")[0];
    const rowIdx = dateRowIndexRef.current[dateKey];
    if (rowIdx !== undefined) {
      suppressScrollSyncRef.current = true;
      const gridBody = gridWrapperRef.current?.querySelector(".ag-body-viewport") as HTMLElement | null;
      if (gridBody) gridBody.scrollTop = rowIdx * AG_ROW_HEIGHT;
      setTimeout(() => { suppressScrollSyncRef.current = false; }, 300);
    }
  }, []);

  const dayHandlers = useMemo(() => daysInWeek.map(d => () => handleDayClick(d)), [daysInWeek, handleDayClick]);
  const dayMeta = useMemo(() => daysInWeek.map(d => ({
    isSelected: d.toDateString() === selectedDate.toDateString(),
    isToday: d.toDateString() === TODAY_STR,
  })), [daysInWeek, selectedDate]);

  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;
    let activeViewport: HTMLElement | null = null;
    const onScrollCapture = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.scrollHeight > target.clientHeight) activeViewport = target;
      if (!activeViewport || target !== activeViewport) return;
      if (suppressScrollSyncRef.current) return;
      const firstVisibleIdx = Math.floor(activeViewport.scrollTop / AG_ROW_HEIGHT);
      const dateRowIndex = dateRowIndexRef.current;
      let bestDate: string | null = null, bestIdx = -1;
      for (const [date, idx] of Object.entries(dateRowIndex)) {
        if (idx <= firstVisibleIdx && idx > bestIdx) { bestIdx = idx; bestDate = date; }
      }
      if (bestDate) {
        const d = new Date(bestDate + "T00:00:00Z");
        setSelectedDate(prev => prev.toDateString() === d.toDateString() ? prev : d);
      }
    };
    wrapper.addEventListener("scroll", onScrollCapture, { passive: true, capture: true });
    return () => wrapper.removeEventListener("scroll", onScrollCapture, { capture: true });
  }, []);

  const onGridReady = useCallback(() => { }, []);

  const getRowStyle = useCallback((params: any) => {
    if (params.data?._isDateRow) {
      return {
        background: dk ? "#111115" : "#f9f9fa",
        borderTop: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
        borderBottom: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
      };
    }
    return undefined;
  }, [dk]);

  const getRowId = useCallback((p: any) => p.data.id, []);
  const defaultColDef = useMemo<ColDef>(() => ({ sortable: false, resizable: false, suppressMovable: true }), []);

  const toggleCountry = useCallback((code: string) => {
    setCountryFilter(prev => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; });
  }, []);

  const applyG20Preset = useCallback(() => {
    setCountryFilter(prev => {
      const g20Available = availableCountries.filter(c => G20_CODES.has(c));
      const allG20Selected = g20Available.every(c => prev.has(c));
      if (allG20Selected) { const next = new Set(prev); g20Available.forEach(c => next.delete(c)); return next; }
      return new Set([...prev, ...g20Available]);
    });
  }, [availableCountries]);

  const toggleImportance = useCallback((level: number) => {
    setImportanceFilter(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      if (next.size === 0) return new Set([1, 2, 3]);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setCategoryFilter(prev => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; });
  }, []);

  const allImpSelected = importanceFilter.size === 3;
  const countryActive = countryFilter.size > 0;
  const categoryActive = categoryFilter.size > 0;

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

        {/* ── Scrollable Upper Region ── */}
        <div className="shrink-0 overflow-x-auto overflow-y-hidden flex flex-col">
          <div className="min-w-max flex flex-col">

            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-200 dark:border-zinc-800 shrink-0 gap-2">
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={handleToday}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-md border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button className={navBtnCls} onClick={handlePrevWeek}><ChevronLeft size={15} /></button>
                <span className="text-[13px] font-bold min-w-[155px] text-center">{weekRangeLabel}</span>
                <button className={navBtnCls} onClick={handleNextWeek}><ChevronRight size={15} /></button>
              </div>
              <div className="flex items-center gap-2 shrink-0">

                {/* Importance Filter */}
                <FilterPopover active={!allImpSelected} trigger={
                  <div className={chipCls(!allImpSelected)}>
                    <Settings2 size={12} />
                    <div className="flex gap-0.5 items-end h-[11px]">
                      {[1, 2, 3].map(b => {
                        const on = importanceFilter.has(b);
                        const c = b === 3 ? "#ef4444" : b === 2 ? "#f59e0b" : "#71717a";
                        return (
                          <div
                            key={b}
                            className="w-[3px] rounded-t-[1px]"
                            style={{ height: `${b * 33}%`, background: on ? c : "rgba(113,113,122,0.2)" }}
                          />
                        );
                      })}
                    </div>
                  </div>
                }>
                  <div className="px-3.5 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">Importance</div>
                    {IMPORTANCE_LEVELS.map(({ label, value, color }) => (
                      <label key={value} className="flex items-center gap-2.5 py-1.5 cursor-pointer">
                        <Checkbox checked={importanceFilter.has(value)} onChange={() => toggleImportance(value)} />
                        <div className="flex gap-[3px] items-end h-[13px]">
                          {[1, 2, 3].map(b => (
                            <div
                              key={b}
                              className="w-1 rounded-t-[1px]"
                              style={{ height: `${b * 33}%`, background: b <= value ? color : "rgba(113,113,122,0.2)" }}
                            />
                          ))}
                        </div>
                        <span className="text-[13px] text-gray-800 dark:text-zinc-200">{label}</span>
                      </label>
                    ))}
                  </div>
                </FilterPopover>

                {/* Country Filter */}
                <FilterPopover active={countryActive} trigger={
                  <div className={chipCls(countryActive)}>
                    <Globe size={12} />
                    <span>{countryActive ? `${countryFilter.size} Countries` : "All Countries"}</span>
                    <ChevronDown size={10} />
                  </div>
                }>
                  <div className="max-h-[320px] flex flex-col">
                    <div className="px-3.5 py-2.5 pb-1.5 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">Countries</div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={applyG20Preset}
                          className="px-2 py-0.5 text-[10px] font-bold rounded border border-blue-500 bg-blue-500/10 text-blue-500 cursor-pointer"
                        >G20</button>
                        {countryActive && (
                          <button
                            onClick={() => setCountryFilter(new Set())}
                            className="px-2 py-0.5 text-[10px] font-bold rounded border border-gray-200 dark:border-zinc-700 bg-transparent text-gray-500 dark:text-zinc-400 cursor-pointer flex items-center gap-0.5"
                          ><X size={9} /> Clear</button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-y-auto px-3.5 py-1.5 pb-2.5 widget-scrollbar">
                      {availableCountries.map(code => (
                        <label key={code} className="flex items-center gap-2.5 py-1 cursor-pointer">
                          <Checkbox checked={countryFilter.size === 0 || countryFilter.has(code)} onChange={() => toggleCountry(code)} />
                          {getFlagUrl(code) && (
                            <img src={getFlagUrl(code)!} className="w-[18px] h-[12px] rounded-[2px] object-cover" alt={code} loading="lazy" />
                          )}
                          <span className="text-xs text-gray-800 dark:text-zinc-200">{code}</span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto">{getCountryCode(code)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </FilterPopover>

                {/* Category Filter */}
                {availableCategories.length > 0 && (
                  <FilterPopover active={categoryActive} trigger={
                    <div className={chipCls(categoryActive)}>
                      <Settings2 size={12} />
                      <span>{categoryActive ? `${categoryFilter.size} Categories` : "All Categories"}</span>
                      <ChevronDown size={10} />
                    </div>
                  }>
                    <div className="max-h-[320px] flex flex-col">
                      <div className="px-3.5 py-2.5 pb-1.5 border-b border-gray-200 dark:border-zinc-800 shrink-0">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2">Categories</div>
                        {categoryActive && (
                          <button
                            onClick={() => setCategoryFilter(new Set())}
                            className="px-2 py-0.5 text-[10px] font-bold rounded border border-gray-200 dark:border-zinc-700 bg-transparent text-gray-500 dark:text-zinc-400 cursor-pointer flex items-center gap-0.5"
                          ><X size={9} /> Clear</button>
                        )}
                      </div>
                      <div className="overflow-y-auto px-3.5 py-1.5 pb-2.5 widget-scrollbar">
                        {availableCategories.map(cat => (
                          <label key={cat} className="flex items-center gap-2.5 py-1 cursor-pointer">
                            <Checkbox checked={categoryFilter.size === 0 || categoryFilter.has(cat)} onChange={() => toggleCategory(cat)} />
                            <span className="text-xs text-gray-800 dark:text-zinc-200">{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </FilterPopover>
                )}

                {/* Timezone */}
                <FilterPopover active={false} trigger={
                  <div className="flex flex-col items-end border-l border-gray-200 dark:border-zinc-800 pl-2.5 ml-0.5 cursor-pointer">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Timezone</span>
                    <div className="flex items-center gap-0.5 text-[11px] font-bold text-blue-500">
                      <Clock size={10} />
                      {selectedTz.label.split(" ")[0]} <ChevronDown size={11} />
                    </div>
                  </div>
                }>
                  <div className="py-2 max-h-[320px] overflow-y-auto widget-scrollbar">
                    <div className="px-3.5 py-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-zinc-500">Select Timezone</div>
                    {TIMEZONES.map(tz => (
                      <div
                        key={tz.iana}
                        onClick={() => setSelectedTz(tz)}
                        className={`px-3.5 py-1.5 text-xs cursor-pointer flex items-center justify-between gap-3 transition-colors
                          ${selectedTz.iana === tz.iana
                            ? "font-bold text-blue-500 bg-blue-500/10"
                            : "font-normal text-gray-800 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-900"
                          }`}
                      >
                        <span>{tz.label}</span>
                        {selectedTz.iana === tz.iana && <span className="text-[9px] text-blue-500">✓</span>}
                      </div>
                    ))}
                  </div>
                </FilterPopover>
              </div>
            </div>

            {/* ── Day Navigator ── */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 shrink-0">
              {daysInWeek.map((d, i) => (
                <DayButton
                  key={i} day={d}
                  isSelected={dayMeta[i].isSelected} isToday={dayMeta[i].isToday}
                  darkMode={dk} onClick={dayHandlers[i]}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Search bar ── */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 border-b border-gray-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 flex-1">
            <Search size={13} className="text-zinc-500 shrink-0" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by event name or country..."
              className="bg-transparent border-none outline-none text-xs font-medium flex-1 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
            {search && (
              <button onClick={() => setSearch("")} className="bg-transparent border-none cursor-pointer flex items-center p-0">
                <X size={12} className="text-zinc-500" />
              </button>
            )}
          </div>
          {(!allImpSelected || countryActive) && (
            <div className="flex gap-1">
              {!allImpSelected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                  Imp: {Array.from(importanceFilter).map(l => IMPORTANCE_LEVELS.find(x => x.value === l)?.label).join(", ")}
                </span>
              )}
              {countryActive && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
                  {countryFilter.size} {countryFilter.size === 1 ? "country" : "countries"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── AG Grid ── */}
        <div ref={gridWrapperRef} className="flex-1 min-h-0">
          {rowData.length > 0 ? (
            <AgGridReact
              theme={dk ? agDarkTheme : agLightTheme}
              rowData={rowData} columnDefs={colDefs} defaultColDef={defaultColDef}
              getRowId={getRowId} getRowStyle={getRowStyle} onGridReady={onGridReady}
              suppressCellFocus reactiveCustomComponents domLayout="normal" rowBuffer={20}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-zinc-900 flex items-center justify-center">
                <Search size={20} className="text-zinc-500" />
              </div>
              <span className="text-[13px] font-semibold text-zinc-500">No events match the current filters.</span>
              <button
                onClick={() => { setImportanceFilter(new Set([1, 2, 3])); setCountryFilter(new Set()); setSearch(""); }}
                className="text-[11px] font-bold text-blue-500 bg-transparent border-none cursor-pointer underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
};

export const EconomicCalendarWidgetDef = { component: EconomicCalendarWidget };
export default EconomicCalendarWidget;
