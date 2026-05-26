import React, { useMemo, useRef, useState } from "react";
import { useFinancialDataStore, useLoadingStatusStore } from "@gsc-tech/backoffice-core";
import type { BaseWidgetProps } from "../../types";
import { WidgetContainer } from "../../components/WidgetContainer";

// ── Types ─────────────────────────────────────────────────────────────────────

type Granularity = "daily" | "weekly" | "monthly";
// Which identifier column to display per row
type ViewMode = "clearingCorp" | "account";
type ColFormat = "text" | "currency" | "number";
type FooterAgg = "sum" | "last";

export interface StatementTabsWidgetProps extends BaseWidgetProps {
  defaultGranularity?: Granularity;
  visibleColumns?: string[];
  footerMode?: "sum" | "avg";
  horizontalScroll?: boolean;
}

// ── Column definitions ────────────────────────────────────────────────────────

interface ColDef {
  key: string;
  label: string;
  format: ColFormat;
  directional: boolean;
  footerAgg?: FooterAgg;
  dailyOnly?: boolean;
  isNotes?: boolean;
  isIdentifier?: boolean;
}

const BASE_COLS: ColDef[] = [
  { key: "date",                         label: "Date",              format: "text",     directional: false },
  { key: "charges",                      label: "Charges",           format: "currency", directional: false },
  { key: "rebates",                      label: "Rebates",           format: "currency", directional: false },
  { key: "volume",                       label: "Volume",            format: "number",   directional: false },
  { key: "grossPL",                      label: "Gross P&L",         format: "currency", directional: true  },
  { key: "transCost",                    label: "Trans Cost",        format: "currency", directional: false },
  { key: "netPL",                        label: "Net P&L",           format: "currency", directional: true  },
  { key: "netPLExclRebatesAndCharges",   label: "Net P&L (Ex. R&C)", format: "currency", directional: true  },
  { key: "traderOpeningBalance",         label: "Opening Bal.",      format: "currency", directional: false, footerAgg: "last" },
  { key: "traderClosingBalance",         label: "Closing Bal.",      format: "currency", directional: false, footerAgg: "last" },
  { key: "notes",                        label: "",                  format: "text",     directional: false, dailyOnly: true, isNotes: true },
];

// ── Formatters ────────────────────────────────────────────────────────────────

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function formatCell(value: unknown, format: ColFormat): string {
  if (value === null || value === undefined) return "—";
  if (format === "currency") {
    const n = Number(value);
    return isNaN(n) ? String(value) : USD.format(n);
  }
  if (format === "number") {
    const n = Number(value);
    return isNaN(n) ? String(value) : NUM.format(n);
  }
  return String(value);
}

function truncate(str: string, max = 14): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveDateKey(rows: any[]): string {
  if (!rows.length) return "date";
  for (const c of ["date", "week", "month", "year", "period"]) {
    if (c in rows[0]) return c;
  }
  return "date";
}

// Merge selected rows by dateKey: sum numeric cols, LAST for balance cols.
function aggregateRows(rows: any[], dateKey: string, cols: ColDef[]): any[] {
  const order: string[] = [];
  const groups = new Map<string, any[]>();
  for (const row of rows) {
    const k = String(row[dateKey] ?? "");
    if (!groups.has(k)) { groups.set(k, []); order.push(k); }
    groups.get(k)!.push(row);
  }
  return order.map((dateVal) => {
    const g = groups.get(dateVal)!;
    const result: any = { [dateKey]: dateVal };
    for (const col of cols) {
      if (col.format === "text" || col.isNotes || col.key === dateKey) continue;
      result[col.key] = col.footerAgg === "last"
        ? g[g.length - 1]?.[col.key]
        : g.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
    }
    return result;
  });
}

// Numeric columns available for aggregation (date and notes excluded)
const AGGREGATE_COLS = BASE_COLS.filter((c) => !c.isNotes && c.format !== "text");

// ── Column aggregate dropdown ─────────────────────────────────────────────────

interface ColumnAggregateDropdownProps {
  selected: Set<string>;
  onToggle: (colKey: string) => void;
  onClear: () => void;
  darkMode: boolean;
}

function ColumnAggregateDropdown({ selected, onToggle, onClear, darkMode }: ColumnAggregateDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = selected.size === 0
    ? "Aggregate"
    : selected.size === 1
      ? truncate(AGGREGATE_COLS.find((c) => c.key === [...selected][0])?.label ?? [...selected][0], 10)
      : `${selected.size} columns`;

  const hasSelection = selected.size > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest rounded border transition-colors ${
          hasSelection
            ? darkMode
              ? "bg-[#2a2a2a] text-[#f0f0f0] border-[#555]"
              : "bg-muted text-foreground border-border"
            : "text-muted-foreground/60 border-transparent hover:text-muted-foreground hover:border-border/40"
        }`}
      >
        {label}
        {hasSelection && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-0.5 opacity-60 hover:opacity-100 leading-none"
          >
            ×
          </span>
        )}
        <svg width="8" height="8" viewBox="0 0 10 6" fill="currentColor" className="opacity-50 ml-0.5">
          <path d="M0 0l5 6 5-6z" />
        </svg>
      </button>

      {open && (
        <div className={`absolute left-0 top-full mt-1 z-50 min-w-[180px] rounded border shadow-lg ${
          darkMode ? "bg-[#1e1e1e] border-[#3a3a3a]" : "bg-white border-gray-200"
        }`}>
          {/* Breadcrumb header */}
          <div className={`px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest border-b ${
            darkMode ? "text-[#888] border-[#2a2a2a]" : "text-gray-400 border-gray-100"
          }`}>
            account → dailyStatementTable
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {AGGREGATE_COLS.map((col) => (
              <label
                key={col.key}
                className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer text-[10px] transition-colors ${
                  darkMode ? "hover:bg-[#2a2a2a] text-[#ccc]" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(col.key)}
                  onChange={() => onToggle(col.key)}
                  className="w-3 h-3 accent-primary cursor-pointer"
                />
                <span>{col.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Notes tooltip ─────────────────────────────────────────────────────────────

function NotesCell({ notes, darkMode }: { notes: unknown; darkMode: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (!notes || String(notes).trim() === "") return <td className="px-1 py-1 w-5" />;

  const items = String(notes).split("|").map((s) => s.trim()).filter(Boolean);

  return (
    <td className="px-1 py-1 w-5 text-center relative">
      <div ref={ref} className="inline-block">
        <button
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className={`leading-none ${darkMode ? "text-[#6a8fff]" : "text-blue-500"} hover:opacity-80`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="8" />
            <line x1="12" y1="12" x2="12" y2="16" />
          </svg>
        </button>
        {open && (
          <div className={`absolute z-50 right-0 top-full mt-1 min-w-[140px] max-w-[220px] rounded shadow-lg text-[10px] leading-relaxed p-2 border ${
            darkMode ? "bg-[#232323] border-[#3a3a3a] text-[#ccc]" : "bg-white border-gray-200 text-gray-700"
          }`}>
            {items.map((note, i) => (
              <div key={i} className="py-0.5 border-b last:border-0 border-border/10">{note}</div>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingRows({ colCount }: { colCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-border/10">
          {Array.from({ length: colCount }).map((__, j) => (
            <td key={j} className="px-2 py-1.5">
              <div className="h-3 rounded bg-muted/40 animate-pulse" style={{ width: `${40 + (i * 13 + j * 7) % 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`w-full h-full flex items-center justify-center text-[11px] ${darkMode ? "text-[#555]" : "text-muted-foreground"}`}>
      No data — apply filters via the topbar widget
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const StatementTabsWidget: React.FC<StatementTabsWidgetProps> = ({
  darkMode = false,
  title,
  defaultGranularity = "daily",
  visibleColumns,
  footerMode = "sum",
  horizontalScroll = false,
}) => {
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity);
  const [viewMode, setViewMode] = useState<ViewMode>("account");
  const [aggregateColumns, setAggregateColumns] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { dailyData, weeklyData, monthlyData } = useFinancialDataStore();
  const isLoading = useLoadingStatusStore((s) => s.isLoading);

  const rawRows = useMemo(() => {
    if (granularity === "daily")   return dailyData;
    if (granularity === "weekly")  return weeklyData;
    return monthlyData;
  }, [granularity, dailyData, weeklyData, monthlyData]);

  const dateKey = useMemo(() => resolveDateKey(rawRows), [rawRows]);

  const hasAccount      = useMemo(() => rawRows.length > 0 && "nickname" in rawRows[0], [rawRows]);
  const hasClearingCorp = useMemo(() => rawRows.length > 0 && "clearingCorp" in rawRows[0], [rawRows]);

  // Identifier key for the current view mode
  const identifierKey = useMemo(() => {
    if (viewMode === "clearingCorp" && hasClearingCorp) return "clearingCorp";
    if (hasAccount) return "nickname";
    return null;
  }, [viewMode, hasAccount, hasClearingCorp]);

  // Clear column aggregation when granularity changes
  React.useEffect(() => { setAggregateColumns(new Set()); }, [granularity]);

  const toggleAggregateColumn = (key: string) => {
    setAggregateColumns((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Column definitions
  const colDefs = useMemo(() => {
    const firstRow = rawRows[0] ?? {};
    const cols = BASE_COLS
      .filter((c) => {
        if (c.dailyOnly && granularity !== "daily") return false;
        if (c.isNotes && !("notes" in firstRow)) return false;
        if ((c.key === "traderOpeningBalance" || c.key === "traderClosingBalance") && !(c.key in firstRow)) return false;
        // Respect visibleColumns prop (date key is always shown)
        if (visibleColumns && !c.isNotes && c.key !== "date" && !visibleColumns.includes(c.key)) return false;
        return true;
      })
      .map((c) =>
        c.key === "date" && dateKey !== "date"
          ? { ...c, key: dateKey, label: dateKey.charAt(0).toUpperCase() + dateKey.slice(1) }
          : c
      );

    if (identifierKey && aggregateColumns.size === 0) {
      const label = viewMode === "clearingCorp" ? "Clearing Corp" : "Account";
      cols.splice(1, 0, { key: identifierKey, label, format: "text", directional: false, isIdentifier: true });
    }
    return cols;
  }, [rawRows, granularity, dateKey, identifierKey, viewMode, visibleColumns, aggregateColumns.size]);

  // When columns are selected for aggregation: collapse all rows into one per date,
  // summing the selected columns and leaving others blank.
  const displayRows = useMemo(() => {
    if (aggregateColumns.size === 0) return rawRows;

    const order: string[] = [];
    const groups = new Map<string, any[]>();
    for (const row of rawRows) {
      const k = String(row[dateKey] ?? "");
      if (!groups.has(k)) { groups.set(k, []); order.push(k); }
      groups.get(k)!.push(row);
    }
    return order.map((dateVal) => {
      const g = groups.get(dateVal)!;
      const result: any = { [dateKey]: dateVal, __isAggregate: true };
      for (const col of colDefs) {
        if (col.format === "text" || col.isNotes || col.key === dateKey) continue;
        if (aggregateColumns.has(col.key)) {
          result[col.key] = g.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0);
        }
        // Non-selected columns left undefined → renders as "—"
      }
      return result;
    });
  }, [rawRows, aggregateColumns, dateKey, colDefs]);

  const sorted = useMemo(() => {
    if (!displayRows.length) return displayRows;
    return [...displayRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = Number(av);
      const bn = Number(bv);
      const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [displayRows, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const GRANULARITY_TABS: { key: Granularity; label: string }[] = [
    { key: "daily",   label: "Daily" },
    { key: "weekly",  label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];

  const showViewToggle = hasAccount && hasClearingCorp;

  return (
    <WidgetContainer title={title ?? "Financial Statements"} darkMode={darkMode}>
      <div className="h-full flex flex-col">

        {/* Granularity tabs */}
        <div className="shrink-0 flex items-center gap-1 px-3 pt-2 pb-1 border-b border-border/20">
          {GRANULARITY_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setGranularity(t.key)}
              className={`px-3 py-1 text-[11px] font-semibold rounded transition-colors ${
                granularity === t.key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              {t.label}
            </button>
          ))}
          {rawRows.length > 0 && (
            <span className="ml-auto text-[9px] text-muted-foreground/50 tabular-nums">{rawRows.length} rows</span>
          )}
        </div>

        {/* View mode + aggregate controls */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/10">
          {/* Clearing Corp / Account toggle — only when both fields exist */}
          {showViewToggle && aggregateColumns.size === 0 && (
            <div className="flex items-center gap-0.5">
              {(["clearingCorp", "account"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest rounded transition-colors border ${
                    viewMode === mode
                      ? darkMode
                        ? "bg-[#2a2a2a] text-[#f0f0f0] border-[#444]"
                        : "bg-muted text-foreground border-border"
                      : "text-muted-foreground/60 border-transparent hover:text-muted-foreground"
                  }`}
                >
                  {mode === "clearingCorp" ? "Clearing Corp" : "Account"}
                </button>
              ))}
            </div>
          )}

          {/* Column aggregate dropdown */}
          <ColumnAggregateDropdown
            selected={aggregateColumns}
            onToggle={toggleAggregateColumn}
            onClear={() => setAggregateColumns(new Set())}
            darkMode={darkMode}
          />
        </div>

        {/* Scrollable table */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${horizontalScroll ? "overflow-x-auto" : "overflow-x-hidden"}`}>
          {!isLoading && rawRows.length === 0 ? (
            <EmptyState darkMode={darkMode} />
          ) : (
            <table className="w-full text-[11px] border-collapse">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <tr className="border-b border-border/40">
                  {colDefs.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => !col.isNotes && handleSort(col.key)}
                      className={`px-2 py-1.5 font-semibold text-[9px] uppercase tracking-widest select-none whitespace-nowrap transition-colors ${
                        col.isNotes ? "w-5" : "cursor-pointer hover:text-foreground"
                      } ${sortKey === col.key ? "text-primary" : "text-muted-foreground/60"} ${
                        col.format === "text" || col.isNotes ? "text-left" : "text-right"
                      }`}
                    >
                      {col.label}
                      {!col.isNotes && sortKey === col.key && (
                        <span className="ml-0.5 opacity-70">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <LoadingRows colCount={colDefs.length} />
                ) : (
                  sorted.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border/10 hover:bg-muted/20 transition-colors ${
                        row.__isAggregate ? darkMode ? "bg-[#1f2a1f]/60" : "bg-emerald-50/40" : ""
                      }`}
                    >
                      {colDefs.map((col) => {
                        if (col.isNotes) {
                          return <NotesCell key={col.key} notes={row[col.key]} darkMode={darkMode} />;
                        }
                        const raw = row[col.key];
                        const isTextCol = col.format === "text";
                        const fullText = raw != null ? String(raw) : "";

                        // Aggregate rows have no identifier value — label them
                        const displayText = col.isIdentifier && row.__isAggregate
                          ? "Aggregate"
                          : isTextCol ? truncate(fullText, 14) : formatCell(raw, col.format);

                        const numVal = col.directional ? Number(raw) : NaN;
                        const colorClass = col.directional && !isNaN(numVal)
                          ? numVal >= 0 ? "text-emerald-500" : "text-red-400"
                          : "";
                        return (
                          <td
                            key={col.key}
                            title={isTextCol && !col.isIdentifier && fullText.length > 14 ? fullText : undefined}
                            className={`px-2 py-1 tabular-nums ${
                              isTextCol ? "text-left text-muted-foreground" : "text-right"
                            } ${colorClass} ${col.isIdentifier && row.__isAggregate ? "font-semibold italic text-muted-foreground" : ""}`}
                          >
                            {displayText}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              {!isLoading && sorted.length > 0 && (
                <tfoot className="sticky bottom-0 z-10 bg-background/95 backdrop-blur-sm border-t border-border/40">
                  <tr>
                    {colDefs.map((col, idx) => {
                      if (col.isNotes) return <td key={col.key} className="w-5" />;
                      if (col.format === "text") {
                        return (
                          <td key={col.key} className="px-2 py-1 text-[9px] uppercase tracking-widest text-muted-foreground/40 font-semibold">
                            {idx === 0 ? "Total" : ""}
                          </td>
                        );
                      }
                      const agg = col.footerAgg ?? "sum";
                      if (agg === "last") {
                        const lastVal = sorted[sorted.length - 1]?.[col.key];
                        const n = Number(lastVal);
                        return (
                          <td key={col.key} className="px-2 py-1 text-right tabular-nums font-bold text-[11px] text-foreground">
                            <span className="text-[8px] font-normal text-muted-foreground/50 mr-0.5">[LAST]</span>
                            {formatCell(isNaN(n) ? lastVal : n, col.format)}
                          </td>
                        );
                      }
                      const total = sorted.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0);
                      const footerVal = footerMode === "avg" && sorted.length > 0 ? total / sorted.length : total;
                      const footerLabel = footerMode === "avg" ? "[AVG]" : "[SUM]";
                      const colorClass = col.directional ? (footerVal >= 0 ? "text-emerald-500" : "text-red-400") : "text-foreground";
                      return (
                        <td key={col.key} className={`px-2 py-1 text-right tabular-nums font-bold text-[11px] ${colorClass}`}>
                          <span className="text-[8px] font-normal text-muted-foreground/50 mr-0.5">{footerLabel}</span>
                          {formatCell(footerVal, col.format)}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

      </div>
    </WidgetContainer>
  );
};

export const StatementTabsWidgetDef = {
  component: StatementTabsWidget,
  name: "Statement Tabs",
  description: "Daily / Weekly / Monthly financial statement table with sortable columns. Requires a BackOffice Topbar widget on the same dashboard.",
  defaultProps: {
    defaultGranularity: "daily" as Granularity,
  },
  category: "BackOffice",
};