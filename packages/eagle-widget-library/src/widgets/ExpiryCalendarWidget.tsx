"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
  memo,
} from "react";
import { createPortal } from "react-dom";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { useWidgetData } from "../hooks/useWidgetData";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { WidgetContainer } from "../components/WidgetContainer";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ChevronDown,
  Calendar,
  Package,
  Layers,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { usePositionsStore } from "../store/positionsStore";
import { useAlertsStore } from "../store/alertsStore";
import { parseSymbol } from "../utils/symbolParser";

// ─── Product Groups (fallback when API doesn't provide category) ──────────────

const PRODUCT_GROUPS: Record<string, { fullName: string; groupName: string }> = {
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

const CATEGORY_NORMALISE: Record<string, string> = {
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

const GROUP_ORDER = ["Energy", "Metals", "Agriculture", "Soft Commodities", "Livestock", "Interest Rates", "Equities"];

const GROUP_CONFIG: Record<string, { color: string; bg: string; darkBg: string; icon: string }> = {
  Energy:           { color: "#f97316", bg: "rgba(249,115,22,0.08)", darkBg: "rgba(249,115,22,0.14)", icon: "⚡" },
  Metals:           { color: "#eab308", bg: "rgba(234,179,8,0.08)",  darkBg: "rgba(234,179,8,0.14)",  icon: "🪙" },
  Agriculture:      { color: "#22c55e", bg: "rgba(34,197,94,0.08)",  darkBg: "rgba(34,197,94,0.14)",  icon: "🌾" },
  "Soft Commodities":{ color: "#b45309", bg: "rgba(180,83,9,0.08)",   darkBg: "rgba(180,83,9,0.14)",   icon: "☕" },
  Livestock:        { color: "#ec4899", bg: "rgba(236,72,153,0.08)", darkBg: "rgba(236,72,153,0.14)", icon: "🐄" },
  "Interest Rates": { color: "#3b82f6", bg: "rgba(59,130,246,0.08)",  darkBg: "rgba(59,130,246,0.14)", icon: "📈" },
  Equities:         { color: "#6366f1", bg: "rgba(99,102,241,0.08)",  darkBg: "rgba(99,102,241,0.14)",  icon: "📊" },
  Other:            { color: "#94a3b8", bg: "rgba(148,163,184,0.08)",darkBg: "rgba(148,163,184,0.14)",icon: "📦" },
};

const DATE_TYPE_CONFIG = {
  expiry: { label: "Expiry", short: "EXP", color: "#a855f7", bg: "rgba(168,85,247,0.16)" },
  ftd:    { label: "FTD",    short: "FTD", color: "#06b6d4", bg: "rgba(6,182,212,0.16)"  },
} as const;

export type EventDateType = "expiry" | "ftd";
export type ViewMode     = "expiry" | "ftd" | "both";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExpiryEvent {
  id: string;
  date: string;          // YYYY-MM-DD
  symbol: string;        // "CL"
  productName: string;   // "Crude Oil Futures"
  contractCode: string;  // "K26"
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

// ─── Colour token helper ──────────────────────────────────────────────────────

function tok(dk: boolean) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isoToDateKey(iso: string): string {
  return iso.split("T")[0];
}

function isoToLocal(iso: string): Date {
  return new Date(iso + "T12:00:00Z");
}

function resolveGroup(symbol: string, apiCategory?: string, overrides?: Record<string, string>): string {
  if (overrides?.[symbol]) return overrides[symbol];
  if (apiCategory) {
    const norm = CATEGORY_NORMALISE[apiCategory.toLowerCase()];
    if (norm) return norm;
    if (GROUP_CONFIG[apiCategory]) return apiCategory;
  }
  return PRODUCT_GROUPS[symbol]?.groupName ?? "Other";
}

// ─── API Parser ───────────────────────────────────────────────────────────────

// ─── Position Lookup Helpers ──────────────────────────────────────────────────

type GetPositionFn = (symbol: string, label: string) => { marex: number; excel: number; active: number };
type GetPositionByAccountFn = (accountId: string, symbol: string, label: string) => { marex: number; excel: number; active: number };

function getPositionForEvent(
  event: ExpiryEvent,
  getPos: GetPositionFn
): { marex: number; excel: number; active: number } {
  const parsed = parseSymbol(`${event.symbol}${event.contractCode}`);
  if (parsed) return getPos(parsed.product, parsed.label);
  return { marex: 0, excel: 0, active: 0 };
}

function getPositionForEventByAccount(
  event: ExpiryEvent,
  accountId: string,
  getPosByAccount: GetPositionByAccountFn
): { marex: number; excel: number; active: number } {
  const parsed = parseSymbol(`${event.symbol}${event.contractCode}`);
  if (parsed) return getPosByAccount(accountId, parsed.product, parsed.label);
  return { marex: 0, excel: 0, active: 0 };
}

function parseApiResponse(raw: unknown, overrides?: Record<string, string>): ExpiryEvent[] {
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

    const isLegacy = !!rec.date && (!!rec.product || !!rec.symbol);
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

        if (c.expiry) events.push({
          id: `${base}_exp_${ctr++}`, date: isoToDateKey(c.expiry),
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

// ─── FilterPopover ────────────────────────────────────────────────────────────

function FilterPopover({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigRef  = useRef<HTMLDivElement>(null);
  const popRef   = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const calc = useCallback(() => {
    if (!trigRef.current) return;
    const r = trigRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
  }, []);

  useEffect(() => {
    if (!open) return;
    calc();
    const onMouse = (e: MouseEvent) => {
      if (popRef.current  && !popRef.current.contains(e.target as Node) &&
          trigRef.current && !trigRef.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("scroll", calc, true);
    window.addEventListener("resize", calc);
    document.addEventListener("mousedown", onMouse);
    return () => {
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("resize", calc);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [open, calc]);

  return (
    <div style={{ display: "inline-block" }}>
      <div ref={trigRef} onClick={() => setOpen(o => !o)} style={{ cursor: "pointer" }}>{trigger}</div>
      {open && createPortal(
        <div ref={popRef} style={{
          position: "fixed", top: coords.top,
          left: Math.min(coords.left, window.innerWidth - 264),
          zIndex: 9999, background: "#1a1a23", border: "1px solid #2d2d38",
          borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.65)",
          minWidth: 240, overflow: "hidden",
          animation: "ecPopIn 0.13s cubic-bezier(.16,1,.3,1)",
        }}>
          {children}
          <style>{`@keyframes ecPopIn{from{opacity:0;transform:translateY(-5px) scale(0.97)}to{opacity:1;transform:none}}`}</style>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

function CB({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span onClick={onChange} style={{
      flexShrink: 0, width: 14, height: 14, borderRadius: 3,
      border: `1.5px solid ${checked ? "#3b82f6" : "#4b5563"}`,
      background: checked ? "#3b82f6" : "transparent",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", transition: "all 0.1s",
    }}>
      {checked && (
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ active, children, onClick, dk }: { active: boolean; children: React.ReactNode; onClick?: () => void; dk: boolean }) {
  const t = tok(dk);
  return (
    <div onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 9px", borderRadius: 7,
      border: `1px solid ${active ? "#3b82f6" : t.border}`,
      background: active ? "rgba(59,130,246,0.12)" : t.bgCard,
      cursor: "pointer", color: active ? "#3b82f6" : t.textSec,
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
      transition: "all 0.1s", userSelect: "none",
      boxShadow: dk ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
    }}>
      {children}
    </div>
  );
}

// ─── Group Dot ────────────────────────────────────────────────────────────────

function GroupDot({ group, size = 8 }: { group: string; size?: number }) {
  const cfg = GROUP_CONFIG[group] ?? GROUP_CONFIG["Other"];
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />;
}

// ─── Date Type Pill ───────────────────────────────────────────────────────────

function DateTypePill({ type, small = false }: { type: EventDateType; small?: boolean }) {
  const tc = DATE_TYPE_CONFIG[type];
  return (
    <span style={{
      fontSize: small ? 9 : 10, fontWeight: 800, padding: small ? "1px 5px" : "2px 7px",
      borderRadius: 4, background: tc.bg, color: tc.color,
      letterSpacing: "0.04em", flexShrink: 0, border: `1px solid ${tc.color}30`,
    }}>
      {tc.short}
    </span>
  );
}

// ─── View Mode Toggle ─────────────────────────────────────────────────────────

function ViewModeToggle({ value, onChange, dk }: { value: ViewMode; onChange: (v: ViewMode) => void; dk: boolean }) {
  const t = tok(dk);
  return (
    <div style={{
      display: "flex", borderRadius: 7, border: `1px solid ${t.border}`,
      overflow: "hidden", flexShrink: 0,
      background: t.bgCard,
      boxShadow: dk ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
    }}>
      {(["expiry", "ftd", "both"] as ViewMode[]).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: "4px 11px", fontSize: 12, fontWeight: 700,
          background: value === m ? (dk ? "#27272a" : "#e2e8f0") : "transparent",
          color: value === m ? t.textPrimary : t.textMuted,
          border: "none", cursor: "pointer", transition: "all 0.1s",
          textTransform: "capitalize",
        }}>
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Event Badge ──────────────────────────────────────────────────────────────

const EventBadge = memo(({ event, dk, activePosition, accountBreakdown }: {
  event: ExpiryEvent;
  dk: boolean;
  activePosition?: number;
  accountBreakdown?: { accountId: string; qty: number }[];
}) => {
  const cfg = GROUP_CONFIG[event._group] ?? GROUP_CONFIG["Other"];
  const t   = tok(dk);
  const hasBreakdown = (accountBreakdown?.length ?? 0) > 0;
  // Show position badge if net != 0, OR if any account has a position (catches ±0 netting)
  const hasPos = (activePosition !== undefined && activePosition !== 0) || hasBreakdown || (accountBreakdown?.length ?? 0) === 1;

  function fmtQty(q: number) {
    return q > 0 ? `+${q.toLocaleString()}` : q.toLocaleString();
  }

  return (
    <div style={{
      borderRadius: 9,
      background: dk ? cfg.darkBg : cfg.bg,
      border: hasPos ? `1px solid ${cfg.color}55` : `1px solid ${cfg.color}25`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: DATE_TYPE_CONFIG[event.dateType].color, borderRadius: "9px 0 0 9px",
      }} />

      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px 7px 15px" }}>
        <GroupDot group={event._group} size={8} />
        <span style={{ fontWeight: 800, fontSize: 13, color: cfg.color, letterSpacing: "0.02em", minWidth: 28 }}>
          {event.symbol}
        </span>
        <span style={{ fontSize: 12, color: t.textSec, fontWeight: 600 }}>
          {event.contractCode}
        </span>
        <DateTypePill type={event.dateType} />
        {hasPos ? (
          <span style={{
            fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 5,
            background: (activePosition ?? 0) > 0
              ? "rgba(59,130,246,0.15)"
              : (activePosition ?? 0) < 0
              ? "rgba(249,115,22,0.15)"
              : "rgba(234,179,8,0.15)",
            color: (activePosition ?? 0) > 0
              ? "#3b82f6"
              : (activePosition ?? 0) < 0
              ? "#f97316"
              : "#eab308",
            border: `1px solid ${(activePosition ?? 0) > 0 ? "rgba(59,130,246,0.3)" : (activePosition ?? 0) < 0 ? "rgba(249,115,22,0.3)" : "rgba(234,179,8,0.4)"}`,
            marginLeft: "auto", letterSpacing: "0.02em",
          }}>
            {(activePosition ?? 0) === 0 ? "±0" : (activePosition ?? 0) > 0 ? `+${activePosition}` : String(activePosition)}
          </span>
        ) : event.exchange ? (
          <span style={{ fontSize: 9, color: t.textMuted, marginLeft: "auto", fontWeight: 700, letterSpacing: "0.04em" }}>
            {event.exchange}
          </span>
        ) : null}
      </div>

      {/* Account breakdown row — only when 2+ accounts have data */}
      {hasBreakdown && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "3px 6px",
          padding: "0 12px 7px 15px", alignItems: "center",
        }}>
          {accountBreakdown!.map(({ accountId, qty }) => (
            <span key={accountId} style={{
              fontSize: 9, fontWeight: 700,
              padding: "1px 6px", borderRadius: 4,
              background: qty > 0
                ? "rgba(59,130,246,0.1)"
                : qty < 0
                ? "rgba(249,115,22,0.1)"
                : (dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"),
              color: qty > 0 ? "#60a5fa" : qty < 0 ? "#fb923c" : t.textMuted,
              border: `1px solid ${qty > 0 ? "rgba(59,130,246,0.2)" : qty < 0 ? "rgba(249,115,22,0.2)" : "transparent"}`,
              letterSpacing: "0.02em",
            }}>
              <span style={{ color: t.textMuted, fontWeight: 600 }}>Acct {accountId}: </span>
              {qty === 0 ? "—" : fmtQty(qty)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
EventBadge.displayName = "EventBadge";

// ─── Day Cell ─────────────────────────────────────────────────────────────────

const DayCell = memo(({ day, events, isToday, isSelected, isCurrentMonth, dk, onClick, hasPosition }: {
  day: number; events: ExpiryEvent[]; isToday: boolean;
  isSelected: boolean; isCurrentMonth: boolean; dk: boolean; onClick: () => void;
  hasPosition?: boolean;
}) => {
  const t = tok(dk);
  const hasEvents  = events.length > 0;
  const hasExpiry  = events.some(e => e.dateType === "expiry");
  const hasFTD     = events.some(e => e.dateType === "ftd");
  const expCount   = events.filter(e => e.dateType === "expiry").length;
  const ftdCount   = events.filter(e => e.dateType === "ftd").length;

  const uniqueGroups = useMemo(() => {
    const seen = new Set<string>();
    return events.filter(e => { if (seen.has(e._group)) return false; seen.add(e._group); return true; });
  }, [events]);

  return (
    <div onClick={onClick} style={{
      position: "relative", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-start",
      padding: "5px 2px 4px", borderRadius: 10, minHeight: 52,
      background: isSelected
        ? "rgba(59,130,246,0.16)"
        : isToday && !isSelected
        ? (dk ? "rgba(59,130,246,0.09)" : "rgba(59,130,246,0.06)")
        : hasPosition
        ? (dk ? "rgba(234,179,8,0.13)" : "rgba(234,179,8,0.10)")
        : hasEvents
        ? (dk ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)")
        : "transparent",
      border: isSelected
        ? "1.5px solid #3b82f6"
        : isToday
        ? "1.5px solid rgba(59,130,246,0.45)"
        : hasPosition
        ? "2px solid rgba(234,179,8,0.85)"
        : hasEvents
        ? `1px solid ${t.border}`
        : "1px solid transparent",
      cursor: hasEvents ? "pointer" : "default",
      transition: "all 0.14s",
      opacity: isCurrentMonth ? 1 : 0.22,
      overflow: "hidden",
    }}>
      {/* Day number */}
      <span style={{
        fontSize: 15, lineHeight: 1, zIndex: 1,
        fontWeight: isToday || isSelected ? 800 : hasPosition || hasEvents ? 700 : 500,
        color: isSelected || isToday
          ? "#3b82f6"
          : hasPosition
          ? "#eab308"
          : hasEvents ? t.textPrimary : t.textMuted,
      }}>
        {day}
      </span>

      {/* Group dots */}
      {hasEvents && (
        <div style={{ display: "flex", gap: 2, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
          {uniqueGroups.slice(0, 5).map(e => <GroupDot key={e._group} group={e._group} size={5} />)}
        </div>
      )}

      {/* Counts */}
      {hasEvents && (
        <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
          {expCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, color: "#a855f7", lineHeight: 1 }}>{expCount}E</span>
          )}
          {ftdCount > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, color: "#06b6d4", lineHeight: 1 }}>{ftdCount}F</span>
          )}
        </div>
      )}

      {/* Corner indicators */}
      {hasExpiry && <div style={{ position: "absolute", top: 3, right: 3, width: 5, height: 5, borderRadius: "50%", background: "#a855f7" }} />}
      {hasFTD    && <div style={{ position: "absolute", top: 3, left:  3, width: 5, height: 5, borderRadius: "50%", background: "#06b6d4" }} />}

      {/* Position indicator — gold diamond bottom-centre */}
      {hasPosition && (
        <div style={{
          position: "absolute", bottom: 3,
          width: 7, height: 7,
          background: "#eab308",
          borderRadius: 1,
          transform: "rotate(45deg)",
          boxShadow: "0 0 4px rgba(234,179,8,0.7)",
        }} />
      )}
    </div>
  );
});
DayCell.displayName = "DayCell";

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

const DayDetailPanel = memo(({ date, events, dk, onClose, getPosition }: {
  date: Date; events: ExpiryEvent[]; dk: boolean; onClose: () => void;
  getPosition: GetPositionFn;
}) => {
  const [tab, setTab] = useState<"all" | "expiry" | "ftd">("all");
  const t = tok(dk);

  const getPositionByAccount = usePositionsStore((s) => s.getPositionByAccount);
  const getAccountIds        = usePositionsStore((s) => s.getAccountIds);
  const posMarexByAccount    = usePositionsStore((s) => s.marexByAccount);
  const posExcelByAccount    = usePositionsStore((s) => s.excelByAccount);
  const accountIds           = getAccountIds();

  const hasGrossPosition = useCallback((e: ExpiryEvent) =>
    accountIds.some(id => getPositionForEventByAccount(e, id, getPositionByAccount).active !== 0),
    [accountIds, getPositionByAccount, posMarexByAccount, posExcelByAccount]
  );

  const getBreakdown = useCallback((e: ExpiryEvent) =>
    accountIds
      .map(acctId => ({ accountId: acctId, qty: getPositionForEventByAccount(e, acctId, getPositionByAccount).active }))
      .filter(b => b.qty !== 0),
    [accountIds, getPositionByAccount, posMarexByAccount, posExcelByAccount]
  );

  const displayed = useMemo(
    () => tab === "all" ? events : events.filter(e => e.dateType === tab),
    [events, tab]
  );

  // Split into contracts with gross positions (top section) and the rest
  const [withPos, withoutPos] = useMemo(() => {
    const yes: ExpiryEvent[] = [], no: ExpiryEvent[] = [];
    displayed.forEach(e => (hasGrossPosition(e) ? yes : no).push(e));
    yes.sort((a, b) => Math.abs(getPositionForEvent(b, getPosition).active) - Math.abs(getPositionForEvent(a, getPosition).active));
    return [yes, no];
  }, [displayed, hasGrossPosition, getPosition, posMarexByAccount, posExcelByAccount]);

  const byGroup = useMemo(() => {
    const map: Record<string, ExpiryEvent[]> = {};
    withoutPos.forEach(e => { (map[e._group] ??= []).push(e); });
    return map;
  }, [withoutPos]);

  const expCount = events.filter(e => e.dateType === "expiry").length;
  const ftdCount = events.filter(e => e.dateType === "ftd").length;

  const renderBadge = (e: ExpiryEvent) => (
    <EventBadge
      key={e.id} event={e} dk={dk}
      activePosition={getPositionForEvent(e, getPosition).active}
      accountBreakdown={getBreakdown(e)}
    />
  );

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: t.bgPrimary,
      borderLeft: `1px solid ${t.border}`,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px 10px", flexShrink: 0,
        borderBottom: `1px solid ${t.border}`,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3b82f6", marginBottom: 3 }}>
            Contract Details
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
            {date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
              {events.length} total
            </span>
            {expCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>
                {expCount} Expiry
              </span>
            )}
            {ftdCount > 0 && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
                {ftdCount} FTD
              </span>
            )}
          </div>
        </div>
        <button onClick={onClose} style={{
          padding: 4, borderRadius: 6, border: "none",
          background: dk ? "#1e1e24" : "#f1f5f9",
          cursor: "pointer", color: t.textMuted, flexShrink: 0, display: "flex",
        }}>
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", flexShrink: 0, borderBottom: `1px solid ${t.border}`, padding: "0 14px" }}>
        {([["all", "All"], ["expiry", "Expiry"], ["ftd", "FTD"]] as [string, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={{
            padding: "8px 12px 7px", fontSize: 12, fontWeight: 700,
            background: "transparent", border: "none", cursor: "pointer",
            color: tab === key ? (key === "expiry" ? "#a855f7" : key === "ftd" ? "#06b6d4" : "#3b82f6") : t.textMuted,
            borderBottom: tab === key ? `2px solid ${key === "expiry" ? "#a855f7" : key === "ftd" ? "#06b6d4" : "#3b82f6"}` : "2px solid transparent",
            marginBottom: -1,
          }}>
            {label}
            {key !== "all" && (
              <span style={{ marginLeft: 4, fontSize: 9 }}>
                ({key === "expiry" ? expCount : ftdCount})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Events */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: t.textMuted, fontSize: 11 }}>No contracts of this type</div>
        ) : (
          <>
            {/* ── Open positions section (cross-group, always at top) ── */}
            {withPos.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span style={{ width: 7, height: 7, background: "#eab308", borderRadius: 1, transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#eab308" }}>
                    Open Positions
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: t.textMuted }}>({withPos.length})</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {withPos.map(renderBadge)}
                </div>
              </div>
            )}

            {/* ── Remaining contracts grouped by commodity ── */}
            {withoutPos.length > 0 && (
              <>
                {withPos.length > 0 && (
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: t.textMuted, marginBottom: 8, paddingTop: 4, borderTop: `1px solid ${t.border}` }}>
                    Other Contracts
                  </div>
                )}
                {GROUP_ORDER.concat(["Other"]).map(group => {
                  const evts = byGroup[group];
                  if (!evts?.length) return null;
                  const cfg = GROUP_CONFIG[group] ?? GROUP_CONFIG["Other"];
                  return (
                    <div key={group} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                        <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: cfg.color }}>
                          {group}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 600, color: t.textMuted }}>({evts.length})</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {evts.map(renderBadge)}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});
DayDetailPanel.displayName = "DayDetailPanel";

// ─── Upcoming Sidebar Item ────────────────────────────────────────────────────

const UpcomingItem = memo(({ dateKey, events, dk, isSelected, onClick }: {
  dateKey: string; events: ExpiryEvent[]; dk: boolean; isSelected: boolean; onClick: () => void;
}) => {
  const t = tok(dk);
  const today = useMemo(() => getToday(), []);
  const date  = isoToLocal(dateKey);
  const daysAway = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  const isPast   = daysAway < 0;
  const isToday  = daysAway === 0;

  const expCount = events.filter(e => e.dateType === "expiry").length;
  const ftdCount = events.filter(e => e.dateType === "ftd").length;

  const urgencyColor = isToday ? "#ef4444" : (!isPast && daysAway <= 3) ? "#f97316" : daysAway <= 7 ? "#eab308" : t.textMuted;

  return (
    <div onClick={onClick} style={{
      padding: "8px 12px",
      borderBottom: `1px solid ${t.border}`,
      background: isSelected
        ? (dk ? "rgba(59,130,246,0.09)" : "rgba(59,130,246,0.06)")
        : "transparent",
      cursor: "pointer", transition: "background 0.1s",
      opacity: isPast ? 0.45 : 1,
      borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: t.textPrimary }}>
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span style={{ fontSize: 11, color: t.textMuted, flex: 1 }}>
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: urgencyColor }}>
          {isToday ? "TODAY" : isPast ? `${Math.abs(daysAway)}d ago` : `T-${daysAway}`}
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {expCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.2)" }}>
            {expCount} EXP
          </span>
        )}
        {ftdCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
            {ftdCount} FTD
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {events.slice(0, 6).map(e => {
          const cfg = GROUP_CONFIG[e._group] ?? GROUP_CONFIG["Other"];
          return (
            <span key={e.id} style={{
              fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5,
              background: dk ? cfg.darkBg : cfg.bg, color: cfg.color,
              border: `1px solid ${cfg.color}25`,
              display: "flex", alignItems: "center", gap: 3,
            }}>
              {e.symbol}
            </span>
          );
        })}
        {events.length > 6 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: dk ? "#27272a" : "#f1f5f9", color: t.textMuted }}>
            +{events.length - 6}
          </span>
        )}
      </div>
    </div>
  );
});
UpcomingItem.displayName = "UpcomingItem";

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ dk }: { dk: boolean }) {
  const t = tok(dk);
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "4px 10px",
      padding: "6px 12px", borderTop: `1px solid ${t.border}`,
      flexShrink: 0, alignItems: "center",
      background: dk ? "#0a0a0e" : "#f8fafc",
    }}>
      {GROUP_ORDER.map(g => {
        const cfg = GROUP_CONFIG[g];
        return (
          <div key={g} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: t.textMuted }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
            {g}
          </div>
        );
      })}
      <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
        {[["#a855f7", "Expiry (top-right)"], ["#06b6d4", "FTD (top-left)"]] .map(([col, label]) => (
          <span key={label} style={{ fontSize: 10, fontWeight: 700, color: col, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: col, display: "inline-block" }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

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
  const t  = tok(dk);

  const defaultParams = useParameterDefaults(parameters);
  const [currentParams, setCurrentParams] = useState<ParameterValues>(
    () => initialWidgetState?.parameters ?? defaultParams
  );

  const today     = useMemo(() => getToday(), []);
  const todayKey  = useMemo(() => toDateKey(today), [today]);

  // ── View state ────────────────────────────────────────────────────────────
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(today);
    d.setDate(1);
    return d;
  });
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [viewMode, setViewMode]   = useState<ViewMode>("both");

  // ── Sidebar: show all vs. current month ───────────────────────────────────
  const [sidebarShowAll, setSidebarShowAll] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,         setSearch]         = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(() => new Set());
  const [symbolFilter,   setSymbolFilter]   = useState<Set<string>>(() => new Set());

  // ── Year-aware URL: appends ?year=XXXX ───────────────────────────────────
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

  // ── Per-year cache ────────────────────────────────────────────────────────
  const allEventsRef  = useRef<ExpiryEvent[]>([]);
  const yearCacheRef  = useRef<Record<number, ExpiryEvent[]>>({});
  const [parseVersion, setParseVersion] = useState(0);

  useEffect(() => {
    const source = staticData || raw;
    if (!source) return;
    const parsed = parseApiResponse(source, productGroupOverride);
    if (staticData) {
      allEventsRef.current = parsed;
    } else {
      yearCacheRef.current[viewYear] = parsed;
      allEventsRef.current = ([] as ExpiryEvent[]).concat(
        ...Object.values(yearCacheRef.current)
      );
    }
    setParseVersion(v => v + 1);
  }, [raw, staticData, productGroupOverride, viewYear]);

  // ── Derived filter options ────────────────────────────────────────────────
  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    allEventsRef.current.forEach(e => s.add(e._group));
    return GROUP_ORDER.filter(g => s.has(g));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  const availableSymbols = useMemo(() => {
    const s = new Set<string>();
    allEventsRef.current.forEach(e => s.add(e.symbol));
    return Array.from(s).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion]);

  // ── Filtered events ───────────────────────────────────────────────────────
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
          // For short queries (like "CL"), only match the most relevant identifiers
          if (!symbolMatch && !codeMatch) return false;
        } else {
          // For longer queries, search across all descriptive fields
          const productMatch  = e.productName.toLowerCase().includes(q);
          const exchangeMatch = e.exchange.toLowerCase().includes(q);
          if (!symbolMatch && !codeMatch && !productMatch && !exchangeMatch) return false;
        }
      }
      
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parseVersion, viewMode, search, categoryFilter, symbolFilter]);

  // ── Date→events map ───────────────────────────────────────────────────────
  const eventsByDate = useMemo<Record<string, ExpiryEvent[]>>(() => {
    const map: Record<string, ExpiryEvent[]> = {};
    filteredEvents.forEach(e => { (map[e.date] ??= []).push(e); });
    return map;
  }, [filteredEvents]);

  // ── Positions awareness ───────────────────────────────────────────────────
  const getPosition       = usePositionsStore((s) => s.getPosition);
  const posMarex          = usePositionsStore((s) => s.marex);
  const posExcel          = usePositionsStore((s) => s.excel);
  const setCalendarEvents = useAlertsStore((s) => s.setCalendarEvents);
  const refreshAlerts     = useAlertsStore((s) => s.refreshAlerts);

  // Map dateKey → true if any event on that day has an open position
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

  //── Upcoming list (sidebar) ───────────────────────────────────────────────
  const upcomingDates = useMemo(() => {
    return Object.keys(eventsByDate)
      .filter(key => {
        if (!sidebarShowAll) {
          // Only show current view month/year
          return key.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`);
        }
        return true;
      })
      .sort()
      .map(key => ({ key, events: eventsByDate[key] }));
  }, [eventsByDate, sidebarShowAll, viewYear, viewMonth]);

  // ── Calendar grid ─────────────────────────────────────────────────────────
  const monthLabel = useMemo(() => new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }), [viewYear, viewMonth]);

  const handlePrevMonth = useCallback(() => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
    setSelectedDateKey(null);
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
    setSelectedDateKey(null);
  }, []);

  const handleToday = useCallback(() => {
    const d = new Date(today);
    d.setDate(1);
    setViewDate(d);
    setSelectedDateKey(todayKey);
  }, [today, todayKey]);

  const gridCells = useMemo(() => {
    const cells: { day: number; dateKey: string; isCurrentMonth: boolean }[] = [];

    // Find the Monday of the week that contains the 1st of the month
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const jsDay0 = firstOfMonth.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const daysBack = jsDay0 === 0 ? 6 : jsDay0 - 1; // steps back to Monday
    const startDate = new Date(viewYear, viewMonth, 1 - daysBack);

    // Find the Friday of the week that contains the last day of the month
    const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const jsDay1 = lastOfMonth.getDay();
    const fwdMap: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 0, 6: 6 };
    const endDate = new Date(lastOfMonth);
    endDate.setDate(lastOfMonth.getDate() + fwdMap[jsDay1]);

    // Walk day-by-day, emit only Mon–Fri
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const dow = cur.getDay();
      if (dow >= 1 && dow <= 5) { // 1=Mon ... 5=Fri
        const d = cur.getDate();
        const y = cur.getFullYear();
        const m = cur.getMonth();
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

  const totalInView = filteredEvents.length;
  const expTotal    = filteredEvents.filter(e => e.dateType === "expiry").length;
  const ftdTotal    = filteredEvents.filter(e => e.dateType === "ftd").length;
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
      <div style={{
        display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
        background: t.bgPrimary,
        color: t.textPrimary,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}>

        {/* ── Toolbar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 10px",
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0, flexWrap: "wrap",
          background: dk ? "#0a0a0e" : "#f8fafc",
        }}>
          {/* Month nav */}
          <button onClick={handlePrevMonth} style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: t.textMuted, display: "flex" }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 800, minWidth: 150, textAlign: "center", color: t.textPrimary }}>
            {monthLabel}
          </span>
          <button onClick={handleNextMonth} style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: t.textMuted, display: "flex" }}>
            <ChevronRight size={17} />
          </button>
          <button onClick={handleToday} style={{
            padding: "4px 11px", fontSize: 12, fontWeight: 700, borderRadius: 6,
            border: `1px solid ${t.border}`, background: t.bgCard,
            color: t.textSec, cursor: "pointer",
            boxShadow: dk ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
          }}>
            Today
          </button>

          {/* Year fetch indicator */}
          {shouldFetch && !isYearCached && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "#d97706", display: "flex", alignItems: "center", gap: 3 }}>
              <RefreshCw size={9} style={{ animation: "spin 1s linear infinite" }} />
              Fetching {viewYear}…
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Stat pills */}
          {totalInView > 0 && (
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
                {totalInView}
              </span>
              {expTotal > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>
                  {expTotal} EXP
                </span>
              )}
              {ftdTotal > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: "rgba(6,182,212,0.12)", color: "#06b6d4" }}>
                  {ftdTotal} FTD
                </span>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <ViewModeToggle value={viewMode} onChange={setViewMode} dk={dk} />

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 9px", borderRadius: 7,
            border: `1px solid ${t.border}`,
            background: t.bgCard,
            minWidth: 110, maxWidth: 150,
            boxShadow: dk ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
          }}>
            <Search size={10} color={t.textMuted} />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 12, flex: 1, fontWeight: 500, color: t.textPrimary, minWidth: 0 }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={9} color={t.textMuted} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <FilterPopover trigger={
            <Chip active={categoryFilter.size > 0} dk={dk}>
              <Layers size={10} />
              {categoryFilter.size > 0 ? `${categoryFilter.size} Groups` : "Category"}
              <ChevronDown size={9} />
            </Chip>
          }>
            <div style={{ padding: "10px 14px 4px", borderBottom: "1px solid #2d2d38" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#71717a", letterSpacing: "0.06em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Commodity Group
                {categoryFilter.size > 0 && (
                  <button onClick={() => setCategoryFilter(new Set())} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: 10, fontWeight: 700 }}>Clear</button>
                )}
              </div>
            </div>
            <div style={{ padding: "6px 14px 10px" }}>
              {availableGroups.map(g => {
                const cfg = GROUP_CONFIG[g] ?? GROUP_CONFIG["Other"];
                const checked = categoryFilter.size === 0 || categoryFilter.has(g);
                return (
                  <label key={g} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px", cursor: "pointer" }}>
                    <CB checked={checked} onChange={() => {
                      setCategoryFilter(prev => {
                        // If everything is selected (empty set), select ONLY this one
                        if (prev.size === 0) return new Set([g]);
                        // Otherwise toggle
                        const next = new Set(prev);
                        next.has(g) ? next.delete(g) : next.add(g);
                        // If we manually toggled all or cleared all, return to empty set (all)
                        return (next.size === 0 || next.size === availableGroups.length) ? new Set() : next;
                      });
                    }} />
                    <span style={{ fontSize: 12, color: cfg.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, userSelect: "none" }}>
                      <span>{cfg.icon}</span>{g}
                    </span>
                  </label>
                );
              })}
            </div>
          </FilterPopover>

          {/* Symbol filter */}
          <FilterPopover trigger={
            <Chip active={symbolFilter.size > 0} dk={dk}>
              <Package size={10} />
              {symbolFilter.size > 0 ? `${symbolFilter.size} Symbols` : "Symbol"}
              <ChevronDown size={9} />
            </Chip>
          }>
            <div style={{ padding: "10px 14px 4px", borderBottom: "1px solid #2d2d38" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#71717a", letterSpacing: "0.06em", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Products / Symbols
                {symbolFilter.size > 0 && (
                  <button onClick={() => setSymbolFilter(new Set())} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: 10, fontWeight: 700 }}>Clear</button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", padding: "6px 14px 10px" }}>
              {availableSymbols.map(sym => {
                const group = PRODUCT_GROUPS[sym]?.groupName ?? "Other";
                const cfg   = GROUP_CONFIG[group] ?? GROUP_CONFIG["Other"];
                const checked = symbolFilter.size === 0 || symbolFilter.has(sym);
                const pName = allEventsRef.current.find(e => e.symbol === sym)?.productName ?? sym;
                return (
                  <label key={sym} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", cursor: "pointer" }}>
                    <CB checked={checked} onChange={() => {
                      setSymbolFilter(prev => {
                        // If everything is selected (empty set), select ONLY this one
                        if (prev.size === 0) return new Set([sym]);
                        // Otherwise toggle
                        const next = new Set(prev);
                        next.has(sym) ? next.delete(sym) : next.add(sym);
                        // If we manually toggled all or cleared all, return to empty set (all)
                        return (next.size === 0 || next.size === availableSymbols.length) ? new Set() : next;
                      });
                    }} />
                    <GroupDot group={group} size={6} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, minWidth: 28 }}>{sym}</span>
                    <span style={{ fontSize: 10, color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pName}</span>
                  </label>
                );
              })}
            </div>
          </FilterPopover>

          {hasActiveFilters && (
            <button onClick={clearFilters} style={{
              padding: "3px 7px", fontSize: 10, fontWeight: 700, borderRadius: 5,
              border: `1px solid ${t.border}`, background: "transparent",
              color: t.textMuted, cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
            }}>
              <X size={8} />Reset
            </button>
          )}
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

          {/* ── Upcoming sidebar ── */}
          <div style={{
            width: 186, flexShrink: 0,
            borderRight: `1px solid ${t.border}`,
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: "7px 12px 5px",
              borderBottom: `1px solid ${t.border}`,
              flexShrink: 0,
              background: dk ? "#0a0a0e" : "#f8fafc",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
                  <TrendingUp size={9} />
                  {sidebarShowAll
                    ? "All Dates"
                    : new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <button onClick={() => setSidebarShowAll(v => !v)} style={{
                  padding: "1px 5px", fontSize: 8, fontWeight: 700, borderRadius: 4,
                  border: `1px solid ${t.border}`, background: sidebarShowAll ? "rgba(59,130,246,0.12)" : "transparent",
                  color: sidebarShowAll ? "#3b82f6" : t.textMuted, cursor: "pointer",
                }}>
                  {sidebarShowAll ? "Month" : "All"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                {upcomingDates.length} dates
              </div>
            </div>

            {/* Sidebar list */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {upcomingDates.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, padding: 16 }}>
                  <Calendar size={22} color={t.textMuted} />
                  <span style={{ fontSize: 11, color: t.textMuted, textAlign: "center" }}>
                    {parseVersion > 0 ? "No data for this month" : "Loading…"}
                  </span>
                </div>
              ) : (
                upcomingDates.map(({ key, events }) => (
                  <UpcomingItem
                    key={key}
                    dateKey={key}
                    events={events}
                    dk={dk}
                    isSelected={selectedDateKey === key}
                    onClick={() => {
                      setSelectedDateKey(prev => prev === key ? null : key);
                      const d = isoToLocal(key);
                      const vd = new Date(d);
                      vd.setDate(1);
                      setViewDate(vd);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Calendar grid ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Weekday headers */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
              padding: "5px 8px 0", flexShrink: 0, gap: 3,
              background: dk ? "#0a0a0e" : "#f8fafc",
              borderBottom: `1px solid ${t.border}`,
            }}>
              {WEEKDAYS.map(d => (
                <div key={d} style={{
                  textAlign: "center", fontSize: 10, fontWeight: 800,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  color: d === "Sun" || d === "Sat" ? t.textMuted : t.textSec,
                  paddingBottom: 6,
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grid cells */}
            <div style={{
              flex: 1, display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gridAutoRows: "1fr",
              padding: "6px 8px 6px",
              gap: 3, overflow: "auto",
            }}>
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

            <Legend dk={dk} />
          </div>

          {/* ── Day detail panel ── */}
          {selectedDate && selectedEvents.length > 0 && (
            <div style={{ width: 256, flexShrink: 0, animation: "slideIn 0.16s cubic-bezier(.16,1,.3,1)" }}>
              <DayDetailPanel
                date={selectedDate}
                events={selectedEvents}
                dk={dk}
                onClose={() => setSelectedDateKey(null)}
                getPosition={getPosition}
              />
            </div>
          )}
        </div>

        <style>{`
          @keyframes slideIn  { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:none; } }
          @keyframes spin     { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
          *::-webkit-scrollbar       { width: 4px; height: 4px; }
          *::-webkit-scrollbar-track { background: transparent; }
          *::-webkit-scrollbar-thumb { background: ${dk ? "#27272a" : "#d1d5db"}; border-radius: 999px; }
        `}</style>
      </div>
    </WidgetContainer>
  );
};

export const ExpiryCalendarWidgetDef = { component: ExpiryCalendarWidget };
export default ExpiryCalendarWidget;
