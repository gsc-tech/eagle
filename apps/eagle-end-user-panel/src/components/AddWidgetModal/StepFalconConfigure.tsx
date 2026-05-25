import type { FalconWidgetDef } from "./falconWidgetCatalog";

interface Props {
    widgetDef: FalconWidgetDef;
    values: Record<string, string>;
    widgetTitle: string;
    onChange: (values: Record<string, string>) => void;
    onTitleChange: (title: string) => void;
}

export default function StepFalconConfigure({
    widgetDef,
    values,
    widgetTitle,
    onChange,
    onTitleChange,
}: Props) {
    const set = (key: string, val: string) => onChange({ ...values, [key]: val });

    return (
        <div className="space-y-5">
            <p className="text-sm text-zinc-400">
                All fields are optional — defaults work out of the box.
            </p>

            {/* Title */}
            <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                    Widget Title
                </label>
                <input
                    type="text"
                    value={widgetTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder={widgetDef.label}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {widgetDef.props.length > 0 ? (
                <div className="space-y-4">
                    {widgetDef.props.map((prop) => (
                        <div key={prop.key}>
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">
                                {prop.label}
                                {prop.required && (
                                    <span className="ml-1 text-red-400">*</span>
                                )}
                            </label>
                            {prop.type === "select" ? (
                                <select
                                    value={values[prop.key] ?? prop.defaultValue ?? ""}
                                    onChange={(e) => set(prop.key, e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {prop.options?.map((opt) => (
                                        <option key={opt} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={values[prop.key] ?? ""}
                                    onChange={(e) => set(prop.key, e.target.value)}
                                    placeholder={prop.placeholder}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            )}
                            {prop.hint && (
                                <p className="text-xs text-zinc-600 mt-1 leading-snug">
                                    {prop.hint}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-zinc-500 py-2">
                    This widget has no configurable props — it will be added with defaults.
                </p>
            )}
        </div>
    );
}
