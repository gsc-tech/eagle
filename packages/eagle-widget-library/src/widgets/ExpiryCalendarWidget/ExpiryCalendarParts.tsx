import React, { useCallback, useEffect, useState, useMemo, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePositionsStore } from "../../store/positionsStore";
import {
  type ExpiryEvent, type EventDateType, type ViewMode, type GetPositionFn,
  GROUP_CONFIG, GROUP_ORDER, DATE_TYPE_CONFIG,
  isoToLocal, getToday, getPositionForEvent, getPositionForEventByAccount,
} from "./expiryCalendarConfig";

// ─── FilterPopover ────────────────────────────────────────────────────────────

export function FilterPopover({ trigger, children }: { trigger: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const trigRef = useRef<HTMLDivElement>(null);
  const popRef  = useRef<HTMLDivElement>(null);
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
    <div className="inline-block">
      <div ref={trigRef} onClick={() => setOpen(o => !o)} className="cursor-pointer">{trigger}</div>
      {open && createPortal(
        <div
          ref={popRef}
          style={{ position: "fixed", top: coords.top, left: Math.min(coords.left, window.innerWidth - 264) }}
          className="z-[9999] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.15)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)] min-w-[240px] overflow-hidden animate-popover-in"
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────

export function CB({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      onClick={onChange}
      className={`shrink-0 w-3.5 h-3.5 rounded-[3px] inline-flex items-center justify-center cursor-pointer transition-all
        ${checked
          ? "border-[1.5px] border-blue-500 bg-blue-500"
          : "border-[1.5px] border-gray-400 dark:border-zinc-600 bg-transparent"
        }`}
    >
      {checked && (
        <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )}
    </span>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer text-xs font-semibold whitespace-nowrap transition-all select-none
        ${active
          ? "border-blue-500 bg-blue-500/10 text-blue-500"
          : "border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 shadow-sm dark:shadow-none"
        }`}
    >
      {children}
    </div>
  );
}

// ─── Group Dot ────────────────────────────────────────────────────────────────

export function GroupDot({ group, size = 8 }: { group: string; size?: number }) {
  const cfg = GROUP_CONFIG[group] ?? GROUP_CONFIG["Other"];
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: cfg.color }}
    />
  );
}

// ─── Date Type Pill ───────────────────────────────────────────────────────────

export function DateTypePill({ type, small = false }: { type: EventDateType; small?: boolean }) {
  const tc = DATE_TYPE_CONFIG[type];
  return (
    <span
      className="font-extrabold tracking-tight shrink-0 rounded"
      style={{
        fontSize: small ? 9 : 10,
        padding: small ? "1px 5px" : "2px 7px",
        background: tc.bg,
        color: tc.color,
        border: `1px solid ${tc.color}30`,
      }}
    >
      {tc.short}
    </span>
  );
}

// ─── View Mode Toggle ─────────────────────────────────────────────────────────

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden shrink-0 bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none">
      {(["expiry", "ftd", "both"] as ViewMode[]).map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-2.5 py-1 text-xs font-bold border-none cursor-pointer transition-all capitalize
            ${value === m
              ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-zinc-100"
              : "bg-transparent text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
            }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Event Badge ──────────────────────────────────────────────────────────────

export const EventBadge = memo(({ event, dk, activePosition, accountBreakdown }: {
  event: ExpiryEvent;
  dk: boolean;
  activePosition?: number;
  accountBreakdown?: { accountId: string; qty: number }[];
}) => {
  const cfg = GROUP_CONFIG[event._group] ?? GROUP_CONFIG["Other"];
  const hasBreakdown = (accountBreakdown?.length ?? 0) > 0;
  const hasPos = (activePosition !== undefined && activePosition !== 0) || hasBreakdown || (accountBreakdown?.length ?? 0) === 1;

  function fmtQty(q: number) {
    return q > 0 ? `+${q.toLocaleString()}` : q.toLocaleString();
  }

  const posColor = (activePosition ?? 0) > 0 ? "#3b82f6" : (activePosition ?? 0) < 0 ? "#f97316" : "#eab308";
  const posBg    = (activePosition ?? 0) > 0 ? "rgba(59,130,246,0.15)" : (activePosition ?? 0) < 0 ? "rgba(249,115,22,0.15)" : "rgba(234,179,8,0.15)";
  const posBorder= (activePosition ?? 0) > 0 ? "rgba(59,130,246,0.3)" : (activePosition ?? 0) < 0 ? "rgba(249,115,22,0.3)" : "rgba(234,179,8,0.4)";

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{
        background: dk ? cfg.darkBg : cfg.bg,
        border: `1px solid ${hasPos ? cfg.color + "55" : cfg.color + "25"}`,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-tl-lg rounded-bl-lg"
        style={{ background: DATE_TYPE_CONFIG[event.dateType].color }}
      />
      <div className="flex items-center gap-2 py-1.5 pr-3 pl-4">
        <GroupDot group={event._group} size={8} />
        <span className="font-extrabold text-[13px] tracking-tight min-w-[28px]" style={{ color: cfg.color }}>
          {event.symbol}
        </span>
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
          {event.contractCode}
        </span>
        <DateTypePill type={event.dateType} />
        {hasPos ? (
          <span
            className="ml-auto text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-tight"
            style={{ background: posBg, color: posColor, border: `1px solid ${posBorder}` }}
          >
            {(activePosition ?? 0) === 0 ? "±0" : (activePosition ?? 0) > 0 ? `+${activePosition}` : String(activePosition)}
          </span>
        ) : event.exchange ? (
          <span className="ml-auto text-[9px] font-bold tracking-widest text-gray-400 dark:text-zinc-500">
            {event.exchange}
          </span>
        ) : null}
      </div>
      {hasBreakdown && (
        <div className="flex flex-wrap gap-1 px-3 pb-1.5 pl-4 items-center">
          {accountBreakdown!.map(({ accountId, qty }) => (
            <span
              key={accountId}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded tracking-tight"
              style={{
                background: qty > 0 ? "rgba(59,130,246,0.1)" : qty < 0 ? "rgba(249,115,22,0.1)" : dk ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                color: qty > 0 ? "#60a5fa" : qty < 0 ? "#fb923c" : undefined,
                border: `1px solid ${qty > 0 ? "rgba(59,130,246,0.2)" : qty < 0 ? "rgba(249,115,22,0.2)" : "transparent"}`,
              }}
            >
              <span className="text-gray-400 dark:text-zinc-500 font-semibold">Acct {accountId}: </span>
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

export const DayCell = memo(({ day, events, isToday, isSelected, isCurrentMonth, dk, onClick, hasPosition }: {
  day: number; events: ExpiryEvent[]; isToday: boolean;
  isSelected: boolean; isCurrentMonth: boolean; dk: boolean; onClick: () => void;
  hasPosition?: boolean;
}) => {
  const hasEvents  = events.length > 0;
  const hasExpiry  = events.some(e => e.dateType === "expiry");
  const hasFTD     = events.some(e => e.dateType === "ftd");
  const expCount   = events.filter(e => e.dateType === "expiry").length;
  const ftdCount   = events.filter(e => e.dateType === "ftd").length;

  const uniqueGroups = useMemo(() => {
    const seen = new Set<string>();
    return events.filter(e => { if (seen.has(e._group)) return false; seen.add(e._group); return true; });
  }, [events]);

  const cellBg = isSelected
    ? "bg-blue-500/15"
    : isToday
    ? "bg-blue-500/[0.07] dark:bg-blue-500/[0.09]"
    : hasPosition
    ? "bg-amber-400/10 dark:bg-amber-400/[0.13]"
    : hasEvents
    ? "bg-black/[0.02] dark:bg-white/[0.03]"
    : "bg-transparent";

  const cellBorder = isSelected
    ? "border-[1.5px] border-blue-500"
    : isToday
    ? "border-[1.5px] border-blue-500/45"
    : hasPosition
    ? "border-2 border-amber-400/85"
    : hasEvents
    ? "border border-gray-200 dark:border-zinc-700"
    : "border border-transparent";

  const dayColor = isSelected || isToday
    ? "text-blue-500"
    : hasPosition
    ? "text-amber-400"
    : hasEvents
    ? "text-gray-900 dark:text-zinc-100"
    : "text-gray-400 dark:text-zinc-600";

  const dayWeight = isToday || isSelected ? "font-extrabold" : hasPosition || hasEvents ? "font-bold" : "font-medium";

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col items-center justify-start py-1.5 px-0.5 rounded-lg min-h-[52px]
        transition-all duration-150 overflow-hidden
        ${cellBg} ${cellBorder}
        ${hasEvents ? "cursor-pointer" : "cursor-default"}
        ${isCurrentMonth ? "opacity-100" : "opacity-20"}
      `}
    >
      <span className={`text-[15px] leading-none z-10 ${dayColor} ${dayWeight}`}>{day}</span>
      {hasEvents && (
        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
          {uniqueGroups.slice(0, 5).map(e => <GroupDot key={e._group} group={e._group} size={5} />)}
        </div>
      )}
      {hasEvents && (
        <div className="flex gap-0.5 mt-0.5">
          {expCount > 0 && <span className="text-[10px] font-extrabold text-purple-500 leading-none">{expCount}E</span>}
          {ftdCount > 0 && <span className="text-[10px] font-extrabold text-cyan-500 leading-none">{ftdCount}F</span>}
        </div>
      )}
      {hasExpiry && <div className="absolute top-[3px] right-[3px] w-[5px] h-[5px] rounded-full bg-purple-500" />}
      {hasFTD    && <div className="absolute top-[3px] left-[3px] w-[5px] h-[5px] rounded-full bg-cyan-500" />}
      {hasPosition && (
        <div className="absolute bottom-[3px] w-[7px] h-[7px] bg-amber-400 rounded-[1px] rotate-45 shadow-[0_0_4px_rgba(234,179,8,0.7)]" />
      )}
    </div>
  );
});
DayCell.displayName = "DayCell";

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

export const DayDetailPanel = memo(({ date, events, dk, onClose, getPosition }: {
  date: Date; events: ExpiryEvent[]; dk: boolean; onClose: () => void;
  getPosition: GetPositionFn;
}) => {
  const [tab, setTab] = useState<"all" | "expiry" | "ftd">("all");

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
    <div className="h-full flex flex-col bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-zinc-800">
      <div className="px-3.5 py-3 shrink-0 border-b border-gray-200 dark:border-zinc-800 flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] font-extrabold uppercase tracking-widest text-blue-500 mb-0.5">
            Contract Details
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-zinc-100">
            {date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </div>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
              {events.length} total
            </span>
            {expCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500">
                {expCount} Expiry
              </span>
            )}
            {ftdCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500">
                {ftdCount} FTD
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md border-none bg-gray-100 dark:bg-zinc-800 cursor-pointer text-gray-500 dark:text-zinc-400 shrink-0 flex items-center hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex shrink-0 border-b border-gray-200 dark:border-zinc-800 px-3.5">
        {([["all", "All"], ["expiry", "Expiry"], ["ftd", "FTD"]] as [string, string][]).map(([key, label]) => {
          const isActive = tab === key;
          const activeColor = key === "expiry" ? "text-purple-500 border-b-2 border-purple-500" : key === "ftd" ? "text-cyan-500 border-b-2 border-cyan-500" : "text-blue-500 border-b-2 border-blue-500";
          return (
            <button
              key={key}
              onClick={() => setTab(key as "all" | "expiry" | "ftd")}
              className={`px-3 py-2 text-xs font-bold bg-transparent border-none cursor-pointer transition-colors -mb-px border-b-2
                ${isActive ? activeColor : "text-gray-400 dark:text-zinc-500 border-transparent"}`}
            >
              {label}
              {key !== "all" && (
                <span className="ml-1 text-[9px]">({key === "expiry" ? expCount : ftdCount})</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 widget-scrollbar">
        {displayed.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-zinc-500 text-[11px]">No contracts of this type</div>
        ) : (
          <>
            {withPos.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="w-[7px] h-[7px] bg-amber-400 rounded-[1px] rotate-45 inline-block shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">Open Positions</span>
                  <span className="text-[9px] font-semibold text-gray-400 dark:text-zinc-500">({withPos.length})</span>
                </div>
                <div className="flex flex-col gap-1">{withPos.map(renderBadge)}</div>
              </div>
            )}
            {withoutPos.length > 0 && (
              <>
                {withPos.length > 0 && (
                  <div className="text-[9px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-zinc-500 mb-2 pt-1 border-t border-gray-200 dark:border-zinc-800">
                    Other Contracts
                  </div>
                )}
                {GROUP_ORDER.concat(["Other"]).map(group => {
                  const evts = byGroup[group];
                  if (!evts?.length) return null;
                  const cfg = GROUP_CONFIG[group] ?? GROUP_CONFIG["Other"];
                  return (
                    <div key={group} className="mb-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs">{cfg.icon}</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest" style={{ color: cfg.color }}>{group}</span>
                        <span className="text-[9px] font-semibold text-gray-400 dark:text-zinc-500">({evts.length})</span>
                      </div>
                      <div className="flex flex-col gap-1">{evts.map(renderBadge)}</div>
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

export const UpcomingItem = memo(({ dateKey, events, dk, isSelected, onClick }: {
  dateKey: string; events: ExpiryEvent[]; dk: boolean; isSelected: boolean; onClick: () => void;
}) => {
  const today = useMemo(() => getToday(), []);
  const date  = isoToLocal(dateKey);
  const daysAway = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  const isPast   = daysAway < 0;
  const isToday  = daysAway === 0;

  const expCount = events.filter(e => e.dateType === "expiry").length;
  const ftdCount = events.filter(e => e.dateType === "ftd").length;

  const urgencyCls = isToday ? "text-red-500" : (!isPast && daysAway <= 3) ? "text-orange-500" : daysAway <= 7 ? "text-amber-500" : "text-gray-400 dark:text-zinc-500";

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 border-b border-gray-200 dark:border-zinc-800 cursor-pointer transition-colors border-l-[3px]
        ${isPast ? "opacity-45" : ""}
        ${isSelected
          ? "bg-blue-500/[0.06] dark:bg-blue-500/[0.09] border-l-blue-500"
          : "bg-transparent border-l-transparent hover:bg-gray-50 dark:hover:bg-zinc-900"
        }`}
    >
      <div className="flex items-baseline gap-1.5 mb-0.5">
        <span className="text-[13px] font-extrabold text-gray-900 dark:text-zinc-100">
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span className="text-[11px] text-gray-400 dark:text-zinc-500 flex-1">
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
        <span className={`text-[11px] font-extrabold ${urgencyCls}`}>
          {isToday ? "TODAY" : isPast ? `${Math.abs(daysAway)}d ago` : `T-${daysAway}`}
        </span>
      </div>
      <div className="flex gap-1 mb-1">
        {expCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
            {expCount} EXP
          </span>
        )}
        {ftdCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            {ftdCount} FTD
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-0.5">
        {events.slice(0, 6).map(e => {
          const cfg = GROUP_CONFIG[e._group] ?? GROUP_CONFIG["Other"];
          return (
            <span
              key={e.id}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
              style={{
                background: dk ? cfg.darkBg : cfg.bg,
                color: cfg.color,
                border: `1px solid ${cfg.color}25`,
              }}
            >
              {e.symbol}
            </span>
          );
        })}
        {events.length > 6 && (
          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500">
            +{events.length - 6}
          </span>
        )}
      </div>
    </div>
  );
});
UpcomingItem.displayName = "UpcomingItem";

// ─── Legend ───────────────────────────────────────────────────────────────────

export function Legend() {
  return (
    <div className="flex flex-wrap gap-x-2.5 gap-y-1 px-3 py-1.5 border-t border-gray-200 dark:border-zinc-800 shrink-0 items-center bg-gray-50 dark:bg-zinc-950">
      {GROUP_ORDER.map(g => {
        const cfg = GROUP_CONFIG[g];
        return (
          <div key={g} className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 dark:text-zinc-500">
            <span className="inline-block rounded-full w-[7px] h-[7px]" style={{ background: cfg.color }} />
            {g}
          </div>
        );
      })}
      <div className="ml-auto flex gap-2.5">
        {[["#a855f7", "Expiry (top-right)"], ["#06b6d4", "FTD (top-left)"]] .map(([col, label]) => (
          <span key={label} className="text-[10px] font-bold flex items-center gap-1" style={{ color: col }}>
            <span className="inline-block rounded-full w-[7px] h-[7px]" style={{ background: col }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
