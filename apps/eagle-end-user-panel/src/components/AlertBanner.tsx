import React, { useState } from "react";
import { useAlertsStore } from "@gsc-tech/eagle-widget-library";
import type { ExpiryAlert } from "@gsc-tech/eagle-widget-library";
import { AlertTriangle, X, ChevronDown, ChevronUp } from "lucide-react";

function SeverityBadge({ severity }: { severity: ExpiryAlert["severity"] }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
            background: severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(234,179,8,0.2)",
            color: severity === "critical" ? "#f87171" : "#fbbf24",
            border: `1px solid ${severity === "critical" ? "rgba(239,68,68,0.35)" : "rgba(234,179,8,0.35)"}`,
            letterSpacing: "0.05em", textTransform: "uppercase" as const,
        }}>
            {severity}
        </span>
    );
}

function AlertRow({ alert, onDismiss }: { alert: ExpiryAlert; onDismiss: (id: string) => void }) {
    const posColor = alert.activePosition > 0 ? "#60a5fa" : "#fb923c";
    const posLabel = alert.activePosition > 0 ? `+${alert.activePosition}` : String(alert.activePosition);

    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
            <SeverityBadge severity={alert.severity} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#e4e4e7", minWidth: 32 }}>
                {alert.symbol}
            </span>
            <span style={{ fontSize: 12, color: "#a1a1aa", fontWeight: 600 }}>
                {alert.contractCode}
            </span>
            <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                background: "rgba(168,85,247,0.15)", color: "#c084fc",
                border: "1px solid rgba(168,85,247,0.25)",
            }}>
                {alert.dateType === "expiry" ? "EXP" : "FTD"}
            </span>
            <span style={{ fontSize: 12, color: "#71717a" }}>
                {alert.daysUntilExpiry === 0 ? "Today" : `T-${alert.daysUntilExpiry}`}
            </span>
            <span style={{ fontSize: 12, fontWeight: 800, color: posColor, marginLeft: 4 }}>
                {posLabel}
            </span>
            <span style={{ flex: 1, fontSize: 11, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {alert.productName}
            </span>
            <button
                onClick={() => onDismiss(alert.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: 2, display: "flex", flexShrink: 0 }}
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
        <div style={{
            background: "linear-gradient(90deg, #1a0a0a 0%, #1c0f0f 100%)",
            borderBottom: "1px solid rgba(239,68,68,0.3)",
            flexShrink: 0,
            zIndex: 30,
            fontFamily: "'Inter', system-ui, sans-serif",
        }}>
            {/* Summary bar */}
            <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 20px",
            }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ef4444", display: "inline-block", boxShadow: "0 0 6px #ef4444" }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#fca5a5" }}>
                        {criticalCount > 0
                            ? `${criticalCount} critical alert${criticalCount > 1 ? "s" : ""} need your attention`
                            : `${active.length} alert${active.length > 1 ? "s" : ""} need your attention`}
                    </span>
                </span>

                <AlertTriangle size={15} color="#f87171" />

                <div style={{ flex: 1 }} />

                <button
                    onClick={() => setExpanded((v) => !v)}
                    style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                        background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.6)",
                        color: "#ffffff", cursor: "pointer",
                    }}
                >
                    Review
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                <button
                    onClick={markAll}
                    style={{
                        padding: "6px 14px", borderRadius: 6, fontSize: 13, fontWeight: 700,
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.35)",
                        color: "#ffffff", cursor: "pointer",
                    }}
                >
                    Mark addressed
                </button>
            </div>

            {/* Expanded alert list */}
            {expanded && (
                <div style={{
                    borderTop: "1px solid rgba(239,68,68,0.15)",
                    maxHeight: 320, overflowY: "auto",
                }}>
                    {/* Column headers */}
                    <div style={{
                        display: "flex", gap: 10, padding: "6px 16px",
                        background: "rgba(0,0,0,0.2)",
                        fontSize: 10, fontWeight: 700, color: "#52525b",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                    }}>
                        <span style={{ minWidth: 60 }}>Severity</span>
                        <span style={{ minWidth: 32 }}>Symbol</span>
                        <span style={{ minWidth: 44 }}>Contract</span>
                        <span style={{ minWidth: 36 }}>Type</span>
                        <span style={{ minWidth: 44 }}>Expires</span>
                        <span style={{ minWidth: 44 }}>Position</span>
                        <span style={{ flex: 1 }}>Product</span>
                    </div>
                    {active.map((alert) => (
                        <AlertRow key={alert.id} alert={alert} onDismiss={dismissAlert} />
                    ))}
                </div>
            )}
        </div>
    );
}
