import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { ChevronRight, Loader2, X, Plus, Search, GripVertical, UserPlus } from "lucide-react";
import type { Approver } from "./types";

// ─── Utilities ────────────────────────────────────────────────────────────────

export const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");

export const LEVEL_COLORS = [
    { light: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }, dark: { bg: 'rgba(56, 189, 248, 0.15)', text: '#7dd3fc', border: 'rgba(56, 189, 248, 0.3)' } },
    { light: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, dark: { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' } },
    { light: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }, dark: { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' } },
    { light: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, dark: { bg: 'rgba(16, 185, 129, 0.15)', text: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' } },
    { light: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, dark: { bg: 'rgba(244, 63, 94, 0.15)', text: '#fda4af', border: 'rgba(244, 63, 94, 0.3)' } },
];

// ─── Table Components ─────────────────────────────────────────────────────────

export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
    ({ className, ...props }, ref) => (
        <div className="relative w-full overflow-auto tlr-custom-scrollbar">
            <table ref={ref} className={cn("w-full caption-bottom text-sm border-collapse", className)} {...props} />
        </div>
    )
);

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement> & { darkMode?: boolean }>(
    ({ className, darkMode, ...props }, ref) => (
        <thead
            ref={ref}
            className={cn("sticky top-0 z-10 backdrop-blur-sm border-b", className)}
            style={{
                backgroundColor: darkMode ? 'rgba(20, 20, 20, 0.6)' : 'rgba(249, 250, 251, 0.6)',
                borderColor: darkMode ? '#1a1a1a' : '#f1f5f9',
            }}
            {...props}
        />
    )
);

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
    ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement> & { darkMode?: boolean; isEditing?: boolean }>(
    ({ className, darkMode, isEditing, ...props }, ref) => (
        <tr
            ref={ref}
            className={cn("border-b transition-colors group", !isEditing && (darkMode ? "hover:bg-[#1a1a1a]/40" : "hover:bg-gray-50/60"), className)}
            style={{
                borderColor: darkMode ? '#1a1a1a' : '#f1f5f9',
                backgroundColor: isEditing ? (darkMode ? 'rgba(0, 153, 139, 0.07)' : 'rgba(0, 153, 139, 0.04)') : undefined,
            }}
            {...props}
        />
    )
);

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement> & { darkMode?: boolean }>(
    ({ className, darkMode, ...props }, ref) => (
        <th ref={ref} className={cn("h-10 px-4 text-left align-middle font-semibold text-xs uppercase tracking-wider", className)} style={{ color: darkMode ? '#909090' : '#6b7280' }} {...props} />
    )
);

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
    ({ className, ...props }, ref) => (
        <td ref={ref} className={cn("px-4 py-3 align-middle", className)} {...props} />
    )
);

// ─── Button ───────────────────────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'secondary'; size?: 'sm' | 'md' | 'icon'; darkMode?: boolean }>(
    ({ className, variant = 'primary', size = 'md', darkMode, ...props }, ref) => {
        const [isHovered, setIsHovered] = useState(false);
        const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";
        const petrolColor = '#00998b';
        const petrolHighlight = '#00b3a2';
        const customStyle: React.CSSProperties = { transition: 'background-color 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s' };

        if (variant === 'primary') {
            customStyle.backgroundColor = isHovered ? petrolHighlight : petrolColor;
            customStyle.color = 'white';
            customStyle.boxShadow = isHovered ? '0 2px 8px rgba(0,153,139,0.4)' : '0 1px 4px rgba(0,153,139,0.25)';
        } else if (variant === 'outline') {
            customStyle.color = isHovered ? petrolHighlight : petrolColor;
            customStyle.border = `1px solid ${isHovered ? `${petrolHighlight}80` : `${petrolColor}50`}`;
            customStyle.backgroundColor = isHovered ? `${petrolColor}08` : 'transparent';
        } else if (variant === 'secondary') {
            customStyle.backgroundColor = darkMode ? (isHovered ? '#2e2e2e' : '#1a1a1a') : (isHovered ? '#f3f4f6' : '#f9fafb');
            customStyle.color = darkMode ? '#f9fafb' : '#111827';
        } else if (variant === 'ghost') {
            customStyle.backgroundColor = isHovered ? (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)') : 'transparent';
            customStyle.color = darkMode ? '#909090' : '#6b7280';
        }

        const sizes = { sm: "h-8 rounded-md px-3 text-xs", md: "h-9 px-4 py-2", icon: "h-8 w-8 text-xs p-0" };

        return (
            <button
                ref={ref}
                className={cn(base, sizes[size], className)}
                style={customStyle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                {...props}
            />
        );
    }
);

// ─── Approver Avatar ──────────────────────────────────────────────────────────

export const ApproverAvatar = ({ approver, size = 34, darkMode }: { approver: Approver; size?: number; darkMode: boolean }) => {
    const initial = approver.initials || approver.name?.slice(0, 2).toUpperCase() || '?';
    const bgColor = approver.avatarColor || '#00998b';
    return (
        <div
            className="flex items-center justify-center rounded-full font-bold shrink-0 select-none"
            style={{
                width: size, height: size, backgroundColor: bgColor,
                fontSize: size * 0.36, color: '#ffffff', letterSpacing: '-0.01em',
                boxShadow: darkMode
                    ? `0 0 0 2px rgba(255,255,255,0.07), 0 1px 3px rgba(0,0,0,0.4)`
                    : `0 0 0 2px rgba(255,255,255,1), 0 1px 3px rgba(0,0,0,0.12)`,
            }}
        >
            {initial}
        </div>
    );
};

// ─── Flow Arrow ───────────────────────────────────────────────────────────────

export const FlowArrow = ({ darkMode }: { darkMode: boolean }) => (
    <div className="flex items-center shrink-0 self-center" style={{ marginTop: -1 }}>
        <div style={{ width: 10, height: 1.5, backgroundColor: darkMode ? '#2e2e2e' : '#cbd5e1', borderRadius: 1 }} />
        <ChevronRight size={13} strokeWidth={2} style={{ color: darkMode ? '#3a3a3a' : '#94a3b8', marginLeft: -3 }} />
    </div>
);

// ─── Stage Badge (view mode) ──────────────────────────────────────────────────

export const StageBadge = ({ stage, idx, darkMode }: { stage: Approver; idx: number; darkMode: boolean }) => {
    const colors = LEVEL_COLORS[idx % LEVEL_COLORS.length];
    const c = darkMode ? colors.dark : colors.light;
    return (
        <div className="flex flex-col items-start gap-1">
            <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"
                style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border, boxShadow: darkMode ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.07)' }}
            >
                <span className="inline-flex items-center justify-center rounded font-black text-[9px] leading-none px-1 py-0.5" style={{ backgroundColor: c.text, color: darkMode ? '#0f172a' : c.bg, minWidth: 18 }}>
                    L{idx + 1}
                </span>
                {stage.name}
            </div>
            {stage.role && (
                <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ml-1"
                    style={{
                        backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        color: darkMode ? '#606060' : '#9ca3af',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                    }}
                >
                    {stage.role}
                </span>
            )}
        </div>
    );
};

// ─── Editable Stage Badge (edit mode) ────────────────────────────────────────

export const EditStageBadge = ({ stage, idx, darkMode, onRemove, onRoleChange }: {
    stage: Approver; idx: number; darkMode: boolean;
    onRemove: () => void; onRoleChange: (role: string) => void;
}) => {
    const colors = LEVEL_COLORS[idx % LEVEL_COLORS.length];
    const c = darkMode ? colors.dark : colors.light;
    return (
        <div className="flex flex-col items-start gap-1">
            <div
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border"
                style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border, boxShadow: darkMode ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.07)' }}
            >
                <GripVertical size={11} strokeWidth={2} style={{ color: c.text, opacity: 0.4, cursor: 'grab', flexShrink: 0 }} />
                <span className="inline-flex items-center justify-center rounded font-black text-[9px] leading-none px-1 py-0.5" style={{ backgroundColor: c.text, color: darkMode ? '#0f172a' : c.bg, minWidth: 18 }}>
                    L{idx + 1}
                </span>
                {stage.name}
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="ml-0.5 rounded-full p-0.5 transition-all hover:opacity-80 active:scale-90"
                    style={{ backgroundColor: `${c.text}25`, color: c.text }}
                >
                    <X size={9} strokeWidth={3} />
                </button>
            </div>
            <input
                onPointerDown={e => e.stopPropagation()}
                placeholder="role..."
                value={stage.role || ''}
                onChange={e => onRoleChange(e.target.value)}
                className="text-[10px] px-2 py-1 rounded-full border focus:outline-none focus:ring-1 w-full"
                style={{
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: darkMode ? '#2e2e2e' : '#e2e8f0',
                    color: darkMode ? '#e0e0e0' : '#374151',
                    minWidth: 80, maxWidth: 120,
                }}
            />
        </div>
    );
};

// ─── Approver Selector Modal ──────────────────────────────────────────────────

export const ApproverSelectorModal = ({ fetchUrl, onSelect, onClose, darkMode, alreadySelectedIds, isTokenRequired, getFirebaseToken }: {
    fetchUrl: string;
    onSelect: (a: Approver) => void;
    onClose: () => void;
    darkMode: boolean;
    alreadySelectedIds: string[];
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
}) => {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<Approver[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchUsers = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            let token: string | undefined;
            if (isTokenRequired && getFirebaseToken) token = await getFirebaseToken();
            const params = new URLSearchParams();
            if (query) params.set('search', query);
            if (token) params.set('token', token);
            const url = `${fetchUrl}${params.toString() ? `?${params}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchUrl, isTokenRequired, getFirebaseToken]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchUsers(search), search ? 300 : 0);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [search, fetchUsers]);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const modal = (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 999999, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="relative flex flex-col rounded-2xl border overflow-hidden"
                style={{
                    width: 420, maxHeight: '72vh',
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                    borderColor: darkMode ? '#1e293b' : '#e2e8f0',
                    boxShadow: darkMode
                        ? '0 32px 72px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)'
                        : '0 32px 72px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)',
                    color: darkMode ? '#f1f5f9' : '#0f172a',
                }}
                onMouseDown={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, backgroundColor: darkMode ? 'rgba(0,153,139,0.15)' : 'rgba(0,153,139,0.1)' }}>
                            <UserPlus size={14} style={{ color: '#00998b' }} />
                        </div>
                        <div className="mt-2 mb-2">
                            <h3 className="text-sm font-semibold leading-tight">Add Approver</h3>
                            <p className="text-[11px] leading-tight mt-0.5" style={{ color: darkMode ? '#64748b' : '#94a3b8' }}>
                                Select a user to add to the approval chain
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1 transition-all" style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: darkMode ? '#94a3b8' : '#64748b' }}>
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-3 pb-2.5">
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 border" style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.04)' : '#f8fafc', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }}>
                        <Search size={13} style={{ color: darkMode ? '#475569' : '#94a3b8', flexShrink: 0 }} />
                        <input
                            autoFocus
                            className="w-full text-xs bg-transparent focus:outline-none"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ color: darkMode ? '#f1f5f9' : '#0f172a' }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="rounded-full p-0.5 transition-all" style={{ color: darkMode ? '#475569' : '#94a3b8' }}>
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ height: 1, backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }} />

                {/* List */}
                <div className="overflow-auto flex-1 px-2 py-1.5 tlr-modal-scrollbar">
                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center gap-2">
                            <Loader2 size={22} className="animate-spin" style={{ color: '#00998b' }} />
                            <p className="text-xs" style={{ color: darkMode ? '#475569' : '#94a3b8' }}>Searching...</p>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="py-14 flex flex-col items-center gap-2">
                            <div className="flex items-center justify-center rounded-full mb-1" style={{ width: 44, height: 44, backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }}>
                                <Search size={20} style={{ color: darkMode ? '#334155' : '#cbd5e1' }} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: darkMode ? '#475569' : '#94a3b8' }}>
                                {search ? 'No approvers found' : 'No approvers available'}
                            </p>
                            {search && <p className="text-xs" style={{ color: darkMode ? '#334155' : '#cbd5e1' }}>Try a different search term</p>}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {results.map((a: Approver) => {
                                const isAdded = alreadySelectedIds.includes(a.id);
                                return (
                                    <button
                                        key={a.id}
                                        disabled={isAdded}
                                        className={cn("flex items-center gap-4 w-full px-2.5 py-2 text-left rounded-lg transition-all", isAdded ? "opacity-40 cursor-not-allowed" : (darkMode ? "hover:bg-white/[0.05]" : "hover:bg-slate-50"))}
                                        onClick={() => !isAdded && onSelect(a)}
                                    >
                                        <ApproverAvatar approver={a} size={34} darkMode={darkMode} />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-xs font-semibold truncate leading-tight">{a.name}</span>
                                                {a.role && (
                                                    <span className="text-[10px] font-medium shrink-0 rounded-full px-1.5 py-0.5" style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: darkMode ? '#94a3b8' : '#64748b' }}>
                                                        {a.role}
                                                    </span>
                                                )}
                                            </div>
                                            {a.email && (
                                                <span className="text-[11px] truncate mt-0.5 leading-tight" style={{ color: darkMode ? '#64748b' : '#94a3b8' }}>
                                                    {a.email}
                                                </span>
                                            )}
                                        </div>
                                        {isAdded && (
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: 'rgba(0,153,139,0.12)', color: '#00998b' }}>
                                                Added
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: `1px solid ${darkMode ? '#1e293b' : '#f1f5f9'}`, backgroundColor: darkMode ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                    <span className="text-xs" style={{ color: darkMode ? '#475569' : '#94a3b8' }}>
                        {isLoading ? 'Searching…' : `${results.length} approver${results.length !== 1 ? 's' : ''}`}
                    </span>
                    <button onClick={onClose} className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-all" style={{ backgroundColor: darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: darkMode ? '#94a3b8' : '#64748b' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return ReactDOM.createPortal(modal, document.body);
};