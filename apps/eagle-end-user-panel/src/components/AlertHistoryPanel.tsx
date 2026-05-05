import React from "react";
import { useAlertsStore } from "@gsc-tech/eagle-widget-library";
import type { ExpiryAlert } from "@gsc-tech/eagle-widget-library";
import { Bell, X, CheckCheck, AlertTriangle } from "lucide-react";

interface AlertHistoryPanelProps {
    open: boolean;
    onClose: () => void;
}

function SeverityBadge({ severity }: { severity: ExpiryAlert["severity"] }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
            background: severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)",
            color: severity === "critical" ? "#f87171" : "#fbbf24",
            border: `1px solid ${severity === "critical" ? "rgba(239,68,68,0.4)" : "rgba(234,179,8,0.4)"}`,
            letterSpacing: "0.05em", textTransform: "uppercase" as const, flexShrink: 0,
        }}>
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
    const posColor = alert.activePosition > 0 ? "#60a5fa" : "#fb923c";
    const posLabel = alert.activePosition > 0 ? `+${alert.activePosition}` : String(alert.activePosition);

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            opacity: addressed ? 0.45 : 1,
            transition: "opacity 0.15s",
        }}>
            <SeverityBadge severity={alert.severity} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", minWidth: 30 }}>
                {alert.symbol}
            </span>
            <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>
                {alert.contractCode}
            </span>
            <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                background: "rgba(168,85,247,0.15)", color: "#c084fc",
                border: "1px solid rgba(168,85,247,0.25)", flexShrink: 0,
            }}>
                {alert.dateType === "expiry" ? "EXP" : "FTD"}
            </span>
            <span style={{ fontSize: 11, color: "#71717a", flexShrink: 0 }}>
                {alert.daysUntilExpiry === 0 ? "Today" : `T-${alert.daysUntilExpiry}`}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: posColor, flexShrink: 0 }}>
                {posLabel}
            </span>
            <span style={{ flex: 1, fontSize: 10, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {alert.productName}
            </span>
            {!addressed && onDismiss && (
                <button
                    onClick={() => onDismiss(alert.id)}
                    title="Mark addressed"
                    style={{
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 5, cursor: "pointer", color: "#a1a1aa", padding: "3px 7px",
                        display: "flex", alignItems: "center", gap: 3, flexShrink: 0,
                        fontSize: 10, fontWeight: 700,
                    }}
                >
                    <CheckCheck size={11} />
                    Done
                </button>
            )}
            {addressed && (
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
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

    const active    = alerts.filter((a) => !a.addressed);
    const addressed = alerts.filter((a) => a.addressed);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    onClick={onClose}
                    style={{
                        position: "fixed", inset: 0, zIndex: 9997,
                        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(1px)",
                    }}
                />
            )}

            {/* Slide-in panel */}
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0,
                width: 460, zIndex: 9998,
                background: "#111115",
                borderLeft: "1px solid #27272a",
                display: "flex", flexDirection: "column",
                fontFamily: "'Inter', system-ui, sans-serif",
                boxShadow: "-16px 0 48px rgba(0,0,0,0.6)",
                transform: open ? "translateX(0)" : "translateX(100%)",
                transition: "transform 0.22s cubic-bezier(.16,1,.3,1)",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "16px 18px 14px",
                    borderBottom: "1px solid #27272a",
                    flexShrink: 0,
                    background: "#0d0d10",
                }}>
                    <Bell size={17} color="#3b82f6" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#e4e4e7" }}>Alert History</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            {active.length > 0 && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4,
                                    background: "rgba(239,68,68,0.15)", color: "#fca5a5",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                }}>
                                    {active.length} active
                                </span>
                            )}
                            {addressed.length > 0 && (
                                <span style={{
                                    fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 4,
                                    background: "rgba(34,197,94,0.1)", color: "#4ade80",
                                    border: "1px solid rgba(34,197,94,0.2)",
                                }}>
                                    {addressed.length} addressed
                                </span>
                            )}
                            {alerts.length === 0 && (
                                <span style={{ fontSize: 11, color: "#52525b" }}>No alerts yet</span>
                            )}
                        </div>
                    </div>
                    {active.length > 0 && (
                        <button
                            onClick={markAll}
                            style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.2)",
                                color: "#ffffff", cursor: "pointer",
                            }}
                        >
                            <CheckCheck size={13} />
                            Mark all done
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        style={{
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6, cursor: "pointer", color: "#a1a1aa",
                            padding: 6, display: "flex", flexShrink: 0,
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                    {alerts.length === 0 ? (
                        <div style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            justifyContent: "center", height: "100%", gap: 12, padding: 32,
                        }}>
                            <AlertTriangle size={32} color="#27272a" />
                            <span style={{ fontSize: 13, color: "#52525b", textAlign: "center" }}>
                                No alerts have been generated yet.<br />
                                Alerts appear when you hold positions near expiry.
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Active section */}
                            {active.length > 0 && (
                                <div>
                                    <div style={{
                                        padding: "8px 16px 6px",
                                        background: "rgba(239,68,68,0.05)",
                                        borderBottom: "1px solid rgba(239,68,68,0.15)",
                                        fontSize: 10, fontWeight: 800, color: "#f87171",
                                        textTransform: "uppercase", letterSpacing: "0.08em",
                                        display: "flex", alignItems: "center", gap: 6,
                                    }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", display: "inline-block", boxShadow: "0 0 5px #ef4444" }} />
                                        Active — {active.length}
                                    </div>
                                    {/* Column headers */}
                                    <div style={{
                                        display: "flex", gap: 8, padding: "5px 16px",
                                        background: "rgba(0,0,0,0.25)",
                                        fontSize: 9, fontWeight: 700, color: "#3f3f46",
                                        textTransform: "uppercase", letterSpacing: "0.07em",
                                    }}>
                                        <span style={{ minWidth: 64 }}>Severity</span>
                                        <span style={{ minWidth: 30 }}>Symbol</span>
                                        <span style={{ minWidth: 44 }}>Contract</span>
                                        <span style={{ minWidth: 34 }}>Type</span>
                                        <span style={{ minWidth: 44 }}>Expires</span>
                                        <span style={{ minWidth: 38 }}>Pos</span>
                                        <span style={{ flex: 1 }}>Product</span>
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
                                    <div style={{
                                        padding: "8px 16px 6px",
                                        background: "rgba(34,197,94,0.04)",
                                        borderTop: active.length > 0 ? "1px solid #27272a" : undefined,
                                        borderBottom: "1px solid rgba(34,197,94,0.1)",
                                        fontSize: 10, fontWeight: 800, color: "#4ade80",
                                        textTransform: "uppercase", letterSpacing: "0.08em",
                                        display: "flex", alignItems: "center", gap: 6,
                                    }}>
                                        <CheckCheck size={11} />
                                        Addressed — {addressed.length}
                                    </div>
                                    {/* Column headers */}
                                    <div style={{
                                        display: "flex", gap: 8, padding: "5px 16px",
                                        background: "rgba(0,0,0,0.25)",
                                        fontSize: 9, fontWeight: 700, color: "#3f3f46",
                                        textTransform: "uppercase", letterSpacing: "0.07em",
                                    }}>
                                        <span style={{ minWidth: 64 }}>Severity</span>
                                        <span style={{ minWidth: 30 }}>Symbol</span>
                                        <span style={{ minWidth: 44 }}>Contract</span>
                                        <span style={{ minWidth: 34 }}>Type</span>
                                        <span style={{ minWidth: 44 }}>Expires</span>
                                        <span style={{ minWidth: 38 }}>Pos</span>
                                        <span style={{ flex: 1 }}>Product</span>
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
