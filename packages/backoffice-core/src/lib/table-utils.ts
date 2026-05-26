/**
 * Pure utilities shared by the data-table rendering and editing pipeline.
 *
 * Nothing in this file imports React or accesses stores — it is safe to use
 * in both server and client contexts.
 */

import { TableColumnDef, TableRow } from "../types/widget-extras";
import { FieldAggregation } from "./field-registry";
import { GroupId } from "../store/groups";

/* ─── Aggregation options ────────────────────────────────────────────────────
 * Single source of truth for agg option lists used by TableColumnEditor
 * (entity / temporal / footer selects) and DataTableWidget (footer dropdown).
 * ─────────────────────────────────────────────────────────────────────────── */

export const AGG_OPTIONS: { value: FieldAggregation; label: string; short: string }[] = [
  { value: "sum", label: "Sum", short: "SUM" },
  { value: "mean", label: "Mean", short: "AVG" },
  { value: "max", label: "Max", short: "MAX" },
  { value: "min", label: "Min", short: "MIN" },
  { value: "median", label: "Median", short: "MED" },
  { value: "count", label: "Count", short: "CNT" },
  { value: "last", label: "Newest", short: "LAST" },
  { value: "first", label: "Oldest", short: "FIRST" },
  { value: "blank", label: "Hidden", short: "—" },
];

/* ─── Merged-column key encoding ────────────────────────────────────────────
 *
 * In merged view mode one table shows all groups side-by-side.
 * Each data column is expanded into N columns (one per active group).
 * The expanded column key is: "<metricKey>·<groupId>"
 * using U+00B7 MIDDLE DOT as delimiter (never present in field names).
 * ─────────────────────────────────────────────────────────────────────────── */

const MERGED_DELIMITER = "·";

/** Encode a (metricKey, groupId) pair into a merged column key. */
export function encodeGroupColKey(metricKey: string, groupId: GroupId): string {
  return `${metricKey}${MERGED_DELIMITER}${groupId}`;
}

/**
 * Decode a merged column key.
 * Returns null when the key is not a merged key (e.g. "date").
 */
export function decodeGroupColKey(key: string): { metricKey: string; groupId: GroupId } | null {
  const idx = key.lastIndexOf(MERGED_DELIMITER);
  if (idx === -1) return null;
  return {
    metricKey: key.slice(0, idx),
    groupId: key.slice(idx + 1) as GroupId,
  };
}

/** True when a column key was produced by encodeGroupColKey. */
export function isMergedColKey(key: string): boolean {
  return key.includes(MERGED_DELIMITER);
}

/* ─── Sentinel column keys ───────────────────────────────────────────────── */

/**
 * Column keys that are treated as dimensional labels (never numeric data).
 * These columns skip expression evaluation and series transforms.
 */
export const SENTINEL_KEYS = new Set([
  "date",
  "product",
  "asset",
  "instrument",
  "nickname",
  "accountId",
  "clearingCorp",
  "dateInstrument",
  "currency",
]);

export function isSentinelKey(key: string): boolean {
  return SENTINEL_KEYS.has(key);
}

/* ─── Cell formatting ────────────────────────────────────────────────────── */

const currencyFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const numberFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const percentFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a table cell value according to its column format. */
export function formatCell(
  value: string | number | boolean | null | undefined,
  format: TableColumnDef["format"],
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "—";
  if (format === "currency") return currencyFmt.format(value);
  if (format === "percent") return `${percentFmt.format(value)}%`;
  return numberFmt.format(value);
}

/** Tailwind class for positive/negative currency coloring. Only applies when directional is true. */
export function valueCls(
  value: string | number | boolean | null | undefined,
  format: TableColumnDef["format"],
  directional?: boolean,
): string {
  if (typeof value !== "number" || format !== "currency" || !directional) return "";
  if (value > 0) return "text-emerald-600 dark:text-emerald-500";
  if (value < 0) return "text-red-600 dark:text-red-500";
  return "";
}

/* ─── Sort ───────────────────────────────────────────────────────────────── */

export type SortState = { key: string; dir: "asc" | "desc" } | null;

/** Returns true when a sort value is considered "unavailable" — always sorts last. */
function isUnavailable(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));
}

export function sortRows(rows: TableRow[], sort: SortState): TableRow[] {
  if (!sort) return rows;
  // For dimension columns (date / instrument / asset) the pipeline writes a companion
  // "_sortKey_<colKey>" entry that holds the raw ISO value (e.g. "2024-01-15").
  // Using the raw key guarantees chronological order regardless of display format.
  const sortKeyField = `_sortKey_${sort.key}`;
  return [...rows].sort((a, b) => {
    const av = a[sortKeyField] ?? a[sort.key];
    const bv = b[sortKeyField] ?? b[sort.key];

    // Unavailable values sort first on desc (so warnings surface immediately),
    // last on asc. Desc order: unavailable → positive → zero → negative.
    const aUnavail = isUnavailable(av);
    const bUnavail = isUnavailable(bv);
    if (aUnavail && bUnavail) return 0;
    if (aUnavail) return sort.dir === "desc" ? -1 : 1;
    if (bUnavail) return sort.dir === "desc" ? 1 : -1;

    if (typeof av === "number" && typeof bv === "number") {
      return sort.dir === "asc" ? av - bv : bv - av;
    }
    return sort.dir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

export function toggleSort(prev: SortState, key: string): SortState {
  if (!prev || prev.key !== key) return { key, dir: "desc" };
  if (prev.dir === "desc") return { key, dir: "asc" };
  return null;
}

/* ─── Footer / summary row ───────────────────────────────────────────────── */

/**
 * Returns the footer aggregation for a column.
 *
 * Reads col.footerAggregation which is declared explicitly on every TableColumnDef
 * and sourced from FIELD_REGISTRY. No string inference — semantics are explicit.
 *
 * "blank" means the footer cell should be empty (e.g. dimension columns).
 * All other values map directly to BucketAgg for use in computeFooterRow.
 */
export function getColFooterAgg(col: TableColumnDef): TableColumnDef["footerAggregation"] {
  return col.footerAggregation;
}

export interface FooterRowResult {
  /** Aggregated value per column key. null = no value to show (dimension col, blank agg, or no finite rows). */
  values: Record<string, number | null>;
}

/**
 * Computes a summary (footer) row over all visible rows.
 *
 * - Dimension / sentinel columns → values[key] = null (footer renders a "Total" label).
 * - Metric columns with gaps: computes the aggregate over available finite rows and
 *   adds the key to `gaps` so the renderer can show a warning icon.
 * - Returns values[key] = null only when there are zero finite rows for a column.
 */
export function computeFooterRow(rows: TableRow[], cols: TableColumnDef[]): FooterRowResult {
  const values: Record<string, number | null> = {};
  // Chronologically sorted rows used only for last/first aggregations.
  const chronoRows = [...rows].sort((a, b) => {
    const av = String(a._sortKey_date ?? a.date ?? "");
    const bv = String(b._sortKey_date ?? b.date ?? "");
    return av < bv ? -1 : av > bv ? 1 : 0;
  });

  for (const col of cols) {
    // Dimension columns and text columns have no numeric footer.
    if (!isMergedColKey(col.key) && SENTINEL_KEYS.has(col.key)) {
      values[col.key] = null;
      continue;
    }
    if (col.format === "text") {
      values[col.key] = null;
      continue;
    }

    const rowKey = col.key;
    const agg = getColFooterAgg(col);

    if (agg === "last" || agg === "first") {
      const chronoValues = chronoRows
        .map((r) => r[rowKey])
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      if (chronoValues.length === 0) {
        values[rowKey] = null;
      } else {
        values[rowKey] = agg === "last" ? chronoValues[chronoValues.length - 1] : chronoValues[0];
      }
      continue;
    }

    const finiteValues = rows
      .map((r) => r[rowKey])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

    if (finiteValues.length === 0) {
      values[rowKey] = null;
      continue;
    }

    const sum = finiteValues.reduce((a, b) => a + b, 0);
    if (agg === "blank") {
      values[rowKey] = null;
    } else if (agg === "mean") {
      values[rowKey] = sum / finiteValues.length;
    } else if (agg === "max") {
      values[rowKey] = Math.max(...finiteValues);
    } else if (agg === "min") {
      values[rowKey] = Math.min(...finiteValues);
    } else {
      // "sum" | "median" | "count" | undefined
      values[rowKey] =
        agg === "median"
          ? finiteValues.slice().sort((a, b) => a - b)[Math.floor(finiteValues.length / 2)]
          : sum;
    }
  }

  return { values };
}
