import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ParameterDefinition, ParameterValues } from '../types';

interface ParameterFormProps {
    parameters: ParameterDefinition[];
    onParametersChange: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
    darkMode?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG icon helpers (camelCase React attributes)
// ─────────────────────────────────────────────────────────────────────────────

const LinkIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
);

const UnlinkIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" />
        <path d="M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" />
        <line x1="8" y1="2" x2="8" y2="5" /><line x1="2" y1="8" x2="5" y2="8" />
        <line x1="16" y1="19" x2="16" y2="22" /><line x1="19" y1="16" x2="22" y2="16" />
    </svg>
);

const PlusIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const CheckIcon = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Colour palette — cycles deterministically by group index
// ─────────────────────────────────────────────────────────────────────────────

const GROUP_COLOURS = [
    { bg: '#3b82f620', text: '#60a5fa', border: '#3b82f640' },   // blue
    { bg: '#8b5cf620', text: '#a78bfa', border: '#8b5cf640' },   // violet
    { bg: '#10b98120', text: '#34d399', border: '#10b98140' },   // emerald
    { bg: '#f59e0b20', text: '#fbbf24', border: '#f59e0b40' },   // amber
    { bg: '#f4363620', text: '#f87171', border: '#f4363640' },   // rose
    { bg: '#06b6d420', text: '#22d3ee', border: '#06b6d440' },   // cyan
];

function getGroupColour(groupId: string, allGroupIds: string[]) {
    const idx = allGroupIds.indexOf(groupId);
    return GROUP_COLOURS[(idx >= 0 ? idx : 0) % GROUP_COLOURS.length];
}

// ─────────────────────────────────────────────────────────────────────────────
// Portal-based popover — escapes any overflow:hidden ancestor
// ─────────────────────────────────────────────────────────────────────────────

interface GroupPopoverProps {
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    param: ParameterDefinition;
    allGroupIds: string[];
    groupedParametersValues: Record<string, string>;
    darkMode: boolean;
    newGroupId: string;
    onNewGroupIdChange: (v: string) => void;
    onGroupCreate: (groupId: string, paramName: string) => void;
    onGroupSelect: (groupId: string) => void;
    onDetach: () => void;
    onClose: () => void;
}

function GroupPopover({
    triggerRef, param, allGroupIds, groupedParametersValues,
    darkMode, newGroupId, onNewGroupIdChange,
    onGroupCreate, onGroupSelect, onDetach, onClose,
}: GroupPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

    // Position under the trigger button
    useEffect(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const POPOVER_W = 208;
        let left = rect.left;
        // Prevent going off right edge
        if (left + POPOVER_W > window.innerWidth - 8) {
            left = window.innerWidth - POPOVER_W - 8;
        }
        setPos({ top: rect.bottom + 6, left });
    }, [triggerRef]);

    // Reposition on scroll / resize
    useEffect(() => {
        const reposition = () => {
            if (!triggerRef.current) return;
            const rect = triggerRef.current.getBoundingClientRect();
            const POPOVER_W = 208;
            let left = rect.left;
            if (left + POPOVER_W > window.innerWidth - 8) {
                left = window.innerWidth - POPOVER_W - 8;
            }
            setPos({ top: rect.bottom + 6, left });
        };
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [triggerRef]);

    // Close on outside click
    useEffect(() => {
        const handleMouseDown = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [onClose, triggerRef]);

    const bg = darkMode ? '#111827' : '#ffffff';
    const border = darkMode ? '#374151' : '#e5e7eb';
    const text = darkMode ? '#f9fafb' : '#111827';
    const subtext = darkMode ? '#6b7280' : '#9ca3af';
    const inputBg = darkMode ? '#1f2937' : '#f9fafb';
    const inputBorder = darkMode ? '#374151' : '#d1d5db';
    const rowHover = darkMode ? '#1f2937' : '#f3f4f6';

    return createPortal(
        <>
            {/* Backdrop (invisible, just for click-outside) — popoverRef handles that */}
            <div
                ref={popoverRef}
                style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    width: 208,
                    zIndex: 99999,
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
                    padding: 12,
                    color: text,
                    fontFamily: 'inherit',
                    animation: 'paramPopoverIn 0.14s cubic-bezier(.16,1,.3,1)',
                }}
            >
                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: subtext }}>
                        Parameter Group
                    </span>
                    {param.groupId && (
                        <button
                            type="button"
                            onClick={() => { onDetach(); onClose(); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 3,
                                fontSize: 9, color: '#f87171', background: 'none',
                                border: 'none', cursor: 'pointer', padding: 0,
                            }}
                        >
                            <UnlinkIcon size={9} /> Detach
                        </button>
                    )}
                </div>

                {/* ── Create new group ── */}
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: subtext, marginBottom: 4 }}>
                        New group
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <input
                            type="text"
                            value={newGroupId}
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                            placeholder="e.g. ticker"
                            onChange={(e) => onNewGroupIdChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newGroupId.trim()) {
                                    param.groupId = newGroupId.trim();
                                    onGroupCreate(newGroupId.trim(), param.name);
                                    onClose();
                                }
                                if (e.key === 'Escape') onClose();
                            }}
                            style={{
                                flex: 1, fontSize: 10, padding: '4px 8px',
                                border: `1px solid ${inputBorder}`,
                                borderRadius: 6, background: inputBg, color: text,
                                outline: 'none',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                if (newGroupId.trim()) {
                                    param.groupId = newGroupId.trim();
                                    onGroupCreate(newGroupId.trim(), param.name);
                                    onClose();
                                }
                            }}
                            title="Create group"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                                background: '#3b82f6', border: 'none', cursor: 'pointer',
                                color: '#fff',
                            }}
                        >
                            <PlusIcon size={11} />
                        </button>
                    </div>
                </div>

                {/* ── Existing groups ── */}
                {allGroupIds.length > 0 && (
                    <div>
                        <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: subtext, marginBottom: 4 }}>
                            Existing groups
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 110, overflowY: 'auto' }}>
                            {allGroupIds.map(gid => {
                                const gc = getGroupColour(gid, allGroupIds);
                                const isActive = gid === param.groupId;
                                return (
                                    <button
                                        key={gid}
                                        type="button"
                                        onClick={() => { onGroupSelect(gid); onClose(); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '5px 8px', borderRadius: 7, cursor: 'pointer',
                                            border: isActive ? `1px solid ${gc.border}` : '1px solid transparent',
                                            background: isActive ? gc.bg : 'transparent',
                                            color: isActive ? gc.text : text,
                                            fontSize: 10, textAlign: 'left',
                                            transition: 'background 0.12s',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) (e.currentTarget as HTMLElement).style.background = rowHover;
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }}
                                    >
                                        {/* Colour dot */}
                                        <span style={{
                                            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                            background: gc.text, opacity: 0.8,
                                        }} />
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {gid}
                                        </span>
                                        {isActive && <CheckIcon size={11} className="" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Divider hint about the current value ── */}
                {param.groupId && groupedParametersValues?.[param.groupId] !== undefined && (
                    <div style={{
                        marginTop: 8, paddingTop: 8,
                        borderTop: `1px solid ${border}`,
                        fontSize: 9, color: subtext,
                    }}>
                        Current value: <strong style={{ color: text }}>{String(groupedParametersValues[param.groupId])}</strong>
                    </div>
                )}
            </div>

            {/* Global keyframe (injected once) */}
            <style>{`
                @keyframes paramPopoverIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
            `}</style>
        </>,
        document.body
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ParameterForm
// ─────────────────────────────────────────────────────────────────────────────

export const ParameterForm: React.FC<ParameterFormProps> = ({
    parameters,
    onParametersChange,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const [values, setValues] = useState<ParameterValues>(() => {
        const init: ParameterValues = {};
        parameters.forEach(p => {
            init[p.name] = (p.groupId && groupedParametersValues?.[p.groupId] !== undefined)
                ? groupedParametersValues[p.groupId]
                : (p.defaultValue ?? '');
        });
        return init;
    });

    const [activeGroupParam, setActiveGroupParam] = useState<string | null>(null);
    const [newGroupId, setNewGroupId] = useState('');

    // Per-param trigger button refs for popover positioning
    const triggerRefs = useRef<Record<string, React.RefObject<HTMLButtonElement | null>>>({});
    parameters.forEach(p => {
        if (!triggerRefs.current[p.name]) {
            triggerRefs.current[p.name] = React.createRef<HTMLButtonElement>();
        }
    });

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const groupDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestGroupedRef = useRef(groupedParametersValues);
    const onChangeRef = useRef(onParametersChange);

    useEffect(() => { latestGroupedRef.current = groupedParametersValues; }, [groupedParametersValues]);
    useEffect(() => { onChangeRef.current = onParametersChange; }, [onParametersChange]);

    useEffect(() => () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (groupDebounceTimer.current) clearTimeout(groupDebounceTimer.current);
    }, []);

    // Sync incoming grouped param changes → local state
    useEffect(() => {
        if (!groupedParametersValues) return;
        setValues(prev => {
            const next = { ...prev };
            let changed = false;
            parameters.forEach(p => {
                const gv = p.groupId ? groupedParametersValues[p.groupId] : undefined;
                if (gv !== undefined && gv !== next[p.name]) {
                    next[p.name] = gv;
                    changed = true;
                }
            });
            if (changed) {
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                onChangeRef.current(next);
            }
            return changed ? next : prev;
        });
    }, [groupedParametersValues, parameters]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleChange = useCallback((name: string, value: any, groupId?: string) => {
        setValues(prev => {
            const next = { ...prev, [name]: value };
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => onChangeRef.current(next), 500);
            return next;
        });

        if (groupId && onGroupedParametersChange) {
            if (groupDebounceTimer.current) clearTimeout(groupDebounceTimer.current);
            groupDebounceTimer.current = setTimeout(() => {
                const merged = { ...(latestGroupedRef.current ?? {}), [groupId]: value };
                onGroupedParametersChange(merged);
                setValues(cur => {
                    const updated = { ...cur };
                    parameters.forEach(p => { if (p.groupId === groupId) updated[p.name] = value; });
                    onChangeRef.current(updated);
                    return updated;
                });
            }, 1000);
        }
    }, [onGroupedParametersChange, parameters]);

    const handleGroupCreate = useCallback((groupId: string, paramName: string) => {
        if (!groupedParametersValues || !onGroupedParametersChange) return;
        onGroupedParametersChange({ ...groupedParametersValues, [groupId]: values[paramName] });
    }, [groupedParametersValues, onGroupedParametersChange, values]);

    const handleGroupSelect = useCallback((param: ParameterDefinition, gid: string) => {
        param.groupId = gid;
        // Immediately sync the group's current value into this param
        if (groupedParametersValues?.[gid] !== undefined) {
            setValues(prev => {
                const next = { ...prev, [param.name]: groupedParametersValues[gid] };
                onChangeRef.current(next);
                return next;
            });
        }
    }, [groupedParametersValues]);

    const handleDetach = useCallback((param: ParameterDefinition) => {
        param.groupId = undefined;
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────────

    const allGroupIds = groupedParametersValues ? Object.keys(groupedParametersValues) : [];

    // ── Input styling ─────────────────────────────────────────────────────────

    const inputStyle: React.CSSProperties = {
        fontSize: 11,
        padding: '3px 6px',
        border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
        borderRadius: 5,
        background: darkMode ? '#1f2937' : 'rgba(255,255,255,0.6)',
        color: darkMode ? '#e5e7eb' : '#111827',
        maxWidth: 120,
        outline: 'none',
        transition: 'border-color 0.15s',
    };

    const renderInput = (param: ParameterDefinition) => {
        const val = values[param.name] ?? '';
        const common = {
            id: param.name,
            style: inputStyle,
            required: param.required,
        };

        switch (param.type) {
            case 'text':
                return <input type="text" {...common} value={val}
                    placeholder={param.placeholder || param.label}
                    onChange={e => handleChange(param.name, e.target.value, param.groupId)} />;
            case 'number':
                return <input type="number" {...common} value={val}
                    placeholder={param.placeholder || param.label}
                    onChange={e => handleChange(param.name, e.target.value ? Number(e.target.value) : '', param.groupId)} />;
            case 'date':
                return <input type="date" {...common} value={val}
                    onChange={e => handleChange(param.name, e.target.value, param.groupId)} />;
            case 'select':
                return (
                    <select {...common} value={val}
                        onChange={e => handleChange(param.name, e.target.value, param.groupId)}>
                        <option value="">{param.label}</option>
                        {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                );
            case 'checkbox':
                return <input type="checkbox" id={param.name} checked={!!val}
                    style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#3b82f6' }}
                    onChange={e => handleChange(param.name, e.target.checked, param.groupId)} />;
            default:
                return null;
        }
    };

    // ── JSX ───────────────────────────────────────────────────────────────────

    return (
        <form style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, position: 'relative' }}>
            {parameters.map(param => {
                const colour = param.groupId ? getGroupColour(param.groupId, allGroupIds) : null;
                const isPopoverOpen = activeGroupParam === param.name;
                const triggerRef = triggerRefs.current[param.name];

                return (
                    <div
                        key={param.name}
                        className="group"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative' }}
                    >
                        {/* Label */}
                        {param.type !== 'checkbox' && (
                            <label
                                htmlFor={param.name}
                                style={{
                                    fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap',
                                    color: darkMode ? '#9ca3af' : '#6b7280', cursor: 'default',
                                }}
                            >
                                {param.label}
                            </label>
                        )}

                        {/* Input */}
                        {renderInput(param)}

                        {/* Checkbox inline label */}
                        {param.type === 'checkbox' && (
                            <label htmlFor={param.name}
                                style={{ fontSize: 11, color: darkMode ? '#9ca3af' : '#6b7280', cursor: 'pointer' }}>
                                {param.label}
                            </label>
                        )}

                        {/* ── Group trigger button ── */}
                        {groupedParametersValues !== undefined && (
                            <>
                                {param.groupId && colour ? (
                                    /* Coloured pill when already grouped */
                                    <button
                                        ref={triggerRef}
                                        type="button"
                                        onClick={() => setActiveGroupParam(isPopoverOpen ? null : param.name)}
                                        title={`Group: ${param.groupId} — click to manage`}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: '2px 7px 2px 5px',
                                            borderRadius: 99,
                                            border: `1px solid ${colour.border}`,
                                            background: colour.bg,
                                            color: colour.text,
                                            fontSize: 9, fontWeight: 600,
                                            cursor: 'pointer', whiteSpace: 'nowrap',
                                            transition: 'opacity 0.15s',
                                            maxWidth: 80, overflow: 'hidden',
                                        }}
                                    >
                                        <LinkIcon size={9} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {param.groupId}
                                        </span>
                                    </button>
                                ) : (
                                    /* Ghost icon — visible on hover */
                                    <button
                                        ref={triggerRef}
                                        type="button"
                                        onClick={() => setActiveGroupParam(isPopoverOpen ? null : param.name)}
                                        title="Attach to a parameter group"
                                        className="group-hover-show"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: 20, height: 20, borderRadius: 5, border: 'none',
                                            background: 'transparent',
                                            color: darkMode ? '#6b7280' : '#9ca3af',
                                            cursor: 'pointer', opacity: 0.3,
                                            transition: 'opacity 0.15s, background 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.opacity = '1';
                                            (e.currentTarget as HTMLElement).style.background = darkMode ? '#374151' : '#f3f4f6';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.opacity = '0';
                                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                                        }}
                                    >
                                        <LinkIcon size={10} />
                                    </button>
                                )}

                                {/* Portal popover */}
                                {isPopoverOpen && (
                                    <GroupPopover
                                        triggerRef={triggerRef}
                                        param={param}
                                        allGroupIds={allGroupIds}
                                        groupedParametersValues={groupedParametersValues}
                                        darkMode={darkMode}
                                        newGroupId={newGroupId}
                                        onNewGroupIdChange={setNewGroupId}
                                        onGroupCreate={(gid, pname) => {
                                            handleGroupCreate(gid, pname);
                                            setNewGroupId('');
                                        }}
                                        onGroupSelect={(gid) => handleGroupSelect(param, gid)}
                                        onDetach={() => handleDetach(param)}
                                        onClose={() => setActiveGroupParam(null)}
                                    />
                                )}
                            </>
                        )}
                    </div>
                );
            })}
        </form>
    );
};
