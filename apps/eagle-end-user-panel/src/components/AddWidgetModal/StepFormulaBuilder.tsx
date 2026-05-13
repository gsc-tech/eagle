/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef } from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import type { FormulaStep } from "@/lib/formulaEngine";
import { applyFormulas, evalExpression } from "@/lib/formulaEngine";

interface Props {
    headers: string[];
    steps: FormulaStep[];
    onChange: (steps: FormulaStep[]) => void;
    previewRows: Record<string, any>[];
}

function getExprError(expression: string, headers: string[], steps: FormulaStep[], stepIndex: number): string | null {
    if (!expression.trim()) return null;
    const availableCols = [
        ...headers,
        ...steps.slice(0, stepIndex).map((s) => s.outputColumn).filter(Boolean),
    ];
    const testRow: Record<string, any> = {};
    availableCols.forEach((c) => { testRow[c] = 1; }); // dummy values
    const result = evalExpression(expression, testRow, availableCols);
    if (isNaN(result)) return "Invalid expression";
    return null;
}

export default function StepFormulaBuilder({ headers, steps, onChange, previewRows }: Props) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const addStep = () => {
        onChange([
            ...steps,
            { outputColumn: `col_${steps.length + 1}`, expression: "" },
        ]);
        // Focus new input on next tick
        setTimeout(() => inputRefs.current[steps.length]?.focus(), 50);
    };

    const updateStep = (i: number, patch: Partial<FormulaStep>) => {
        onChange(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    };

    const removeStep = (i: number) => {
        onChange(steps.filter((_, idx) => idx !== i));
    };

    const insertColRef = (stepIndex: number, col: string) => {
        const el = inputRefs.current[stepIndex];
        if (!el) return;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const before = el.value.slice(0, start);
        const after = el.value.slice(end);
        const newVal = before + col + after;
        updateStep(stepIndex, { expression: newVal });
        // Restore cursor after col name
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + col.length, start + col.length);
        }, 0);
    };

    const availableColsAt = (i: number) => [
        ...headers,
        ...steps.slice(0, i).map((s) => s.outputColumn).filter(Boolean),
    ];

    const processedRows = applyFormulas(previewRows, steps);
    const computedCols = steps.map((s) => s.outputColumn).filter(Boolean);
    const previewHeaders = [...headers, ...computedCols.filter((c) => !headers.includes(c))];

    return (
        <div className="space-y-5">
            <div>
                <p className="text-sm text-zinc-300 font-medium">Define computed columns</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                    Write arithmetic expressions using column names.
                    Example: <code className="text-blue-400 bg-zinc-800 px-1 rounded">(revenue - cost) / revenue * 100</code>
                </p>
            </div>

            {/* Formula rows */}
            <div className="space-y-3">
                {steps.map((step, i) => {
                    const cols = availableColsAt(i);
                    const err = step.expression ? getExprError(step.expression, headers, steps, i) : null;
                    return (
                        <div key={i} className="p-3 bg-zinc-800/50 rounded-xl border border-zinc-700 space-y-2">
                            {/* Row header: name + delete */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={step.outputColumn}
                                    onChange={(e) => updateStep(i, { outputColumn: e.target.value })}
                                    placeholder="column_name"
                                    className="w-36 text-xs bg-zinc-900 border border-zinc-600 rounded px-2 py-1.5 text-zinc-200 font-mono focus:outline-none focus:border-blue-500"
                                />
                                <span className="text-zinc-500 text-sm">=</span>
                                <div className="flex-1 relative">
                                    <input
                                        ref={(el) => { inputRefs.current[i] = el; }}
                                        type="text"
                                        value={step.expression}
                                        onChange={(e) => updateStep(i, { expression: e.target.value })}
                                        placeholder="e.g. (revenue - cost) / revenue * 100"
                                        className={`w-full text-xs bg-zinc-900 border rounded px-2 py-1.5 text-zinc-200 font-mono focus:outline-none ${
                                            err ? "border-red-500/70 focus:border-red-500" : "border-zinc-600 focus:border-blue-500"
                                        }`}
                                    />
                                    {err && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-400">
                                            <AlertCircle size={12} />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => removeStep(i)}
                                    className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>

                            {err && (
                                <p className="text-xs text-red-400 pl-1">{err}</p>
                            )}

                            {/* Column reference pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="text-xs text-zinc-600">Insert:</span>
                                {cols.map((col) => (
                                    <button
                                        key={col}
                                        type="button"
                                        onClick={() => insertColRef(i, col)}
                                        className={`text-xs px-2 py-0.5 rounded-md border transition-colors font-mono ${
                                            computedCols.includes(col)
                                                ? "border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                                : "border-zinc-600 bg-zinc-800 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                                        }`}
                                    >
                                        {col}
                                    </button>
                                ))}
                                <span className="text-zinc-700 text-xs">+ − × ÷ ( )</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={addStep}
                className="flex items-center gap-2 text-xs text-blue-400 border border-dashed border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 rounded-lg px-4 py-2 transition-all"
            >
                <Plus size={13} />
                Add Computed Column
            </button>

            {/* Live preview */}
            {steps.some((s) => s.outputColumn && s.expression) && previewRows.length > 0 && (
                <div>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                        Live preview — first 3 rows
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-zinc-700">
                        <table className="text-xs w-full">
                            <thead>
                                <tr className="bg-zinc-800">
                                    {previewHeaders.map((h) => (
                                        <th
                                            key={h}
                                            className={`px-3 py-2 text-left font-semibold whitespace-nowrap border-b border-zinc-700 ${
                                                computedCols.includes(h) ? "text-blue-400" : "text-zinc-400"
                                            }`}
                                        >
                                            {h}
                                            {computedCols.includes(h) && <span className="ml-1 opacity-60">✦</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {processedRows.slice(0, 3).map((row, i) => (
                                    <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                                        {previewHeaders.map((h) => {
                                            const v = row[h];
                                            const display =
                                                v === null || v === undefined ? "" :
                                                typeof v === "number"
                                                    ? (isNaN(v) ? <span className="text-red-400">error</span> : parseFloat(v.toFixed(4)))
                                                    : String(v);
                                            return (
                                                <td key={h} className="px-3 py-1.5 text-zinc-300 whitespace-nowrap">
                                                    {display}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                        Columns marked <span className="text-blue-400">✦</span> are computed
                    </p>
                </div>
            )}
        </div>
    );
}
