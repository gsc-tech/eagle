import type { BaseWidgetProps } from "../../types";
import { parseSymbol } from "../../utils/symbolParser";

// ─── Product Groups ───────────────────────────────────────────────────────────

export const PRODUCT_GROUPS: Record<string, { fullName: string; groupName: string }> = {
  CL: { fullName: "CL", groupName: "Energy" },
  HO: { fullName: "HO", groupName: "Energy" },
  NG: { fullName: "NG", groupName: "Energy" },
  RB: { fullName: "RB", groupName: "Energy" },
  BRN: { fullName: "BRN", groupName: "Energy" },
  G: { fullName: "G", groupName: "Energy" },
  HTT: { fullName: "HTT", groupName: "Energy" },
  QG: { fullName: "QG", groupName: "Energy" },
  GC: { fullName: "GC", groupName: "Metals" },
  SI: { fullName: "SI", groupName: "Metals" },
  PL: { fullName: "PL", groupName: "Metals" },
  PA: { fullName: "PA", groupName: "Metals" },
  HG: { fullName: "HG", groupName: "Metals" },
  BCH: { fullName: "BCH", groupName: "Metals" },
  MGC: { fullName: "MGC", groupName: "Metals" },
  SIL: { fullName: "SIL", groupName: "Metals" },
  ZC: { fullName: "ZC", groupName: "Agriculture" },
  ZS: { fullName: "ZS", groupName: "Agriculture" },
  ZL: { fullName: "ZL", groupName: "Agriculture" },
  ZM: { fullName: "ZM", groupName: "Agriculture" },
  ZW: { fullName: "ZW", groupName: "Agriculture" },
  KE: { fullName: "KE", groupName: "Agriculture" },
  CWD: { fullName: "CWD", groupName: "Agriculture" },
  ECO: { fullName: "ECO", groupName: "Agriculture" },
  KWD: { fullName: "KWD", groupName: "Agriculture" },
  MWE: { fullName: "MWE", groupName: "Agriculture" },
  MZS: { fullName: "MZS", groupName: "Agriculture" },
  MZC: { fullName: "MZC", groupName: "Agriculture" },
  MZL: { fullName: "MZL", groupName: "Agriculture" },
  MZM: { fullName: "MZM", groupName: "Agriculture" },
  KC: { fullName: "KC", groupName: "Soft Commodities" },
  RC: { fullName: "RC", groupName: "Soft Commodities" },
  CC: { fullName: "CC", groupName: "Soft Commodities" },
  C: { fullName: "C", groupName: "Soft Commodities" },
  CT: { fullName: "CT", groupName: "Soft Commodities" },
  LE: { fullName: "LE", groupName: "Livestock" },
  GF: { fullName: "GF", groupName: "Livestock" },
  HE: { fullName: "HE", groupName: "Livestock" },
  ZN: { fullName: "ZN", groupName: "Interest Rates" },
  ZB: { fullName: "ZB", groupName: "Interest Rates" },
  ZF: { fullName: "ZF", groupName: "Interest Rates" },
  ZT: { fullName: "ZT", groupName: "Interest Rates" },
  ZQ: { fullName: "ZQ", groupName: "Interest Rates" },
  SR3: { fullName: "SR3", groupName: "Interest Rates" },
  SR1: { fullName: "SR1", groupName: "Interest Rates" },
  SO3: { fullName: "SO3", groupName: "Interest Rates" },
  M2K: { fullName: "M2K", groupName: "Equities" },
  MYM: { fullName: "MYM", groupName: "Equities" },
  ES: { fullName: "ES", groupName: "Equities" },
  NQ: { fullName: "NQ", groupName: "Equities" },
  MNQ: { fullName: "MNQ", groupName: "Equities" },
  MES: { fullName: "MES", groupName: "Equities" },
  RTY: { fullName: "RTY", groupName: "Equities" },
  YM: { fullName: "YM", groupName: "Equities" },
  MMC: { fullName: "MMC", groupName: "Equities" },
  EWF: { fullName: "EWF", groupName: "Equities" },
  EMD: { fullName: "EMD", groupName: "Equities" },
  MSC: { fullName: "MSC", groupName: "Equities" },
  MNK: { fullName: "MNK", groupName: "Equities" },
  MNI: { fullName: "MNI", groupName: "Equities" },
  SMC: { fullName: "SMC", groupName: "Equities" },
};

export const CATEGORY_NORMALISE: Record<string, string> = {
  energy: "Energy",
  metals: "Metals",
  agriculture: "Agriculture",
  "soft commodities": "Soft Commodities",
  softs: "Soft Commodities",
  livestock: "Livestock",
  "interest rates": "Interest Rates",
  "fixed income": "Interest Rates",
  equities: "Equities",
  equity: "Equities",
};

export const GROUP_ORDER = [
  "Energy", "Metals", "Agriculture", "Soft Commodities",
  "Livestock", "Interest Rates", "Equities",
];

export const GROUP_CONFIG: Record<string, { color: string; bg: string; darkBg: string; icon: string }> = {
  Energy:            { color: "#f97316", bg: "rgba(249,115,22,0.08)",  darkBg: "rgba(249,115,22,0.14)",  icon: "⚡" },
  Metals:            { color: "#eab308", bg: "rgba(234,179,8,0.08)",   darkBg: "rgba(234,179,8,0.14)",   icon: "🪙" },
  Agriculture:       { color: "#22c55e", bg: "rgba(34,197,94,0.08)",   darkBg: "rgba(34,197,94,0.14)",   icon: "🌾" },
  "Soft Commodities":{ color: "#b45309", bg: "rgba(180,83,9,0.08)",    darkBg: "rgba(180,83,9,0.14)",    icon: "☕" },
  Livestock:         { color: "#ec4899", bg: "rgba(236,72,153,0.08)",  darkBg: "rgba(236,72,153,0.14)",  icon: "🐄" },
  "Interest Rates":  { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  darkBg: "rgba(59,130,246,0.14)",  icon: "📈" },
  Equities:          { color: "#6366f1", bg: "rgba(99,102,241,0.08)",  darkBg: "rgba(99,102,241,0.14)",  icon: "📊" },
  Other:             { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", darkBg: "rgba(148,163,184,0.14)", icon: "📦" },
};

export const DATE_TYPE_CONFIG = {
  expiry: { label: "Expiry", short: "EXP", color: "#a855f7", bg: "rgba(168,85,247,0.16)" },
  ftd:    { label: "FTD",    short: "FTD", color: "#06b6d4", bg: "rgba(6,182,212,0.16)"  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventDateType = "expiry" | "ftd";
export type ViewMode = "expiry" | "ftd" | "both";

export interface ExpiryEvent {
  id: string;
  date: string;
  symbol: string;
  productName: string;
  contractCode: string;
  exchange: string;
  currency?: string;
  dateType: EventDateType;
  _group: string;
  _color: string;
}

export interface ExpiryCalendarWidgetProps extends BaseWidgetProps {
  apiUrl?: string;
  staticData?: unknown[];
  productGroupOverride?: Record<string, string>;
}

export type GetPositionFn = (symbol: string, label: string) => { marex: number; excel: number; active: number };
export type GetPositionByAccountFn = (accountId: string, symbol: string, label: string) => { marex: number; excel: number; active: number };

// ─── Colour token helper ──────────────────────────────────────────────────────

export function tok(dk: boolean) {
  return {
    bgPrimary:   dk ? "#09090b" : "#f8fafc",
    bgCard:      dk ? "#111115" : "#ffffff",
    bgElevated:  dk ? "#18181b" : "#f1f5f9",
    textPrimary: dk ? "#e4e4e7" : "#0f172a",
    textSec:     dk ? "#a1a1aa" : "#475569",
    textMuted:   dk ? "#71717a" : "#94a3b8",
    border:      dk ? "#1e1e24" : "#e2e8f0",
    borderSub:   dk ? "#27272a" : "#f1f5f9",
    accent:      "#3b82f6",
  };
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function getToday(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function isoToDateKey(iso: string): string {
  return iso.split("T")[0];
}

export function isoToLocal(iso: string): Date {
  return new Date(iso + "T12:00:00Z");
}

export function resolveGroup(symbol: string, apiCategory?: string, overrides?: Record<string, string>): string {
  if (overrides?.[symbol]) return overrides[symbol];
  if (apiCategory) {
    const norm = CATEGORY_NORMALISE[apiCategory.toLowerCase()];
    if (norm) return norm;
    if (GROUP_CONFIG[apiCategory]) return apiCategory;
  }
  return PRODUCT_GROUPS[symbol]?.groupName ?? "Other";
}

export function getPositionForEvent(
  event: ExpiryEvent,
  getPos: GetPositionFn
): { marex: number; excel: number; active: number } {
  const parsed = parseSymbol(`${event.symbol}${event.contractCode}`);
  if (parsed) return getPos(parsed.product, parsed.label);
  return { marex: 0, excel: 0, active: 0 };
}

export function getPositionForEventByAccount(
  event: ExpiryEvent,
  accountId: string,
  getPosByAccount: GetPositionByAccountFn
): { marex: number; excel: number; active: number } {
  const parsed = parseSymbol(`${event.symbol}${event.contractCode}`);
  if (parsed) return getPosByAccount(accountId, parsed.product, parsed.label);
  return { marex: 0, excel: 0, active: 0 };
}

export function parseApiResponse(raw: unknown, overrides?: Record<string, string>): ExpiryEvent[] {
  if (!raw) return [];

  const unwrap = (obj: any): any[] | null => {
    if (!obj || typeof obj !== "object") return null;
    if (Array.isArray(obj.productContract) && obj.productContract.length > 0) return obj.productContract;
    if (Array.isArray(obj.data))        return obj.data;
    if (Array.isArray(obj.events))      return obj.events;
    if (Array.isArray(obj.expirations)) return obj.expirations;
    return null;
  };

  let records: unknown[] = [];

  if (Array.isArray(raw)) {
    const deep = unwrap(raw[0]);
    records = deep ?? raw;
  } else if (typeof raw === "object") {
    const deep = unwrap(raw);
    records = deep ?? [raw];
  }

  const events: ExpiryEvent[] = [];
  let ctr = 0;

  records.forEach((rec: any) => {
    if (!rec || typeof rec !== "object") return;

    const isLegacy    = !!rec.date && (!!rec.product || !!rec.symbol);
    const symbol      = String(rec.symbol ?? rec.product ?? "").trim().toUpperCase();
    const productName = String(rec.product ?? rec.productName ?? symbol).trim();
    const exchange    = String(rec.exchange ?? "").trim();
    const currency    = rec.currency ? String(rec.currency).trim() : undefined;
    const group       = resolveGroup(symbol, rec.category, overrides);
    const cfg         = GROUP_CONFIG[group] ?? GROUP_CONFIG["Other"];

    if (Array.isArray(rec.contracts) && rec.contracts.length > 0) {
      rec.contracts.forEach((c: any) => {
        const contractCode = String(c.contractCode ?? "").trim();
        const base = `${symbol}_${contractCode}`;

        if (c.FNDminus2) events.push({
          id: `${base}_exp_${ctr++}`, date: isoToDateKey(c.FNDminus2),
          symbol, productName, contractCode, exchange, currency,
          dateType: "expiry", _group: group, _color: cfg.color,
        });

        const ftdVal = c.FTD ?? c.ftd;
        if (ftdVal) events.push({
          id: `${base}_ftd_${ctr++}`, date: isoToDateKey(ftdVal),
          symbol, productName, contractCode, exchange, currency,
          dateType: "ftd", _group: group, _color: cfg.color,
        });
      });
    } else if (isLegacy) {
      events.push({
        id: `flat_${ctr++}`, date: isoToDateKey(rec.date),
        symbol, productName,
        contractCode: String(rec.contract ?? rec.contractCode ?? "").trim(),
        exchange, currency,
        dateType: rec.isFND ? "ftd" : "expiry",
        _group: group, _color: cfg.color,
      });
    }
  });

  return events;
}