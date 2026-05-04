"use client";

import React, { useCallback, useEffect, useState, useMemo, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  themeQuartz,
  CellStyleModule,
  RowStyleModule,
  type Module,
} from "ag-grid-community";

import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import { Search, ChevronLeft, ChevronRight, ChevronDown, Globe, Settings2, X, Clock } from "lucide-react";

// ─── AG Grid setup ─────────────────────────────────────────────────────────────

ModuleRegistry.registerModules([
  ClientSideRowModelModule as unknown as Module,
  CellStyleModule as unknown as Module,
  RowStyleModule as unknown as Module,
]);

const agDarkTheme = themeQuartz.withParams({
  backgroundColor: "#09090b",
  browserColorScheme: "dark",
  chromeBackgroundColor: { ref: "foregroundColor", mix: 0.07, onto: "backgroundColor" },
  foregroundColor: "#e4e4e7",
  oddRowBackgroundColor: "#09090b",
  rowHoverColor: "#18181b",
  borderColor: "#27272a",
  headerBackgroundColor: "#09090b",
  headerTextColor: "#71717a",
  headerFontSize: 11,
  rowHeight: 38,
  headerHeight: 34,
  fontSize: 12,
});

const agLightTheme = themeQuartz.withParams({
  backgroundColor: "#ffffff",
  browserColorScheme: "light",
  oddRowBackgroundColor: "#ffffff",
  rowHoverColor: "#fafafa",
  borderColor: "#f4f4f5",
  headerBackgroundColor: "#ffffff",
  headerTextColor: "#a1a1aa",
  headerFontSize: 11,
  rowHeight: 38,
  headerHeight: 34,
  fontSize: 12,
});

// ─── Static constants ─────────────────────────────────────────────────────────

const TODAY = new Date("2026-04-10T12:00:00Z");
const TODAY_STR = TODAY.toDateString();
const AG_ROW_HEIGHT = 38; // must match agDarkTheme / agLightTheme rowHeight

const COUNTRY_CODE_MAP: Record<string, string> = {
  US: "USD", UK: "GBP", EU: "EUR", AU: "AUD",
  CN: "CNY", JP: "JPY", CA: "CAD", CH: "CHF",
  NZ: "NZD", DE: "EUR", FR: "EUR", IT: "EUR",
  IN: "INR", BR: "BRL", MX: "MXN", KR: "KRW",
  SA: "SAR", ZA: "ZAR", AR: "ARS", TR: "TRY", ID: "IDR",
};

const FLAG_OVERRIDES: Record<string, string> = { eu: "eu", uk: "gb" };

const G20_CODES = new Set([
  "US", "UK", "EU", "AU", "CN", "JP", "CA", "DE", "FR", "IT",
  "IN", "BR", "MX", "KR", "SA", "ZA", "AR", "TR", "ID", "RU",
]);

interface TzOption { label: string; offset: number; iana: string; }
const TIMEZONES: TzOption[] = [
  { label: "UTC−12:00", offset: -720, iana: "Etc/GMT+12" },
  { label: "UTC−08:00 (PST)", offset: -480, iana: "America/Los_Angeles" },
  { label: "UTC−05:00 (EST)", offset: -300, iana: "America/New_York" },
  { label: "UTC−04:00 (AST)", offset: -240, iana: "America/Halifax" },
  { label: "UTC±00:00 (GMT)", offset: 0, iana: "Europe/London" },
  { label: "UTC+01:00 (CET)", offset: 60, iana: "Europe/Paris" },
  { label: "UTC+02:00 (EET)", offset: 120, iana: "Europe/Helsinki" },
  { label: "UTC+03:00 (MSK)", offset: 180, iana: "Europe/Moscow" },
  { label: "UTC+03:30 (IRST)", offset: 210, iana: "Asia/Tehran" },
  { label: "UTC+04:00 (GST)", offset: 240, iana: "Asia/Dubai" },
  { label: "UTC+04:30 (AFT)", offset: 270, iana: "Asia/Kabul" },
  { label: "UTC+05:00 (PKT)", offset: 300, iana: "Asia/Karachi" },
  { label: "UTC+05:30 (IST)", offset: 330, iana: "Asia/Kolkata" },
  { label: "UTC+06:00 (BST)", offset: 360, iana: "Asia/Dhaka" },
  { label: "UTC+07:00 (ICT)", offset: 420, iana: "Asia/Bangkok" },
  { label: "UTC+08:00 (CST)", offset: 480, iana: "Asia/Shanghai" },
  { label: "UTC+09:00 (JST)", offset: 540, iana: "Asia/Tokyo" },
  { label: "UTC+09:30 (ACST)", offset: 570, iana: "Australia/Darwin" },
  { label: "UTC+10:00 (AEST)", offset: 600, iana: "Australia/Sydney" },
  { label: "UTC+12:00 (NZST)", offset: 720, iana: "Pacific/Auckland" },
];

// Converts a raw "HH:MM" time string from UTC to a given offset (minutes)
function convertTime(rawTime: string, offsetMin: number): string {
  if (!rawTime || !rawTime.includes(":")) return rawTime;
  const [hStr, mStr] = rawTime.split(":");
  let totalMin = parseInt(hStr) * 60 + parseInt(mStr) + offsetMin;
  // normalize to 0–1439
  totalMin = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(totalMin / 60).toString().padStart(2, "0");
  const m = (totalMin % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

const IMPORTANCE_LEVELS: { label: string; value: number; color: string }[] = [
  { label: "High", value: 3, color: "#ef4444" },
  { label: "Medium", value: 2, color: "#f59e0b" },
  { label: "Low", value: 1, color: "#71717a" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
  id: string;
  datetime: string;
  date: string;
  time: string;
  country: string;
  event: string;
  importance: string;
  actual: string;
  forecast: string;
  previous: string;
  _impLevel: number;
  _flagUrl: string | null;
  _countryCode: string;
}

export interface EconomicCalendarWidgetProps extends BaseWidgetProps {
  defaultCountry?: string;
  defaultImportance?: "low" | "medium" | "high";
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getFlagUrl(code: string): string | null {
  if (!code || code === "—") return null;
  const c = code.toLowerCase();
  return `https://flagcdn.com/w40/${FLAG_OVERRIDES[c] ?? c}.png`;
}

function getCountryCode(code: string): string {
  if (!code || code === "—") return "—";
  return COUNTRY_CODE_MAP[code.toUpperCase()] ?? code.toUpperCase();
}

function importanceLevel(imp: string): number {
  const s = (imp ?? "").toLowerCase();
  if (s === "high" || s === "h" || s === "3") return 3;
  if (s === "medium" || s === "m" || s === "2") return 2;
  return 1;
}

function findEventsInResponse(obj: unknown): unknown[] {
  if (!obj) return [];
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === "object" && obj[0] !== null) {
      const f = obj[0] as Record<string, unknown>;
      if (f.event || f.id) return obj;
    }
    return obj.length > 0 ? findEventsInResponse(obj[0]) : [];
  }
  if (typeof obj === "object" && obj !== null) {
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.events)) return o.events;
    if (Array.isArray(o.data)) return o.data;
    if (o.data) return findEventsInResponse(o.data);
    if (o.events) return findEventsInResponse(o.events);
  }
  return [];
}

// ─── Cell Renderers (module-level = never recreated) ─────────────────────────

function ImpBarsRenderer(props: ICellRendererParams) {
  const level: number = props.value ?? 1;
  const color = level === 3 ? "#ef4444" : level === 2 ? "#f59e0b" : "#71717a";
  return (
    <div style={{ display: "flex", alignItems: "center", height: "100%", paddingLeft: 4 }}>
      <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 14 }}>
        {[1, 2, 3].map((b) => (
          <div key={b} style={{
            width: 4, height: `${b * 33}%`,
            borderRadius: "1px 1px 0 0",
            background: b <= level ? color : "rgba(113,113,122,0.2)",
          }} />
        ))}
      </div>
    </div>
  );
}

function CountryRenderer(props: ICellRendererParams) {
  const row = props.data as CalendarEvent;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      height: "100%", paddingLeft: 4
    }}>
      {row._flagUrl && (
        <img src={row._flagUrl}
          style={{ width: 22, height: 16, borderRadius: 2, objectFit: "cover", flexShrink: 0, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }}
          alt={row.country} loading="lazy" decoding="async"
        />
      )}
      <span style={{ fontSize: 11, fontWeight: 600, color: "#71717a", letterSpacing: "0.02em" }}>
        {row._countryCode}
      </span>
    </div>
  );
}

function EventRenderer(props: ICellRendererParams) {
  const row = props.data as CalendarEvent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{props.value}</span>
      {row._impLevel === 3 && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }} />
      )}
    </div>
  );
}

function DateGroupRenderer(props: ICellRendererParams) {
  return (
    <span style={{ fontSize: 11, fontWeight: 800, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {props.value}
    </span>
  );
}

// ─── Filter Popover ───────────────────────────────────────────────────────────

interface FilterPopoverProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}

function FilterPopover({ trigger, children, active }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updateCoords = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("scroll", updateCoords, true);
    window.addEventListener("resize", updateCoords);
    document.addEventListener("mousedown", handler);
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
      document.removeEventListener("mousedown", handler);
    };
  }, [open, updateCoords]);

  return (
    <div style={{ display: "inline-block" }}>
      <div ref={triggerRef} onClick={() => setOpen(o => !o)} style={{ cursor: "pointer" }}>
        {trigger}
      </div>
      {open && createPortal(
        <div ref={popoverRef} style={{
          position: "fixed", 
          top: coords.top + 6, 
          left: coords.left,
          zIndex: 9999,
          background: "#18181b", border: "1px solid #27272a",
          borderRadius: 10, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          minWidth: 220, overflow: "hidden",
          animation: "popoverIn 0.12s cubic-bezier(.16,1,.3,1)",
          // simplistic auto-alignment to right if too close to window edge
          transform: coords.left + 220 > window.innerWidth ? "translateX(-220px)" : "none"
        }}>
          {children}
          <style>{`@keyframes popoverIn { from { opacity:0; transform:translateY(-6px) scale(0.97);} to { opacity:1; transform:translateY(0) scale(1);} }`}</style>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Memoized Day Button ──────────────────────────────────────────────────────

const DayButton = memo(({ day, isSelected, isToday, darkMode, onClick }: {
  day: Date; isSelected: boolean; isToday: boolean; darkMode: boolean; onClick: () => void;
}) => {
  const accent = isSelected || isToday;
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 56,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "10px 4px",
        borderRight: "1px solid", borderRightColor: darkMode ? "#27272a" : "#f4f4f5",
        cursor: "pointer", background: isSelected ? (darkMode ? "#18181b" : "#fafafa") : "transparent",
        boxShadow: isSelected ? "inset 0 -2px 0 #3b82f6" : "none",
        position: "relative", border: "none", outline: "none",
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: accent ? "#3b82f6" : "#71717a" }}>
        {day.toLocaleDateString("en-US", { weekday: "short" })}
      </span>
      <span style={{ fontSize: 14, fontWeight: 900, marginTop: 3, color: accent ? "#3b82f6" : darkMode ? "#a1a1aa" : "#52525b" }}>
        {day.getDate()}
      </span>
      {isToday && !isSelected && (
        <span style={{ position: "absolute", bottom: 4, width: 4, height: 4, borderRadius: "50%", background: "#3b82f6" }} />
      )}
    </button>
  );
});
DayButton.displayName = "DayButton";

// ─── Main Widget ──────────────────────────────────────────────────────────────

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
  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(() => {
    return initialWidgetState?.parameters || defaultParams;
  });

  useEffect(() => {
    if (onWidgetStateChange) {
      onWidgetStateChange({ parameters: currentParams });
    }
  }, [currentParams, onWidgetStateChange]);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [importanceFilter, setImportanceFilter] = useState<Set<number>>(() => new Set([1, 2, 3]));
  const [countryFilter, setCountryFilter] = useState<Set<string>>(() => new Set()); // empty = all
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(() => new Set()); // empty = all
  const [search, setSearch] = useState("");

  // ── Date navigation state ────────────────────────────────────────────────
  const [baseDate, setBaseDate] = useState(TODAY);
  const [selectedDate, setSelectedDate] = useState(TODAY);

  // ── AG Grid: direct DOM access for reliable scroll control ──────────────
  // gridWrapperRef goes on the <div> wrapping <AgGridReact>
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  const dateRowIndexRef = useRef<Record<string, number>>({});
  const suppressScrollSyncRef = useRef(false);

  // ── Timezone ─────────────────────────────────────────────────────────────
  const [selectedTz, setSelectedTz] = useState<TzOption>(
    () => TIMEZONES.find(t => t.iana === "Asia/Tehran") ?? TIMEZONES[8]
  );

  // ── Fetch ────────────────────────────────────────────────────────────────
  const { data: raw } = useWidgetData(apiUrl as string, { parameters: currentParams, pollInterval: 60000 });

  // Keep ALL events in a ref — no setState churn on parse
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

  // ── Unique countries and categories ───────────────────────────────────────
  const availableCountries = useMemo<string[]>(() => {
    const set = new Set<string>();
    allEventsRef.current.forEach(e => set.add(e.country));
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  const availableCategories = useMemo<string[]>(() => {
    const set = new Set<string>();
    allEventsRef.current.forEach(e => {
      if ((e as any).category) set.add((e as any).category);
    });
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  // ── Week calculations ────────────────────────────────────────────────────
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

  // ── Apply all filters to current week events ─────────────────────────────
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

  // ── Build AG Grid rowData with date-group sentinel rows ──────────────────
  // tzOffset drives time conversion and is declared before the useMemo that uses it
  const tzOffset = selectedTz.offset;

  const { rowData, colDefs } = useMemo(() => {
    const byDate: Record<string, CalendarEvent[]> = {};
    weekEvents.forEach(e => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    const rows: any[] = [];
    const newDateRowIndex: Record<string, number> = {};

    Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, evts]) => {
        const dateObj = new Date(date + "T00:00:00Z");
        newDateRowIndex[date] = rows.length;
        rows.push({
          _isDateRow: true,
          id: `__date__${date}`,
          _date: date,
          event: dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        });
        // Convert time to selected timezone before pushing
        evts.forEach(e => rows.push({
          ...e,
          _date: date,
          time: convertTime(e.time, tzOffset),
        }));
      });

    dateRowIndexRef.current = newDateRowIndex;

    const cols: ColDef[] = [
      {
        field: "time", headerName: "Time", width: 70, pinned: "left",
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : <span style={{ fontWeight: 700, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{p.value || "—"}</span>,
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
          p.data._isDateRow ? null : <span style={{ fontWeight: 800, color: p.value ? "inherit" : "#71717a" }}>{p.value || "—"}</span>,
      },
      {
        field: "forecast", headerName: "Forecast", width: 110,
        type: "numericColumn", headerClass: "ag-right-aligned-header",
        cellStyle: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : <span style={{ color: "#71717a" }}>{p.value || "—"}</span>,
      },
      {
        field: "previous", headerName: "Prior", width: 110,
        type: "numericColumn", headerClass: "ag-right-aligned-header",
        cellStyle: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
        cellRenderer: (p: ICellRendererParams) =>
          p.data._isDateRow ? null : <span style={{ color: "#71717a" }}>{p.value || "—"}</span>,
      },
    ];

    return { rowData: rows, colDefs: cols };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekEvents, tzOffset]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handlePrevWeek = useCallback(() => setBaseDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; }), []);
  const handleNextWeek = useCallback(() => setBaseDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; }), []);
  const handleToday = useCallback(() => { setBaseDate(TODAY); setSelectedDate(TODAY); }, []);

  // ── Click a day → direct DOM scroll to row ────────────────────────────────
  const handleDayClick = useCallback((day: Date) => {
    setSelectedDate(day);
    const dateKey = day.toISOString().split("T")[0];
    const rowIdx = dateRowIndexRef.current[dateKey];
    if (rowIdx !== undefined) {
      suppressScrollSyncRef.current = true;

      const gridBody = gridWrapperRef.current?.querySelector(".ag-body-viewport") as HTMLElement | null;
      if (gridBody) {
        gridBody.scrollTop = rowIdx * AG_ROW_HEIGHT;
      }

      // Release suppression after the browser finishes painting
      setTimeout(() => { suppressScrollSyncRef.current = false; }, 300);
    }
  }, []);

  const dayHandlers = useMemo(() => daysInWeek.map(d => () => handleDayClick(d)), [daysInWeek, handleDayClick]);

  const dayMeta = useMemo(() => daysInWeek.map(d => ({
    isSelected: d.toDateString() === selectedDate.toDateString(),
    isToday: d.toDateString() === TODAY_STR,
  })), [daysInWeek, selectedDate]);

  // ── Attach DOM scroll listener with capture phase on wrapper ──────────────
  // Catching scroll events at the wrapper level in capture phase reliably detects scrolling 
  // on any inner virtualized child container without knowing its inner structural layout.
  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;

    // We target the inner viewport we know will be scrolling. If it isn't ready immediately,
    // we set it up lazily on the first capture scroll.
    let activeViewport: HTMLElement | null = null;

    const onScrollCapture = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.scrollHeight > target.clientHeight) {
        activeViewport = target; // Lock onto the scrolling element (the actual AG grid viewport)
      }
      if (!activeViewport || target !== activeViewport) return;

      if (suppressScrollSyncRef.current) return;
      const firstVisibleIdx = Math.floor(activeViewport.scrollTop / AG_ROW_HEIGHT);

      const dateRowIndex = dateRowIndexRef.current;
      let bestDate: string | null = null;
      let bestIdx = -1;
      for (const [date, idx] of Object.entries(dateRowIndex)) {
        if (idx <= firstVisibleIdx && idx > bestIdx) {
          bestIdx = idx;
          bestDate = date;
        }
      }
      if (bestDate) {
        const d = new Date(bestDate + "T00:00:00Z");
        setSelectedDate(prev => prev.toDateString() === d.toDateString() ? prev : d);
      }
    };

    wrapper.addEventListener("scroll", onScrollCapture, { passive: true, capture: true });
    return () => wrapper.removeEventListener("scroll", onScrollCapture, { capture: true });
  }, []);

  const onGridReady = useCallback(() => { }, []); // No-op now as scroll is handled by useEffect

  // ── AG Grid config ────────────────────────────────────────────────────────
  const getRowStyle = useCallback((params: any) => {
    if (params.data?._isDateRow) {
      return {
        background: darkMode ? "#111115" : "#f9f9fa",
        borderTop: `1px solid ${darkMode ? "#27272a" : "#e4e4e7"}`,
        borderBottom: `1px solid ${darkMode ? "#27272a" : "#e4e4e7"}`,
      };
    }
    return undefined;
  }, [darkMode]);

  const getRowId = useCallback((p: any) => p.data.id, []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: false, resizable: false, suppressMovable: true,
  }), []);

  // ── Country filter helpers ────────────────────────────────────────────────
  const toggleCountry = useCallback((code: string) => {
    setCountryFilter(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }, []);

  const applyG20Preset = useCallback(() => {
    setCountryFilter(prev => {
      const g20Available = availableCountries.filter(c => G20_CODES.has(c));
      const allG20Selected = g20Available.every(c => prev.has(c));
      if (allG20Selected) {
        // deselect G20
        const next = new Set(prev);
        g20Available.forEach(c => next.delete(c));
        return next;
      } else {
        return new Set([...prev, ...g20Available]);
      }
    });
  }, [availableCountries]);

  const toggleImportance = useCallback((level: number) => {
    setImportanceFilter(prev => {
      const next = new Set(prev);
      next.has(level) ? next.delete(level) : next.add(level);
      if (next.size === 0) return new Set([1, 2, 3]); // never empty
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setCategoryFilter(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const allImpSelected = importanceFilter.size === 3;
  const countryActive = countryFilter.size > 0;
  const categoryActive = categoryFilter.size > 0;
  const dk = darkMode;

  // ─── Chip style ────────────────────────────────────────────────────────
  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 5,
    padding: "4px 10px", borderRadius: 6,
    border: `1px solid ${active ? "#3b82f6" : (dk ? "#27272a" : "#e4e4e7")}`,
    background: active ? "rgba(59,130,246,0.12)" : "transparent",
    cursor: "pointer",
    color: active ? "#3b82f6" : (dk ? "#a1a1aa" : "#52525b"),
    fontSize: 11, fontWeight: 600,
  });

  return (
    <WidgetContainer
      title={title}
      parameters={parameters}
      onParametersChange={setCurrentParams}
      darkMode={darkMode}
      initialParameterValues={currentParams}
      onGroupedParametersChange={onGroupedParametersChange}
      groupedParametersValues={groupedParametersValues}
    >
      <div style={{
        display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
        background: dk ? "#09090b" : "#ffffff",
        color: dk ? "#e4e4e7" : "#18181b",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>

        {/* ── Scrollable Upper Region ── */}
        <div style={{ flexShrink: 0, overflowX: "auto", overflowY: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ minWidth: "max-content", display: "flex", flexDirection: "column" }}>

            {/* ── Toolbar ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "8px 14px",
              borderBottom: `1px solid ${dk ? "#27272a" : "#f4f4f5"}`,
              flexShrink: 0, gap: 8,
            }}>
              {/* Left: today */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button onClick={handleToday} style={{
                  padding: "3px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6,
                  border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
                  background: dk ? "#18181b" : "#fff",
                  color: dk ? "#a1a1aa" : "#52525b", cursor: "pointer",
                }}>Today</button>
              </div>

              {/* Center: week navigator */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <button onClick={handlePrevWeek} style={navBtnStyle(dk)}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 155, textAlign: "center" }}>{weekRangeLabel}</span>
                <button onClick={handleNextWeek} style={navBtnStyle(dk)}><ChevronRight size={15} /></button>
              </div>

              {/* Right: filters */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

                {/* Importance Filter */}
                <FilterPopover active={!allImpSelected} trigger={
                  <div style={chipStyle(!allImpSelected)}>
                    <Settings2 size={12} />
                    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 11 }}>
                      {[1, 2, 3].map(b => {
                        const on = importanceFilter.has(b);
                        const c = b === 3 ? "#ef4444" : b === 2 ? "#f59e0b" : "#71717a";
                        return (
                          <div key={b} style={{ width: 3, height: `${b * 33}%`, borderRadius: "1px 1px 0 0", background: on ? c : "rgba(113,113,122,0.2)" }} />
                        );
                      })}
                    </div>
                  </div>
                }>
                  <div style={{ padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#71717a", marginBottom: 8, letterSpacing: "0.06em" }}>Importance</div>
                    {IMPORTANCE_LEVELS.map(({ label, value, color }) => (
                      <label key={value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 2px", cursor: "pointer" }}>
                        <Checkbox checked={importanceFilter.has(value)} onChange={() => toggleImportance(value)} />
                        <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 13 }}>
                          {[1, 2, 3].map(b => (
                            <div key={b} style={{ width: 4, height: `${b * 33}%`, borderRadius: "1px 1px 0 0", background: b <= value ? color : "rgba(113,113,122,0.2)" }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 13, color: "#e4e4e7" }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </FilterPopover>

                {/* Country Filter */}
                <FilterPopover active={countryActive} trigger={
                  <div style={chipStyle(countryActive)}>
                    <Globe size={12} />
                    <span>{countryActive ? `${countryFilter.size} Countries` : "All Countries"}</span>
                    <ChevronDown size={10} />
                  </div>
                }>
                  <div style={{ maxHeight: 320, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#71717a", marginBottom: 8, letterSpacing: "0.06em" }}>Countries</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={applyG20Preset} style={{
                          padding: "3px 8px", fontSize: 10, fontWeight: 700, borderRadius: 4,
                          border: "1px solid #3b82f6", background: "rgba(59,130,246,0.12)",
                          color: "#3b82f6", cursor: "pointer",
                        }}>G20</button>
                        {countryActive && (
                          <button onClick={() => setCountryFilter(new Set())} style={{
                            padding: "3px 8px", fontSize: 10, fontWeight: 700, borderRadius: 4,
                            border: "1px solid #27272a", background: "transparent",
                            color: "#a1a1aa", cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                          }}><X size={9} /> Clear</button>
                        )}
                      </div>
                    </div>
                    <div style={{ overflowY: "auto", padding: "6px 14px 10px" }}>
                      {availableCountries.map(code => (
                        <label key={code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px", cursor: "pointer" }}>
                          <Checkbox checked={countryFilter.size === 0 || countryFilter.has(code)} onChange={() => toggleCountry(code)} />
                          {getFlagUrl(code) && <img src={getFlagUrl(code)!} style={{ width: 18, height: 12, borderRadius: 2, objectFit: "cover" }} alt={code} loading="lazy" />}
                          <span style={{ fontSize: 12, color: "#e4e4e7" }}>{code}</span>
                          <span style={{ fontSize: 10, color: "#71717a", marginLeft: "auto" }}>{getCountryCode(code)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </FilterPopover>

                {/* Category Filter */}
                {availableCategories.length > 0 && (
                  <FilterPopover active={categoryActive} trigger={
                    <div style={chipStyle(categoryActive)}>
                      <Settings2 size={12} />
                      <span>{categoryActive ? `${categoryFilter.size} Categories` : "All Categories"}</span>
                      <ChevronDown size={10} />
                    </div>
                  }>
                    <div style={{ maxHeight: 320, display: "flex", flexDirection: "column" }}>
                      <div style={{ padding: "10px 14px 6px", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#71717a", marginBottom: 8, letterSpacing: "0.06em" }}>Categories</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {categoryActive && (
                            <button onClick={() => setCategoryFilter(new Set())} style={{
                              padding: "3px 8px", fontSize: 10, fontWeight: 700, borderRadius: 4,
                              border: "1px solid #27272a", background: "transparent",
                              color: "#a1a1aa", cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
                            }}><X size={9} /> Clear</button>
                          )}
                        </div>
                      </div>
                      <div style={{ overflowY: "auto", padding: "6px 14px 10px" }}>
                        {availableCategories.map(cat => (
                          <label key={cat} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px", cursor: "pointer" }}>
                            <Checkbox checked={categoryFilter.size === 0 || categoryFilter.has(cat)} onChange={() => toggleCategory(cat)} />
                            <span style={{ fontSize: 12, color: "#e4e4e7" }}>{cat}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </FilterPopover>
                )}

                {/* Timezone */}
                <FilterPopover active={false} trigger={
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", borderLeft: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`, paddingLeft: 10, marginLeft: 2, cursor: "pointer" }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "#71717a" }}>Timezone</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: "#3b82f6" }}>
                      <Clock size={10} />
                      {selectedTz.label.split(" ")[0]} <ChevronDown size={11} />
                    </div>
                  </div>
                }>
                  <div style={{ padding: "8px 0", maxHeight: 320, overflowY: "auto" }}>
                    <div style={{ padding: "4px 14px 8px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#71717a", letterSpacing: "0.06em" }}>Select Timezone</div>
                    {TIMEZONES.map(tz => (
                      <div
                        key={tz.iana}
                        onClick={() => setSelectedTz(tz)}
                        style={{
                          padding: "7px 14px", fontSize: 12, cursor: "pointer",
                          fontWeight: selectedTz.iana === tz.iana ? 700 : 400,
                          color: selectedTz.iana === tz.iana ? "#3b82f6" : "#e4e4e7",
                          background: selectedTz.iana === tz.iana ? "rgba(59,130,246,0.1)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                        }}
                      >
                        <span>{tz.label}</span>
                        {selectedTz.iana === tz.iana && <span style={{ fontSize: 9, color: "#3b82f6" }}>✓</span>}
                      </div>
                    ))}
                  </div>
                </FilterPopover>
              </div>
            </div>

            {/* ── Day Navigator ── */}
            <div style={{
              display: "flex",
              borderBottom: `1px solid ${dk ? "#27272a" : "#f4f4f5"}`,
              flexShrink: 0,
            }}>
              {daysInWeek.map((d, i) => (
                <DayButton key={i} day={d}
                  isSelected={dayMeta[i].isSelected} isToday={dayMeta[i].isToday}
                  darkMode={dk} onClick={dayHandlers[i]}
                />
              ))}
            </div>

          </div>
        </div>

        {/* ── Search bar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px",
          borderBottom: `1px solid ${dk ? "#27272a" : "#f4f4f5"}`,
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 8,
            border: `1px solid ${dk ? "#27272a" : "#e4e4e7"}`,
            background: dk ? "#18181b" : "#f8f8f9",
            flex: 1,
          }}>
            <Search size={13} color="#71717a" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by event name or country..."
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, flex: 1, fontWeight: 500, color: dk ? "#e4e4e7" : "#18181b" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
                <X size={12} color="#71717a" />
              </button>
            )}
          </div>
          {/* Active filter summary */}
          {(!allImpSelected || countryActive) && (
            <div style={{ display: "flex", gap: 4 }}>
              {!allImpSelected && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                  Imp: {Array.from(importanceFilter).map(l => IMPORTANCE_LEVELS.find(x => x.value === l)?.label).join(", ")}
                </span>
              )}
              {countryActive && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(59,130,246,0.15)", color: "#3b82f6" }}>
                  {countryFilter.size} {countryFilter.size === 1 ? "country" : "countries"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── AG Grid ── */}
        <div ref={gridWrapperRef} style={{ flex: 1, minHeight: 0 }}>
          {rowData.length > 0 ? (
            <AgGridReact
              theme={dk ? agDarkTheme : agLightTheme}
              rowData={rowData}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              getRowId={getRowId}
              getRowStyle={getRowStyle}
              onGridReady={onGridReady}
              suppressCellFocus
              reactiveCustomComponents
              domLayout="normal"
              rowBuffer={20}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: dk ? "#18181b" : "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Search size={20} color="#71717a" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#71717a" }}>No events match the current filters.</span>
              <button onClick={() => { setImportanceFilter(new Set([1, 2, 3])); setCountryFilter(new Set()); setSearch(""); }}
                style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </WidgetContainer>
  );
};

// ─── Micro helpers ────────────────────────────────────────────────────────────

function navBtnStyle(dk: boolean): React.CSSProperties {
  return {
    padding: 5, borderRadius: 6, border: "none", background: "transparent",
    cursor: "pointer", color: dk ? "#a1a1aa" : "#52525b",
    display: "flex", alignItems: "center",
  };
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={onChange}
      style={{
        flexShrink: 0, width: 14, height: 14, borderRadius: 3,
        border: `1.5px solid ${checked ? "#3b82f6" : "#4b5563"}`,
        background: checked ? "#3b82f6" : "transparent",
        display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}
    >
      {checked && (
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

export const EconomicCalendarWidgetDef = { component: EconomicCalendarWidget };
export default EconomicCalendarWidget;
