import React from "react";
import { useAlertsStore } from "@gsc-tech/eagle-widget-library";
import type { ExpiryAlert } from "@gsc-tech/eagle-widget-library";
import { Bell, X, CheckCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertHistoryPanelProps {
    open: boolean;
    onClose: () => void;
}

function SeverityBadge({ severity }: { severity: ExpiryAlert["severity"] }) {
    return (
        <span className={cn(
            "text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-[0.05em] border shrink-0",
            severity === "critical"
                ? "bg-red-500/20 text-red-400 border-red-500/[0.4]"
                : "bg-yellow-500/20 text-yellow-400 border-yellow-500/[0.4]"
        )}>
            {severity}
        </span>
    );
}

function HistoryAlertRow({
    alert,
    onDismiss,
    addressed,
}: {
    alert: ExpiryAlert;
    onDismiss?: (id: string) => void;
    addressed: boolean;
}) {
    return (
        <div className={cn(
            "flex items-center gap-2 px-4 py-[9px] border-b border-white/[0.05] transition-opacity duration-150",
            addressed ? "opacity-[0.45]" : "opacity-100"
        )}>
            <SeverityBadge severity={alert.severity} />
            <span className="text-[13px] font-extrabold text-zinc-200 min-w-[30px]">
                {alert.symbol}
            </span>
            <span className="text-xs text-zinc-400 font-semibold">
                {alert.contractCode}
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/25 shrink-0">
                {alert.dateType === "expiry" ? "EXP" : "FTD"}
            </span>
            <span className="text-[11px] text-zinc-500 shrink-0">
                {alert.daysUntilExpiry === 0 ? "Today" : alert.daysUntilExpiry < 0 ? `${Math.abs(alert.daysUntilExpiry)}d ago` : `T-${alert.daysUntilExpiry}`}
            </span>
            <span className={cn("text-xs font-extrabold shrink-0", alert.activePosition > 0 ? "text-blue-400" : "text-orange-400")}>
                {alert.activePosition > 0 ? `+${alert.activePosition}` : String(alert.activePosition)}
            </span>
            <span className="flex-1 text-[10px] text-zinc-600 truncate">
                {alert.productName}
            </span>
            {!addressed && onDismiss && (
                <button
                    onClick={() => onDismiss(alert.id)}
                    title="Mark addressed"
                    className="bg-white/[0.06] border border-white/15 rounded cursor-pointer text-zinc-400 py-[3px] px-[7px] flex items-center gap-[3px] shrink-0 text-[10px] font-bold"
                >
                    <CheckCheck size={11} />
                    Done
                </button>
            )}
            {addressed && (
                <span className="text-[10px] text-green-500 font-bold shrink-0 flex items-center gap-[3px]">
                    <CheckCheck size={11} /> addressed
                </span>
            )}
        </div>
    );
}

export function AlertHistoryPanel({ open, onClose }: AlertHistoryPanelProps) {
    const alerts       = useAlertsStore((s) => s.alerts);
    const markAll      = useAlertsStore((s) => s.markAllAddressed);
    const dismissAlert = useAlertsStore((s) => s.dismissAlert);

    const active    = alerts.filter((a) => !a.addressed).sort((a, b) => {
        if (a.severity === b.severity) return a.daysUntilExpiry - b.daysUntilExpiry;
        return a.severity === "critical" ? -1 : 1;
    });
    const addressed = alerts.filter((a) => a.addressed);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-[9997] bg-black/40 backdrop-blur-[1px]"
                />
            )}

            {/* Slide-in panel */}
            <div className={cn(
                "fixed top-0 right-0 bottom-0 w-[460px] z-[9998] bg-[#111115] border-l border-zinc-800 flex flex-col shadow-[-16px_0_48px_rgba(0,0,0,0.6)] transition-transform duration-[220ms] ease-[cubic-bezier(.16,1,.3,1)]",
                open ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center gap-2.5 px-[18px] pt-4 pb-3.5 border-b border-zinc-800 shrink-0 bg-[#0d0d10]">
                    <Bell size={17} className="text-blue-500" />
                    <div className="flex-1">
                        <div className="text-sm font-extrabold text-zinc-200">Alert History</div>
                        <div className="flex gap-2 mt-1">
                            {active.length > 0 && (
                                <span className="text-[10px] font-bold px-[7px] py-px rounded bg-red-500/15 text-red-200 border border-red-500/30">
                                    {active.length} active
                                </span>
                            )}
                            {addressed.length > 0 && (
                                <span className="text-[10px] font-bold px-[7px] py-px rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                    {addressed.length} addressed
                                </span>
                            )}
                            {alerts.length === 0 && (
                                <span className="text-[11px] text-zinc-600">No alerts yet</span>
                            )}
                        </div>
                    </div>
                    {active.length > 0 && (
                        <button
                            onClick={markAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-white/[0.07] border border-white/20 text-white cursor-pointer"
                        >
                            <CheckCheck size={13} />
                            Mark all done
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-white/[0.06] border border-white/10 rounded-md cursor-pointer text-zinc-400 p-1.5 flex shrink-0"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
                            <AlertTriangle size={32} className="text-zinc-800" />
                            <span className="text-[13px] text-zinc-600 text-center">
                                No alerts have been generated yet.<br />
                                Alerts appear when you hold positions near expiry.
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Active section */}
                            {active.length > 0 && (
                                <div>
                                    <div className="px-4 pt-2 pb-1.5 bg-red-500/[0.05] border-b border-red-500/15 text-[10px] font-extrabold text-red-400 uppercase tracking-[0.08em] flex items-center gap-1.5">
                                        <span className="size-1.5 rounded-full bg-red-500 inline-block shadow-[0_0_5px_#ef4444]" />
                                        Active — {active.length}
                                    </div>
                                    {/* Column headers */}
                                    <div className="flex gap-2 px-4 py-[5px] bg-black/25 text-[9px] font-bold text-zinc-700 uppercase tracking-[0.07em]">
                                        <span className="min-w-16">Severity</span>
                                        <span className="min-w-[30px]">Symbol</span>
                                        <span className="min-w-11">Contract</span>
                                        <span className="min-w-[34px]">Type</span>
                                        <span className="min-w-11">Expires</span>
                                        <span className="min-w-[38px]">Pos</span>
                                        <span className="flex-1">Product</span>
                                    </div>
                                    {active.map((alert) => (
                                        <HistoryAlertRow
                                            key={alert.id}
                                            alert={alert}
                                            addressed={false}
                                            onDismiss={dismissAlert}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Addressed section */}
                            {addressed.length > 0 && (
                                <div>
                                    <div className={cn(
                                        "px-4 pt-2 pb-1.5 bg-green-500/[0.04] border-b border-green-500/10 text-[10px] font-extrabold text-green-400 uppercase tracking-[0.08em] flex items-center gap-1.5",
                                        active.length > 0 && "border-t border-zinc-800"
                                    )}>
                                        <CheckCheck size={11} />
                                        Addressed — {addressed.length}
                                    </div>
                                    {/* Column headers */}
                                    <div className="flex gap-2 px-4 py-[5px] bg-black/25 text-[9px] font-bold text-zinc-700 uppercase tracking-[0.07em]">
                                        <span className="min-w-16">Severity</span>
                                        <span className="min-w-[30px]">Symbol</span>
                                        <span className="min-w-11">Contract</span>
                                        <span className="min-w-[34px]">Type</span>
                                        <span className="min-w-11">Expires</span>
                                        <span className="min-w-[38px]">Pos</span>
                                        <span className="flex-1">Product</span>
                                    </div>
                                    {addressed.map((alert) => (
                                        <HistoryAlertRow
                                            key={alert.id}
                                            alert={alert}
                                            addressed={true}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
