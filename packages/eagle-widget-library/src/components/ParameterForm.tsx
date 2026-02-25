import React, { useState, useEffect, useRef } from 'react';
import type { ParameterDefinition, ParameterValues } from '../types';


interface ParameterFormProps {
    parameters: ParameterDefinition[];
    onParametersChange: (values: ParameterValues) => void;
    groupedParametersValues?: Record<string, string>;
    onGroupedParametersChange?: (values: Record<string, any>) => void;
}

export const ParameterForm: React.FC<ParameterFormProps & { darkMode?: boolean }> = ({
    parameters,
    onParametersChange,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const [values, setValues] = useState<ParameterValues>(() => {
        const initialValues: ParameterValues = {};
        parameters.forEach(param => {
            if (param.groupId && groupedParametersValues?.[param.groupId] !== undefined) {
                initialValues[param.name] = groupedParametersValues[param.groupId];
            } else {
                initialValues[param.name] = param.defaultValue ?? '';
            }
        });
        return initialValues;
    });

    const [activeGroupParam, setActiveGroupParam] = useState<string | null>(null);
    const [newGroupId, setNewGroupId] = useState('');

    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const groupDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestGroupedParamsRef = useRef(groupedParametersValues);
    const onParametersChangeRef = useRef(onParametersChange);

    // Keep ref updated with latest props
    useEffect(() => {
        latestGroupedParamsRef.current = groupedParametersValues;
    }, [groupedParametersValues]);

    useEffect(() => {
        onParametersChangeRef.current = onParametersChange;
    }, [onParametersChange]);

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
            if (groupDebounceTimer.current) {
                clearTimeout(groupDebounceTimer.current);
            }
        };
    }, []);

    // Sync from props to local state when OTHER widgets update the group
    useEffect(() => {
        if (groupedParametersValues) {
            setValues(prev => {
                const next = { ...prev };
                let hasChanges = false;
                parameters.forEach(param => {
                    const groupValue = param.groupId ? groupedParametersValues[param.groupId] : undefined;
                    // Only update if prop value is different from local state
                    // This allows local updates (typing) to persist if parent hasn't updated yet (debounce window)
                    // But if parent DID update (e.g. from another widget), we want to take it.
                    // The trick is: during debounce, parent prop is STALE (old value).
                    // If we blindly sync here, we revert user input.
                    // But typically this Effect only fires when prop CHANGES.
                    // Prop won't change during debounce window.
                    // When debounce fires -> prop changes -> this effect fires -> prop value == local value (roughly).
                    if (groupValue !== undefined && groupValue !== next[param.name]) {
                        next[param.name] = groupValue;
                        hasChanges = true;
                    }
                });

                // If grouped parameters changed from props (i.e., another widget updated them),
                // trigger onParametersChange so this widget fetches new data
                if (hasChanges) {
                    // Clear any pending debounce timer
                    if (debounceTimer.current) {
                        clearTimeout(debounceTimer.current);
                    }

                    // Debounce the parameter change callback
                    // debounceTimer.current = setTimeout(() => {
                    //     onParametersChangeRef.current(next);
                    // }, 500);
                    onParametersChangeRef.current(next);
                }

                return hasChanges ? next : prev;
            });
        }
    }, [groupedParametersValues, parameters]);



    const handleChange = (name: string, value: any, groupId?: string) => {
        // Always update local state immediately for responsiveness
        setValues(prev => {
            const newValues = { ...prev, [name]: value };

            // Clear existing timer for regular parameters
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }

            // Set new timer for regular parameter changes (500ms debounce)
            debounceTimer.current = setTimeout(() => {
                onParametersChangeRef.current(newValues);
            }, 500);

            return newValues;
        });

        // Handle grouped parameters separately
        if (groupId && onGroupedParametersChange) {
            // Clear existing timer for grouped parameters
            if (groupDebounceTimer.current) {
                clearTimeout(groupDebounceTimer.current);
            }

            // Set new timer for grouped parameter changes (500ms debounce)
            groupDebounceTimer.current = setTimeout(() => {
                const currentGroupedValues = latestGroupedParamsRef.current || {};
                const newGroupedValues = { ...currentGroupedValues };
                newGroupedValues[groupId] = value;
                onGroupedParametersChange(newGroupedValues);

                // Also trigger onParametersChange to ensure widgets fetch data
                // We need to update all parameters in this group with the new value
                setValues(currentValues => {
                    const updatedValues = { ...currentValues };
                    parameters.forEach(param => {
                        if (param.groupId === groupId) {
                            updatedValues[param.name] = value;
                        }
                    });
                    // Trigger the widget's parameter change handler
                    onParametersChangeRef.current(updatedValues);
                    return updatedValues;
                });
            }, 1000);
        }
    };

    const handleGroupCreate = (groupId: string, paramName: string) => {
        if (!groupedParametersValues || !onGroupedParametersChange) {
            return;
        }
        const newGroupedValues = { ...groupedParametersValues };
        newGroupedValues[groupId] = values[paramName];
        onGroupedParametersChange(newGroupedValues);
    }

    const renderInput = (param: ParameterDefinition) => {
        // Base classes updated for dark mode
        const baseClasses = `text-xs px-2 py-1 border rounded focus:outline-none focus:ring-1 transition-all duration-200 max-w-[120px] ${darkMode
            ? 'bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500 focus:ring-gray-400 focus:border-gray-400'
            : 'bg-white/50 border-border-light text-text-primary placeholder-text-muted/50 focus:bg-white focus:ring-chart-primary focus:border-chart-primary'
            }`;

        const currentValue = values[param.name] || '';

        switch (param.type) {
            case 'text':
                return (
                    <input
                        type="text"
                        id={param.name}
                        value={currentValue}
                        onChange={(e) => handleChange(param.name, e.target.value, param.groupId)}
                        placeholder={param.placeholder || param.label}
                        required={param.required}
                        className={baseClasses}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        id={param.name}
                        value={currentValue}
                        onChange={(e) => handleChange(param.name, e.target.value ? Number(e.target.value) : '', param.groupId)}
                        placeholder={param.placeholder || param.label}
                        required={param.required}
                        className={baseClasses}
                    />
                );

            case 'date':
                return (
                    <input
                        type="date"
                        id={param.name}
                        value={currentValue}
                        onChange={(e) => handleChange(param.name, e.target.value, param.groupId)}
                        required={param.required}
                        className={baseClasses}
                    />
                );

            case 'select':
                return (
                    <select
                        id={param.name}
                        value={currentValue}
                        onChange={(e) => handleChange(param.name, e.target.value, param.groupId)}
                        required={param.required}
                        className={`${baseClasses} pr-6`}
                    >
                        <option value="">{param.label}</option>
                        {param.options?.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'checkbox':
                return (
                    <input
                        type="checkbox"
                        id={param.name}
                        checked={currentValue || false}
                        onChange={(e) => handleChange(param.name, e.target.checked, param.groupId)}
                        className="w-3.5 h-3.5 text-chart-primary border-border-light rounded focus:ring-chart-primary cursor-pointer"
                    />
                );

            default:
                return null;
        }
    };



    return (
        <form
            className={`flex flex-wrap items-center gap-2 relative z-30 ${darkMode
                ? 'bg-transparent'
                : 'bg-transparent'
                }`}
        >
            {parameters.map(param => (
                <div key={param.name} className="flex items-center gap-1.5 group relative">
                    {param.type !== 'checkbox' && (
                        <label
                            htmlFor={param.name}
                            className={`text-[10px] font-medium whitespace-nowrap transition-colors ${darkMode
                                ? 'text-gray-400 group-hover:text-gray-200'
                                : 'text-text-secondary group-hover:text-chart-primary'
                                }`}
                        >
                            {param.label}
                        </label>
                    )}
                    {renderInput(param)}
                    {param.type === 'checkbox' && (
                        <label
                            htmlFor={param.name}
                            className={`text-xs cursor-pointer select-none ${darkMode ? 'text-gray-400' : 'text-text-secondary'
                                }`}
                        >
                            {param.label}
                        </label>
                    )}

                    {groupedParametersValues !== undefined && (
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={() => setActiveGroupParam(activeGroupParam === param.name ? null : param.name)}
                                title={param.groupId ? `Group: ${param.groupId}` : 'Attach to Group'}
                                className={`p-1 rounded flex items-center justify-center transition-all duration-200 ${param.groupId
                                    ? 'text-chart-primary bg-chart-primary/10'
                                    : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                </svg>
                            </button>

                            {activeGroupParam === param.name && (
                                <div className={`absolute z-50 top-full mt-1 p-2 rounded-md shadow-xl border min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-200 ${darkMode
                                    ? 'bg-gray-800 border-gray-700'
                                    : 'bg-white border-gray-200'
                                    }`}>
                                    <div className="flex flex-col gap-2">
                                        <div>
                                            <div className="text-[9px] font-semibold mb-1 uppercase tracking-wider opacity-50">Create New</div>
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={newGroupId}
                                                    onChange={(e) => setNewGroupId(e.target.value)}
                                                    placeholder="Group ID"
                                                    className={`text-[10px] px-1.5 py-0.5 border rounded w-full focus:outline-none ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && newGroupId.trim()) {
                                                            param.groupId = newGroupId.trim();
                                                            handleGroupCreate(newGroupId.trim(), param.name);
                                                            setActiveGroupParam(null);
                                                            setNewGroupId('');
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (newGroupId.trim()) {
                                                            param.groupId = newGroupId.trim()
                                                            handleGroupCreate(newGroupId.trim(), param.name);
                                                            setActiveGroupParam(null);
                                                            setNewGroupId('');
                                                        }
                                                    }}
                                                    className="bg-chart-primary text-white text-[10px] px-1.5 rounded"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {groupedParametersValues && Object.keys(groupedParametersValues).length > 0 && (
                                            <div>
                                                <div className="text-[9px] font-semibold mb-1 uppercase tracking-wider opacity-50">Existing Groups</div>
                                                <div className="flex flex-col gap-0.5 max-h-[80px] overflow-y-auto">
                                                    {Object.keys(groupedParametersValues).map(gid => (
                                                        <button
                                                            key={gid}
                                                            type="button"
                                                            onClick={() => {
                                                                param.groupId = gid;
                                                                setActiveGroupParam(null);
                                                            }}
                                                            className={`text-[10px] text-left px-1.5 py-1 rounded transition-colors ${gid === param.groupId
                                                                ? 'bg-chart-primary/20 text-chart-primary'
                                                                : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {gid}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {param.groupId && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    param.groupId = undefined;
                                                    setActiveGroupParam(null);
                                                }}
                                                className="text-[9px] text-red-500 hover:text-red-600 text-left mt-1 pt-1 border-t border-gray-100 dark:border-gray-700"
                                            >
                                                Detach from Group
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </form>
    );
};
