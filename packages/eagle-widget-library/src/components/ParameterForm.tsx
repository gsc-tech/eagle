import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ParameterDefinition, ParameterValues } from '../types';

interface ParameterFormProps {
    parameters: ParameterDefinition[];
    onParametersChange: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
    darkMode?: boolean;
    initialParameterValues?: Record<string, string>;
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
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

const ChevronDownIcon = ({ size = 10 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const XIcon = ({ size = 8 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const SearchIcon = ({ size = 11 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
// Multi-select dropdown (portal-based)
// ─────────────────────────────────────────────────────────────────────────────

interface MultiSelectDropdownProps {
    param: ParameterDefinition;
    value: string[];          // array of selected values
    darkMode: boolean;
    onChange: (selected: string[]) => void;
    isTokenRequired?: boolean;
    getFirebaseToken?: () => Promise<string>;
}
 
function MultiSelectDropdown({ param, value, darkMode, onChange, isTokenRequired, getFirebaseToken }: MultiSelectDropdownProps) {
    const [open, setOpen] = useState(false);
    const [dynamicOptions, setDynamicOptions] = useState<{ label: string, value: any }[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropRef   = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
        top: 0, left: 0, width: 180,
    });
 
    const bg          = darkMode ? '#111827' : '#ffffff';
    const border      = darkMode ? '#374151' : '#e5e7eb';
    const text        = darkMode ? '#e5e7eb' : '#111827';
    const subtext     = darkMode ? '#6b7280' : '#9ca3af';
    const hoverBg     = darkMode ? '#1f2937' : '#f3f4f6';
    const pillBg      = darkMode ? '#1e3a5f' : '#dbeafe';
    const pillText    = darkMode ? '#93c5fd' : '#1d4ed8';
    const triggerBg   = darkMode ? '#1f2937' : 'rgba(255,255,255,0.6)';
    const triggerBdr  = darkMode ? '#374151' : '#d1d5db';
    const searchBg    = darkMode ? '#1f2937' : '#f9fafb';
    const searchBdr   = darkMode ? '#374151' : '#e5e7eb';
 
    const hasFetched = useRef(false);

    useEffect(() => {
        hasFetched.current = false;
        setSearch(''); // Reset search when URL changes
    }, [param.optionsApiUrl]);

    useEffect(() => {
        if (param.optionsApiUrl && !hasFetched.current) {
            const fetchOptions = async () => {
                setLoading(true);
                try {
                    let url = param.optionsApiUrl!;
                    if (getFirebaseToken) {
                        try {
                            const token = await getFirebaseToken();
                            if (token) {
                                url += (url.includes('?') ? '&' : '?') + `token=${token}`;
                            }
                        } catch (e) {
                            console.warn("Could not get firebase token for options fetch", e);
                        }
                    }
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
                    const data = await resp.json();
                    setDynamicOptions(data);
                    hasFetched.current = true;
                } catch (err) {
                    console.error("Failed to fetch parameter options:", err);
                    setDynamicOptions([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchOptions();
        }
    }, [param.optionsApiUrl, getFirebaseToken]);

    const options  = dynamicOptions || param.options || [];
    const filteredOptions = options.filter(opt =>
        String(opt.label).toLowerCase().includes(search.toLowerCase()) ||
        String(opt.value).toLowerCase().includes(search.toLowerCase())
    );
    const selected = Array.isArray(value) ? value : [];

    const reposition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const w = Math.max(rect.width, 180); // increased min width for search
        let left = rect.left;
        if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
        setPos({ top: rect.bottom + 4, left, width: w });
    }, []);

    useEffect(() => {
        if (!open) {
            setSearch('');
            return;
        }
        reposition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        // Focus search input when opened
        setTimeout(() => searchRef.current?.focus(), 50);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [open, reposition]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handle = (e: MouseEvent) => {
            if (
                dropRef.current   && !dropRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => {
            document.removeEventListener('mousedown', handle);
            setSearch(''); // Clear search on close
        };
    }, [open]);

    const toggle = (optValue: any) => {
        const next = selected.includes(optValue)
            ? selected.filter(v => v !== optValue)
            : [...selected, optValue];
        onChange(next);
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };
    return (
        <>
            {/* Trigger */}
            <button
                ref={triggerRef}
                type="button"
                id={param.name}
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, padding: '3px 6px',
                    border: `1px solid ${triggerBdr}`,
                    borderRadius: 5,
                    background: triggerBg,
                    color: selected.length ? text : subtext,
                    cursor: 'pointer', minWidth: 90, maxWidth: 200,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                }}
            >
                {/* Tag pills or placeholder */}
                <span style={{ flex: 1, display: 'flex', flexWrap: 'nowrap', gap: 3, overflow: 'hidden', minWidth: 0 }}>
                    {selected.length === 0 ? (
                        <span style={{ color: subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {loading ? 'Loading...' : (param.placeholder || param.label)}
                        </span>
                    ) : selected.length === 1 ? (
                        <span style={{
                            background: pillBg, color: pillText,
                            borderRadius: 4, padding: '1px 5px', fontSize: 10,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%',
                        }}>
                            {options.find(o => o.value === selected[0])?.label ?? selected[0]}
                        </span>
                    ) : (
                        <span style={{
                            background: pillBg, color: pillText,
                            borderRadius: 4, padding: '1px 5px', fontSize: 10, whiteSpace: 'nowrap',
                        }}>
                            {selected.length} selected
                        </span>
                    )}
                </span>
                {selected.length > 0 && (
                    <span
                        role="button"
                        aria-label="Clear all"
                        onClick={clearAll}
                        style={{ color: subtext, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                        <XIcon size={8} />
                    </span>
                )}
                <span style={{ color: subtext, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <ChevronDownIcon size={10} />
                </span>
            </button>

            {/* Dropdown portal */}
            {open && createPortal(
                <div
                    ref={dropRef}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        width: pos.width,
                        zIndex: 99999,
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 8,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                        animation: 'paramPopoverIn 0.12s cubic-bezier(.16,1,.3,1)',
                    }}
                >
                    {/* Search Input */}
                    <div style={{
                        padding: '6px 8px',
                        borderBottom: `1px solid ${searchBdr}`,
                        background: searchBg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span style={{ color: subtext, display: 'flex' }}><SearchIcon size={11} /></span>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                fontSize: 11,
                                color: text,
                                padding: '2px 0',
                            }}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                style={{
                                    background: 'none', border: 'none', padding: 0,
                                    cursor: 'pointer', color: subtext, display: 'flex'
                                }}
                            >
                                <XIcon size={8} />
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '12px', fontSize: 11, color: subtext, textAlign: 'center' }}>
                                {options.length === 0 ? 'No options' : 'No results found'}
                            </div>
                        ) : filteredOptions.map(opt => {
                            const isChecked = selected.includes(opt.value);
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggle(opt.value)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        width: '100%', padding: '7px 12px',
                                        background: isChecked ? hoverBg : 'transparent',
                                        border: 'none', cursor: 'pointer',
                                        color: text, fontSize: 11, textAlign: 'left',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                                    onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    {/* Custom checkbox box */}
                                    <span style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                                        border: `1.5px solid ${isChecked ? '#3b82f6' : (darkMode ? '#4b5563' : '#d1d5db')}`,
                                        background: isChecked ? '#3b82f6' : 'transparent',
                                        transition: 'all 0.12s',
                                    }}>
                                        {isChecked && <CheckIcon size={9} />}
                                    </span>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Footer: select-all / clear */}
                    {options.length > 1 && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '5px 12px', borderTop: `1px solid ${border}`,
                            fontSize: 10, color: subtext,
                        }}>
                            <button type="button" onClick={() => onChange(options.map(o => o.value))}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 10, padding: 0 }}>
                                Select all
                            </button>
                            <button type="button" onClick={() => onChange([])}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: subtext, fontSize: 10, padding: 0 }}>
                                Clear
                            </button>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single-select dropdown (portal-based)
// ─────────────────────────────────────────────────────────────────────────────

interface SingleSelectDropdownProps {
    param: ParameterDefinition;
    value: string;
    darkMode: boolean;
    onChange: (selected: string) => void;
}

function SingleSelectDropdown({ param, value, darkMode, onChange }: SingleSelectDropdownProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropRef   = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
        top: 0, left: 0, width: 180,
    });

    const bg          = darkMode ? '#111827' : '#ffffff';
    const border      = darkMode ? '#374151' : '#e5e7eb';
    const text        = darkMode ? '#e5e7eb' : '#111827';
    const subtext     = darkMode ? '#6b7280' : '#9ca3af';
    const hoverBg     = darkMode ? '#1f2937' : '#f3f4f6';
    const triggerBg   = darkMode ? '#1f2937' : 'rgba(255,255,255,0.6)';
    const triggerBdr  = darkMode ? '#374151' : '#d1d5db';

    const options  = param.options ?? [];

    const reposition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const w = Math.max(rect.width, 160);
        let left = rect.left;
        if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
        setPos({ top: rect.bottom + 4, left, width: w });
    }, []);

    useEffect(() => {
        if (!open) {
            setSearch('');
            return;
        }
        reposition();
        window.addEventListener('scroll', reposition, true);
        window.addEventListener('resize', reposition);
        return () => {
            window.removeEventListener('scroll', reposition, true);
            window.removeEventListener('resize', reposition);
        };
    }, [open, reposition]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handle = (e: MouseEvent) => {
            if (
                dropRef.current   && !dropRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) setOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [open]);

    const handleSelect = (optValue: string) => {
        onChange(optValue);
        setOpen(false);
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setOpen(false);
    };

    const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                id={param.name}
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, padding: '3px 6px',
                    border: `1px solid ${triggerBdr}`,
                    borderRadius: 5,
                    background: triggerBg,
                    color: value ? text : subtext,
                    cursor: 'pointer', minWidth: 90, maxWidth: 200,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                }}
            >
                <span style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
                    {!value ? (
                        <span style={{ color: subtext, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {param.placeholder || param.label}
                        </span>
                    ) : (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: text }}>
                            {selectedLabel}
                        </span>
                    )}
                </span>
                {value && (
                    <span
                        role="button"
                        aria-label="Clear selection"
                        onClick={clearSelection}
                        style={{ color: subtext, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                    >
                        <XIcon size={8} />
                    </span>
                )}
                <span style={{ color: subtext, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <ChevronDownIcon size={10} />
                </span>
            </button>

            {open && createPortal(
                <div
                    ref={dropRef}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        width: pos.width,
                        zIndex: 99999,
                        background: bg,
                        border: `1px solid ${border}`,
                        borderRadius: 8,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                        overflow: 'hidden',
                        animation: 'paramPopoverIn 0.12s cubic-bezier(.16,1,.3,1)',
                    }}
                >
                    <div style={{ padding: '8px', borderBottom: `1px solid ${border}` }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            autoFocus
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '4px 8px',
                                fontSize: 11,
                                background: hoverBg,
                                border: `1px solid ${border}`,
                                borderRadius: 4,
                                color: text,
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {filteredOptions.length === 0 ? (
                            <div style={{ padding: '8px 12px', fontSize: 11, color: subtext }}>No options found</div>
                        ) : filteredOptions.map(opt => {
                            const isSelected = value === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => handleSelect(opt.value)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        width: '100%', padding: '7px 12px',
                                        background: isSelected ? hoverBg : 'transparent',
                                        border: 'none', cursor: 'pointer',
                                        color: text, fontSize: 11, textAlign: 'left',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = hoverBg; }}
                                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {opt.label}
                                    </span>
                                    {isSelected && <CheckIcon size={10} className="" />}
                                </button>
                            );
                        })}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
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
// Dynamic single select
// ─────────────────────────────────────────────────────────────────────────────
 
function DynamicSelect({ param, value, commonProps, handleChange, isTokenRequired, getFirebaseToken }: any) {
    const [options, setOptions] = useState<{ label: string, value: any }[] | null>(null);
    const [loading, setLoading] = useState(false);
 
    const hasFetched = useRef(false);

    useEffect(() => {
        hasFetched.current = false;
    }, [param.optionsApiUrl]);

    useEffect(() => {
        if (param.optionsApiUrl && !hasFetched.current) {
            const fetchOptions = async () => {
                setLoading(true);
                try {
                    let url = param.optionsApiUrl!;
                    if (getFirebaseToken) {
                        try {
                            const token = await getFirebaseToken();
                            if (token) {
                                url += (url.includes('?') ? '&' : '?') + `token=${token}`;
                            }
                        } catch (e) {
                            console.warn("Could not get token for DynamicSelect", e);
                        }
                    }
                    const resp = await fetch(url);
                    const data = await resp.json();
                    setOptions(data);
                    hasFetched.current = true;
                } catch (err) {
                    console.error("Failed to fetch parameter options:", err);
                    setOptions([]);
                } finally {
                    setLoading(false);
                }
            };
            fetchOptions();
        }
    }, [param.optionsApiUrl, getFirebaseToken]);
 
    const finalOptions = options || param.options || [];
 
    return (
        <select {...commonProps} value={value}
            onChange={e => handleChange(param.name, e.target.value, param.groupId)}>
            <option value="">{loading ? 'Loading...' : param.label}</option>
            {finalOptions.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
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
    initialParameterValues,
    isTokenRequired,
    getFirebaseToken,
}) => {
    const [values, setValues] = useState<ParameterValues>(() => {
        const init: ParameterValues = {};
        parameters.forEach(p => {
            if (initialParameterValues && initialParameterValues[p.name] !== undefined) {
                init[p.name] = initialParameterValues[p.name];
            } else if (p.groupId && groupedParametersValues?.[p.groupId] !== undefined) {
                init[p.name] = groupedParametersValues[p.groupId];
            } else {
                init[p.name] = (p.defaultValue ?? '');
            }
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
                if (param.optionsApiUrl) {
                    return (
                        <DynamicSelect
                            param={param}
                            value={val}
                            commonProps={common}
                            handleChange={handleChange}
                            isTokenRequired={isTokenRequired}
                            getFirebaseToken={getFirebaseToken}
                        />
                    );
                }
                return (
                    <select {...common} value={val}
                        onChange={e => handleChange(param.name, e.target.value, param.groupId)}>
                        <option value="">{param.label}</option>
                        {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                );
            case 'multiselect': {
                const arrVal = Array.isArray(val) ? val : (val ? [val] : []);
                return (
                    <MultiSelectDropdown
                        param={param}
                        value={arrVal}
                        darkMode={darkMode}
                        onChange={(selected) => handleChange(param.name, selected, param.groupId)}
                        isTokenRequired={isTokenRequired}
                        getFirebaseToken={getFirebaseToken}
                    />
                );
            }
            case 'checkbox':
                // Styled custom checkbox
                return (
                    <span
                        role="checkbox"
                        aria-checked={!!val}
                        tabIndex={0}
                        onClick={() => handleChange(param.name, !val, param.groupId)}
                        onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') handleChange(param.name, !val, param.groupId); }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 15, height: 15, borderRadius: 4, cursor: 'pointer', flexShrink: 0,
                            border: `1.5px solid ${!!val ? '#3b82f6' : (darkMode ? '#4b5563' : '#d1d5db')}`,
                            background: !!val ? '#3b82f6' : 'transparent',
                            transition: 'all 0.15s',
                            outline: 'none',
                        }}
                    >
                        {!!val && <CheckIcon size={9} />}
                    </span>
                );
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
                                            color: darkMode ? '#94a3b8' : '#4b5563',
                                            cursor: 'pointer', opacity: darkMode ? 0.5 : 0.4,
                                            transition: 'opacity 0.15s, background 0.15s',
                                        }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLElement).style.opacity = '1';
                                            (e.currentTarget as HTMLElement).style.background = darkMode ? '#374151' : '#f3f4f6';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLElement).style.opacity = darkMode ? '0.5' : '0.4';
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
