import React, { useState } from "react";
import { useAlertsStore } from "@gsc-tech/eagle-widget-library";
import type { ExpiryAlert } from "@gsc-tech/eagle-widget-library";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function SeverityBadge({ severity }: { severity: ExpiryAlert["severity"] }) {
    return (
        <span className={cn(
            "text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-[0.05em] border",
            severity === "critical"
                ? "bg-red-500/20 text-red-400 border-red-500/35"
                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/35"
        )}>
            {severity}
        </span>
    );
}

function AlertRow({ alert, onDismiss }: { alert: ExpiryAlert; onDismiss: (id: string) => void }) {
    return (
        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.06]">
            <SeverityBadge severity={alert.severity} />
            <span className="text-[13px] font-extrabold text-zinc-200 min-w-8">
                {alert.symbol}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">
                {alert.contractCode}
            </span>
            <span className="text-[11px] font-bold px-[7px] py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25">
                {alert.dateType === "expiry" ? "EXP" : "FTD"}
            </span>
            <span className="text-xs text-zinc-500">
                {alert.daysUntilExpiry === 0 ? "Today" : `T-${alert.daysUntilExpiry}`}
            </span>
            <span className={cn("text-xs font-extrabold ml-1", alert.activePosition > 0 ? "text-blue-400" : "text-orange-400")}>
                {alert.activePosition > 0 ? `+${alert.activePosition}` : String(alert.activePosition)}
            </span>
            <span className="flex-1 text-[11px] text-zinc-600 truncate">
                {alert.productName}
            </span>
            <button
                onClick={() => onDismiss(alert.id)}
                className="bg-transparent border-none cursor-pointer text-zinc-500 p-0.5 flex shrink-0"
            >
                <X size={13} />
            </button>
        </div>
    );
}

export function AlertBanner() {
    const alerts        = useAlertsStore((s) => s.alerts);
    const markAll       = useAlertsStore((s) => s.markAllAddressed);
    const dismissAlert  = useAlertsStore((s) => s.dismissAlert);
    const [expanded, setExpanded] = useState(false);

    const active = alerts.filter((a) => !a.addressed);
    if (active.length === 0) return null;

    const criticalCount = active.filter((a) => a.severity === "critical").length;

    return (
        <div className="bg-gradient-to-r from-[#1a0a0a] to-[#1c0f0f] border-b border-red-500/30 shrink-0 z-30">
            {/* Summary bar */}
            <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="flex items-center gap-1.5">
                    <span className="size-[9px] rounded-full bg-red-500 inline-block shadow-[0_0_6px_#ef4444]" />
                    <span className="text-sm font-extrabold text-red-300">
                        {criticalCount > 0
                            ? `${criticalCount} critical alert${criticalCount > 1 ? "s" : ""} need your attention`
                            : `${active.length} alert${active.length > 1 ? "s" : ""} need your attention`}
                    </span>
                </span>

                <AlertTriangle size={15} className="text-red-400" />

                <div className="flex-1" />

                <button
                    onClick={() => setExpanded((v) => !v)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[13px] font-bold bg-red-500/25 border border-red-500/60 text-white cursor-pointer"
                >
                    Review
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <button
                    onClick={markAll}
                    className="px-3.5 py-1.5 rounded-md text-[13px] font-bold bg-white/[0.07] border border-white/35 text-white cursor-pointer"
                >
                    Mark addressed
                </button>
            </div>

            {/* Expanded alert list */}
            {expanded && (
                <div className="border-t border-red-500/15 max-h-80 overflow-y-auto">
                    {/* Column headers */}
                    <div className="flex gap-2.5 px-4 py-1.5 bg-black/20 text-[10px] font-bold text-zinc-600 uppercase tracking-[0.07em]">
                        <span className="min-w-[60px]">Severity</span>
                        <span className="min-w-8">Symbol</span>
                        <span className="min-w-11">Contract</span>
                        <span className="min-w-9">Type</span>
                        <span className="min-w-11">Expires</span>
                        <span className="min-w-11">Position</span>
                        <span className="flex-1">Product</span>
                    </div>
                    {active.map((alert) => (
                        <AlertRow key={alert.id} alert={alert} onDismiss={dismissAlert} />
                    ))}
                </div>
            )}
        </div>
    );
}
