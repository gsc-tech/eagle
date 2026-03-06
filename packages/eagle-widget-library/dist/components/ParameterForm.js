import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from 'react';
// ─────────────────────────────────────────────────────────────────────────────
// Small icon components (React-compatible camelCase SVG attributes)
// ─────────────────────────────────────────────────────────────────────────────
const LinkIcon = () => (_jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }), _jsx("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" })] }));
const UnlinkIcon = () => (_jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18.84 12.25l1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" }), _jsx("path", { d: "M5.17 11.75l-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "5" }), _jsx("line", { x1: "2", y1: "8", x2: "5", y2: "8" }), _jsx("line", { x1: "16", y1: "19", x2: "16", y2: "22" }), _jsx("line", { x1: "19", y1: "16", x2: "22", y2: "16" })] }));
const PlusIcon = () => (_jsxs("svg", { width: "10", height: "10", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }));
// ─────────────────────────────────────────────────────────────────────────────
// Colour palette for group badges (cycles through colours by group name)
// ─────────────────────────────────────────────────────────────────────────────
const GROUP_COLOURS = [
    { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-400/40' },
    { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-400/40' },
    { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-400/40' },
    { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-400/40' },
    { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-400/40' },
    { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-400/40' },
];
function getGroupColour(groupId, allGroupIds) {
    const idx = allGroupIds.indexOf(groupId);
    return GROUP_COLOURS[idx >= 0 ? idx % GROUP_COLOURS.length : 0];
}
// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export const ParameterForm = ({ parameters, onParametersChange, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const [values, setValues] = useState(() => {
        const initialValues = {};
        parameters.forEach(param => {
            if (param.groupId && groupedParametersValues?.[param.groupId] !== undefined) {
                initialValues[param.name] = groupedParametersValues[param.groupId];
            }
            else {
                initialValues[param.name] = param.defaultValue ?? '';
            }
        });
        return initialValues;
    });
    // Which param's group-picker popover is open
    const [activeGroupParam, setActiveGroupParam] = useState(null);
    const [newGroupId, setNewGroupId] = useState('');
    const debounceTimer = useRef(null);
    const groupDebounceTimer = useRef(null);
    const latestGroupedParamsRef = useRef(groupedParametersValues);
    const onParametersChangeRef = useRef(onParametersChange);
    const popoverRef = useRef(null);
    // Keep refs current
    useEffect(() => { latestGroupedParamsRef.current = groupedParametersValues; }, [groupedParametersValues]);
    useEffect(() => { onParametersChangeRef.current = onParametersChange; }, [onParametersChange]);
    // Cleanup timers on unmount
    useEffect(() => () => {
        if (debounceTimer.current)
            clearTimeout(debounceTimer.current);
        if (groupDebounceTimer.current)
            clearTimeout(groupDebounceTimer.current);
    }, []);
    // Close popover on outside click
    useEffect(() => {
        if (!activeGroupParam)
            return;
        const handleClick = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setActiveGroupParam(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [activeGroupParam]);
    // Sync from props → local state when another widget updates a shared group
    useEffect(() => {
        if (!groupedParametersValues)
            return;
        setValues(prev => {
            const next = { ...prev };
            let hasChanges = false;
            parameters.forEach(param => {
                const groupValue = param.groupId
                    ? groupedParametersValues[param.groupId]
                    : undefined;
                if (groupValue !== undefined && groupValue !== next[param.name]) {
                    next[param.name] = groupValue;
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                if (debounceTimer.current)
                    clearTimeout(debounceTimer.current);
                onParametersChangeRef.current(next);
            }
            return hasChanges ? next : prev;
        });
    }, [groupedParametersValues, parameters]);
    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleChange = (name, value, groupId) => {
        setValues(prev => {
            const newValues = { ...prev, [name]: value };
            if (debounceTimer.current)
                clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                onParametersChangeRef.current(newValues);
            }, 500);
            return newValues;
        });
        if (groupId && onGroupedParametersChange) {
            if (groupDebounceTimer.current)
                clearTimeout(groupDebounceTimer.current);
            groupDebounceTimer.current = setTimeout(() => {
                const currentGroupedValues = latestGroupedParamsRef.current || {};
                const newGroupedValues = { ...currentGroupedValues, [groupId]: value };
                onGroupedParametersChange(newGroupedValues);
                setValues(currentValues => {
                    const updatedValues = { ...currentValues };
                    parameters.forEach(param => {
                        if (param.groupId === groupId) {
                            updatedValues[param.name] = value;
                        }
                    });
                    onParametersChangeRef.current(updatedValues);
                    return updatedValues;
                });
            }, 1000);
        }
    };
    const handleGroupCreate = (groupId, paramName) => {
        if (!groupedParametersValues || !onGroupedParametersChange)
            return;
        const newGroupedValues = {
            ...groupedParametersValues,
            [groupId]: values[paramName],
        };
        onGroupedParametersChange(newGroupedValues);
    };
    // ── Derived ────────────────────────────────────────────────────────────────
    const allGroupIds = groupedParametersValues
        ? Object.keys(groupedParametersValues)
        : [];
    // ── Render helpers ─────────────────────────────────────────────────────────
    const baseInputClasses = `
        text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 
        transition-all duration-200 max-w-[120px]
        ${darkMode
        ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
        : 'bg-white/50 border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'}
    `;
    const renderInput = (param) => {
        const currentValue = values[param.name] ?? '';
        switch (param.type) {
            case 'text':
                return (_jsx("input", { type: "text", id: param.name, value: currentValue, onChange: (e) => handleChange(param.name, e.target.value, param.groupId), placeholder: param.placeholder || param.label, required: param.required, className: baseInputClasses }));
            case 'number':
                return (_jsx("input", { type: "number", id: param.name, value: currentValue, onChange: (e) => handleChange(param.name, e.target.value ? Number(e.target.value) : '', param.groupId), placeholder: param.placeholder || param.label, required: param.required, className: baseInputClasses }));
            case 'date':
                return (_jsx("input", { type: "date", id: param.name, value: currentValue, onChange: (e) => handleChange(param.name, e.target.value, param.groupId), required: param.required, className: baseInputClasses }));
            case 'select':
                return (_jsxs("select", { id: param.name, value: currentValue, onChange: (e) => handleChange(param.name, e.target.value, param.groupId), required: param.required, className: `${baseInputClasses} pr-6`, children: [_jsx("option", { value: "", children: param.label }), param.options?.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value)))] }));
            case 'checkbox':
                return (_jsx("input", { type: "checkbox", id: param.name, checked: !!currentValue, onChange: (e) => handleChange(param.name, e.target.checked, param.groupId), className: "w-3.5 h-3.5 text-blue-500 border-gray-300 rounded focus:ring-blue-500 cursor-pointer" }));
            default:
                return null;
        }
    };
    // ── JSX ────────────────────────────────────────────────────────────────────
    return (_jsxs("form", { className: "flex flex-wrap items-center gap-2 relative z-30", children: [parameters.map(param => {
                const colour = param.groupId
                    ? getGroupColour(param.groupId, allGroupIds)
                    : null;
                const isPopoverOpen = activeGroupParam === param.name;
                return (_jsxs("div", { className: "flex items-center gap-1 group relative", children: [param.type !== 'checkbox' && (_jsx("label", { htmlFor: param.name, className: `text-[10px] font-medium whitespace-nowrap transition-colors ${darkMode
                                ? 'text-gray-400 group-hover:text-gray-200'
                                : 'text-gray-500 group-hover:text-gray-800'}`, children: param.label })), renderInput(param), param.type === 'checkbox' && (_jsx("label", { htmlFor: param.name, className: `text-xs cursor-pointer select-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`, children: param.label })), groupedParametersValues !== undefined && (_jsxs("div", { className: "flex items-center", ref: isPopoverOpen ? popoverRef : null, children: [param.groupId && colour ? (_jsxs("button", { type: "button", onClick: () => setActiveGroupParam(isPopoverOpen ? null : param.name), title: `Grouped with: ${param.groupId} — click to change`, className: `
                                            flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold
                                            transition-all duration-200 cursor-pointer
                                            ${colour.bg} ${colour.text} ${colour.border}
                                            hover:opacity-80
                                        `, children: [_jsx(LinkIcon, {}), _jsx("span", { className: "max-w-[50px] truncate", children: param.groupId })] })) : (
                                /* Ghost icon — only visible on hover */
                                _jsx("button", { type: "button", onClick: () => setActiveGroupParam(isPopoverOpen ? null : param.name), title: "Attach to a parameter group", className: `
                                            p-1 rounded flex items-center justify-center
                                            transition-all duration-200
                                            opacity-0 group-hover:opacity-60 hover:!opacity-100
                                            ${darkMode
                                        ? 'text-gray-400 hover:bg-gray-700'
                                        : 'text-gray-400 hover:bg-gray-100'}
                                        `, children: _jsx(LinkIcon, {}) })), isPopoverOpen && (_jsxs("div", { className: `
                                            absolute z-[100] left-0 top-full mt-2
                                            p-3 rounded-xl shadow-2xl border backdrop-blur-sm
                                            min-w-[180px] w-[200px]
                                            ${darkMode
                                        ? 'bg-gray-900/95 border-gray-700 text-gray-100'
                                        : 'bg-white/95 border-gray-200 text-gray-800'}
                                        `, style: { animation: 'fadeSlideIn 0.15s ease' }, children: [_jsxs("div", { className: "flex items-center justify-between mb-2.5", children: [_jsx("span", { className: `text-[9px] font-bold uppercase tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-400'}`, children: "Parameter Group" }), param.groupId && (_jsxs("button", { type: "button", onClick: () => {
                                                        param.groupId = undefined;
                                                        setActiveGroupParam(null);
                                                    }, title: "Detach from group", className: "flex items-center gap-0.5 text-[9px] text-red-400 hover:text-red-500 transition-colors", children: [_jsx(UnlinkIcon, {}), "Detach"] }))] }), _jsxs("div", { className: "mb-2.5", children: [_jsx("div", { className: `text-[9px] font-semibold mb-1 uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`, children: "New group" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsx("input", { type: "text", value: newGroupId, onChange: (e) => setNewGroupId(e.target.value), placeholder: "e.g. ticker", autoFocus: true, className: `
                                                        text-[10px] px-2 py-1 border rounded-md w-full
                                                        focus:outline-none focus:ring-1 focus:ring-blue-500
                                                        ${darkMode
                                                                ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-600'
                                                                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}
                                                    `, onKeyDown: (e) => {
                                                                if (e.key === 'Enter' && newGroupId.trim()) {
                                                                    param.groupId = newGroupId.trim();
                                                                    handleGroupCreate(newGroupId.trim(), param.name);
                                                                    setActiveGroupParam(null);
                                                                    setNewGroupId('');
                                                                }
                                                                if (e.key === 'Escape') {
                                                                    setActiveGroupParam(null);
                                                                    setNewGroupId('');
                                                                }
                                                            } }), _jsx("button", { type: "button", onClick: () => {
                                                                if (newGroupId.trim()) {
                                                                    param.groupId = newGroupId.trim();
                                                                    handleGroupCreate(newGroupId.trim(), param.name);
                                                                    setActiveGroupParam(null);
                                                                    setNewGroupId('');
                                                                }
                                                            }, title: "Create group", className: "\r\n                                                        flex items-center justify-center w-6 h-6 shrink-0\r\n                                                        rounded-md bg-blue-500 hover:bg-blue-600\r\n                                                        text-white transition-colors\r\n                                                    ", children: _jsx(PlusIcon, {}) })] })] }), allGroupIds.length > 0 && (_jsxs("div", { children: [_jsx("div", { className: `text-[9px] font-semibold mb-1 uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`, children: "Existing groups" }), _jsx("div", { className: "flex flex-col gap-0.5 max-h-[100px] overflow-y-auto", children: allGroupIds.map(gid => {
                                                        const gc = getGroupColour(gid, allGroupIds);
                                                        const isActive = gid === param.groupId;
                                                        return (_jsxs("button", { type: "button", onClick: () => {
                                                                param.groupId = gid;
                                                                setActiveGroupParam(null);
                                                            }, className: `
                                                                    text-[10px] text-left px-2 py-1.5 rounded-md
                                                                    flex items-center gap-1.5
                                                                    transition-all duration-150 border
                                                                    ${isActive
                                                                ? `${gc.bg} ${gc.text} ${gc.border}`
                                                                : darkMode
                                                                    ? 'border-transparent hover:bg-gray-800 text-gray-300'
                                                                    : 'border-transparent hover:bg-gray-50 text-gray-600'}
                                                                `, children: [_jsx("span", { className: `w-2 h-2 rounded-full shrink-0 ${gc.bg} border ${gc.border}` }), _jsx("span", { className: "truncate", children: gid }), isActive && (_jsx("svg", { className: `ml-auto w-3 h-3 ${gc.text}`, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }))] }, gid));
                                                    }) })] }))] }))] }))] }, param.name));
            }), _jsx("style", { children: `
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            ` })] }));
};
