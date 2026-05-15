import React, { useState } from "react";
import { useConnectorsStore, NATIVE_CONNECTOR_URLS } from "@/store/connectorsStore";
import type { DataConnectorConfig } from "@/store/connectorsStore";
import type { ConnectorType, ConnectorStatus } from "@gsc-tech/eagle-widget-library";
import { Plus, Trash2, Wifi, WifiOff, Loader, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectorConfigProps {
    /** Live status for each connector id, provided by the parent via useDataConnectorSync. */
    statuses: Record<string, ConnectorStatus>;
    onClose: () => void;
}

// ─── Status Dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ConnectorStatus }) {
    const colorClass: Record<ConnectorStatus, string> = {
        connected:  "text-green-500",
        connecting: "text-yellow-500",
        error:      "text-red-500",
        failed:     "text-red-500",
        idle:       "text-zinc-600",
    };
    const icons: Record<ConnectorStatus, React.ReactNode> = {
        connected:  <Wifi size={10} />,
        connecting: <Loader size={10} className="animate-spin" />,
        error:      <AlertCircle size={10} />,
        failed:     <WifiOff size={10} />,
        idle:       <WifiOff size={10} />,
    };
    return (
        <span className={cn("flex items-center gap-1 text-[10px] font-bold capitalize", colorClass[status] ?? colorClass.idle)}>
            {icons[status] ?? icons.idle}
            <span>{status}</span>
        </span>
    );
}

// ─── Shared input/label class strings ─────────────────────────────────────────

const inputCn = "w-full px-[10px] py-[6px] rounded-md bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs outline-none box-border";
const labelCn = "text-[10px] font-bold text-zinc-500 uppercase tracking-[0.06em] block mb-1";

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK: Omit<DataConnectorConfig, "id"> = {
    type: "marex",
    name: "",
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

    const openAdd  = () => { setForm(BLANK); setEditId(null); setError(null); setAdding(true); };
    const openEdit = (c: DataConnectorConfig) => { setForm({ type: c.type, name: c.name, accountId: c.accountId }); setEditId(c.id); setError(null); setAdding(true); };
    const cancelForm = () => { setAdding(false); setEditId(null); setError(null); };

    const handleSave = () => {
        if (!form.accountId.trim()) { setError("Account ID is required."); return; }
        const id = editId ?? `${form.type}_${Date.now()}`;
        upsertConnector({ id, ...form, name: form.name.trim() || `${form.type === "marex" ? "Marex" : "Excel"} Connector` });
        cancelForm();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/[0.65] backdrop-blur-[2px]">
            <div className="bg-[#111115] border border-zinc-800 rounded-[14px] w-[480px] max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
                {/* Header */}
                <div className="flex items-center justify-between px-[18px] pt-[14px] pb-3 border-b border-zinc-900">
                    <div>
                        <div className="text-sm font-extrabold text-zinc-200">Data Connectors</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">Configure live positions data sources</div>
                    </div>
                    <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-zinc-600 flex">
                        <X size={16} />
                    </button>
                </div>

                {/* Connector list */}
                <div className="px-[18px] py-2.5">
                    {connectors.length === 0 && !adding && (
                        <div className="text-center py-6 text-zinc-600 text-xs">
                            No connectors configured. Add one below.
                        </div>
                    )}

                    {connectors.map((c) => (
                        <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-1.5 bg-zinc-900 border border-zinc-800">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-[3px]">
                                    <span className="text-xs font-bold text-zinc-200">{c.name}</span>
                                    <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-px rounded uppercase border",
                                        c.type === "marex"
                                            ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                                            : "bg-green-500/15 text-green-400 border-green-500/30"
                                    )}>
                                        {c.type}
                                    </span>
                                </div>
                                <div className="text-[10px] text-zinc-600 truncate">
                                    {NATIVE_CONNECTOR_URLS[c.type]} · acct {c.accountId}
                                </div>
                            </div>
                            <StatusDot status={statuses[c.id] ?? "idle"} />
                            <button onClick={() => openEdit(c)} className="bg-transparent border-none cursor-pointer text-[10px] text-blue-500 font-bold">Edit</button>
                            <button onClick={() => removeConnector(c.id)} className="bg-transparent border-none cursor-pointer text-zinc-600 flex">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}

                    {/* Inline add/edit form */}
                    {adding ? (
                        <div className="p-3 rounded-lg bg-zinc-900 border border-blue-500 mt-1.5">
                            <div className="text-[11px] font-extrabold text-blue-300 mb-3">
                                {editId ? "Edit Connector" : "New Connector"}
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                                <div>
                                    <label className={labelCn}>Type</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ConnectorType }))}
                                        className={inputCn}
                                    >
                                        <option value="marex">Marex (Risk)</option>
                                        <option value="excel">Excel (Positions)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCn}>Name (optional)</label>
                                    <input
                                        type="text" placeholder="e.g. Marex – Desk A"
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        className={inputCn}
                                    />
                                </div>
                            </div>

                            <div className="mb-2.5">
                                <label className={labelCn}>WebSocket URL (native)</label>
                                <div className={cn(inputCn, "text-zinc-600 select-none")}>
                                    {NATIVE_CONNECTOR_URLS[form.type]}
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className={labelCn}>Account ID</label>
                                <input
                                    type="text" placeholder="e.g. 22983"
                                    value={form.accountId}
                                    onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                                    className={inputCn}
                                />
                            </div>

                            {error && (
                                <div className="text-[11px] text-red-400 mb-2.5">{error}</div>
                            )}

                            <div className="flex gap-2 justify-end">
                                <button onClick={cancelForm} className="px-3.5 py-[5px] rounded-md border border-zinc-800 bg-transparent text-zinc-500 text-xs font-semibold cursor-pointer">
                                    Cancel
                                </button>
                                <button onClick={handleSave} className="px-3.5 py-[5px] rounded-md bg-blue-500 text-white text-xs font-bold cursor-pointer border-none">
                                    Save
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={openAdd}
                            className="flex items-center gap-1.5 w-full px-3 py-2 mt-1.5 rounded-lg border border-dashed border-zinc-800 bg-transparent text-zinc-600 text-xs font-semibold cursor-pointer"
                        >
                            <Plus size={13} />
                            Add connector
                        </button>
                    )}
                </div>

                <div className="h-2.5" />
            </div>
        </div>
    );
}
