import React, { useState } from "react";
import { useConnectorsStore } from "@/store/connectorsStore";
import type { DataConnectorConfig } from "@/store/connectorsStore";
import type { ConnectorType, ConnectorStatus } from "@gsc-tech/eagle-widget-library";
import { Plus, Trash2, Wifi, WifiOff, Loader, AlertCircle, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfigProps {
    /** Live status for each connector id, provided by the parent via useDataConnectorSync. */
    statuses: Record<string, ConnectorStatus>;
    onClose: () => void;
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ConnectorStatus }) {
    const map: Record<ConnectorStatus, { color: string; icon: React.ReactNode }> = {
        connected:  { color: "#22c55e", icon: <Wifi size={10} /> },
        connecting: { color: "#eab308", icon: <Loader size={10} style={{ animation: "spin 1s linear infinite" }} /> },
        error:      { color: "#ef4444", icon: <AlertCircle size={10} /> },
        failed:     { color: "#ef4444", icon: <WifiOff size={10} /> },
        idle:       { color: "#52525b", icon: <WifiOff size={10} /> },
    };
    const { color, icon } = map[status] ?? map.idle;
    return (
        <span style={{ display: "flex", alignItems: "center", gap: 4, color, fontSize: 10, fontWeight: 700 }}>
            {icon}
            <span style={{ textTransform: "capitalize" }}>{status}</span>
        </span>
    );
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK: Omit<DataConnectorConfig, "id"> = {
    type: "marex",
    name: "",
    wsUrl: "",
    accountId: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ConnectorConfig({ statuses, onClose }: ConnectorConfigProps) {
    const connectors      = useConnectorsStore((s) => s.connectors);
    const upsertConnector = useConnectorsStore((s) => s.upsertConnector);
    const removeConnector = useConnectorsStore((s) => s.removeConnector);

    const [adding, setAdding]   = useState(false);
    const [editId, setEditId]   = useState<string | null>(null);
    const [form, setForm]       = useState<Omit<DataConnectorConfig, "id">>(BLANK);
    const [error, setError]     = useState<string | null>(null);

    const openAdd = () => { setForm(BLANK); setEditId(null); setError(null); setAdding(true); };
    const openEdit = (c: DataConnectorConfig) => { setForm({ type: c.type, name: c.name, wsUrl: c.wsUrl, accountId: c.accountId }); setEditId(c.id); setError(null); setAdding(true); };
    const cancelForm = () => { setAdding(false); setEditId(null); setError(null); };

    const handleSave = () => {
        if (!form.wsUrl.trim())    { setError("WebSocket URL is required."); return; }
        if (!form.accountId.trim()) { setError("Account ID is required."); return; }
        const id = editId ?? `${form.type}_${Date.now()}`;
        upsertConnector({ id, ...form, name: form.name.trim() || `${form.type === "marex" ? "Marex" : "Excel"} Connector` });
        cancelForm();
    };

    const inputStyle: React.CSSProperties = {
        width: "100%", padding: "6px 10px", borderRadius: 6,
        background: "#18181b", border: "1px solid #27272a",
        color: "#e4e4e7", fontSize: 12, outline: "none",
        boxSizing: "border-box",
    };
    const labelStyle: React.CSSProperties = {
        fontSize: 10, fontWeight: 700, color: "#71717a",
        textTransform: "uppercase", letterSpacing: "0.06em",
        display: "block", marginBottom: 4,
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)",
        }}>
            <div style={{
                background: "#111115", border: "1px solid #27272a", borderRadius: 14,
                width: 480, maxHeight: "90vh", overflowY: "auto",
                boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                fontFamily: "'Inter', system-ui, sans-serif",
            }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 12px", borderBottom: "1px solid #1e1e24" }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#e4e4e7" }}>Data Connectors</div>
                        <div style={{ fontSize: 11, color: "#71717a", marginTop: 2 }}>Configure live positions data sources</div>
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", display: "flex" }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Connector list */}
                <div style={{ padding: "10px 18px" }}>
                    {connectors.length === 0 && !adding && (
                        <div style={{ textAlign: "center", padding: "24px 0", color: "#52525b", fontSize: 12 }}>
                            No connectors configured. Add one below.
                        </div>
                    )}

                    {connectors.map((c) => (
                        <div key={c.id} style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                            background: "#18181b", border: "1px solid #27272a",
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{c.name}</span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                                        background: c.type === "marex" ? "rgba(99,102,241,0.15)" : "rgba(34,197,94,0.15)",
                                        color: c.type === "marex" ? "#818cf8" : "#4ade80",
                                        border: `1px solid ${c.type === "marex" ? "rgba(99,102,241,0.3)" : "rgba(34,197,94,0.3)"}`,
                                        textTransform: "uppercase",
                                    }}>
                                        {c.type}
                                    </span>
                                </div>
                                <div style={{ fontSize: 10, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.wsUrl} · acct {c.accountId}
                                </div>
                            </div>
                            <StatusDot status={statuses[c.id] ?? "idle"} />
                            <button onClick={() => openEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#3b82f6", fontWeight: 700 }}>Edit</button>
                            <button onClick={() => removeConnector(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", display: "flex" }}>
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}

                    {/* Inline add/edit form */}
                    {adding ? (
                        <div style={{ padding: "12px", borderRadius: 8, background: "#18181b", border: "1px solid #3b82f6", marginTop: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#93c5fd", marginBottom: 12 }}>
                                {editId ? "Edit Connector" : "New Connector"}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                                <div>
                                    <label style={labelStyle}>Type</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ConnectorType }))}
                                        style={{ ...inputStyle }}
                                    >
                                        <option value="marex">Marex (Risk)</option>
                                        <option value="excel">Excel (Positions)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Name (optional)</label>
                                    <input
                                        type="text" placeholder="e.g. Marex – Desk A"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 10 }}>
                                <label style={labelStyle}>WebSocket URL</label>
                                <input
                                    type="text" placeholder="wss://your-api.example.com/ws"
                                    value={form.wsUrl}
                                    onChange={(e) => setForm((f) => ({ ...f, wsUrl: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Account ID</label>
                                <input
                                    type="text" placeholder="e.g. 22983"
                                    value={form.accountId}
                                    onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                                    style={inputStyle}
                                />
                            </div>

                            {error && (
                                <div style={{ fontSize: 11, color: "#f87171", marginBottom: 10 }}>{error}</div>
                            )}

                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                <button onClick={cancelForm} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                    Cancel
                                </button>
                                <button onClick={handleSave} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={openAdd}
                            style={{
                                display: "flex", alignItems: "center", gap: 6,
                                width: "100%", padding: "8px 12px", marginTop: 6,
                                borderRadius: 8, border: "1px dashed #27272a",
                                background: "transparent", color: "#52525b",
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                        >
                            <Plus size={13} />
                            Add connector
                        </button>
                    )}
                </div>

                <div style={{ height: 10 }} />
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}