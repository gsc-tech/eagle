import { CURATED_WIDGETS } from "./widgetTypes";
import { FALCON_WIDGETS } from "./falconWidgetCatalog";

interface Props {
    selected: string | null;
    onSelect: (componentName: string) => void;
    source: "csv" | "falcon";
    onSourceChange: (source: "csv" | "falcon") => void;
}

export default function StepSelectWidget({ selected, onSelect, source, onSourceChange }: Props) {
    const handleSourceChange = (next: "csv" | "falcon") => {
        if (next === source) return;
        onSourceChange(next);
        onSelect("" as string); // clear selection when switching tabs
    };

    return (
        <div>
            {/* Source tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                {(["csv", "falcon"] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => handleSourceChange(s)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            source === s
                                ? "bg-zinc-700 text-white shadow"
                                : "text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        {s === "csv" ? "CSV Charts" : "Falcon Analytics"}
                    </button>
                ))}
            </div>

            {source === "csv" && (
                <>
                    <p className="text-sm text-zinc-400 mb-4">
                        Choose the type of visualization for your CSV data.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {CURATED_WIDGETS.map((w) => {
                            const Icon = w.icon;
                            const isSelected = selected === w.componentName;
                            return (
                                <button
                                    key={w.componentName}
                                    onClick={() => onSelect(w.componentName)}
                                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                                        isSelected
                                            ? "border-blue-500 bg-blue-500/10"
                                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                                    }`}
                                >
                                    <div
                                        className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                                            isSelected ? "bg-blue-500/20 text-blue-400" : "bg-zinc-700 text-zinc-400"
                                        }`}
                                    >
                                        <Icon size={16} />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-semibold ${isSelected ? "text-blue-300" : "text-zinc-200"}`}>
                                            {w.label}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-0.5 leading-tight">
                                            {w.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {source === "falcon" && (
                <>
                    <p className="text-sm text-zinc-400 mb-4">
                        Add a live Falcon Analytics widget. No CSV required — data is fetched directly from the Falcon service.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {FALCON_WIDGETS.map((w) => {
                            const Icon = w.icon;
                            const isSelected = selected === w.componentName;
                            return (
                                <button
                                    key={w.componentName}
                                    onClick={() => onSelect(w.componentName)}
                                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 ${
                                        isSelected
                                            ? "border-violet-500 bg-violet-500/10"
                                            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
                                    }`}
                                >
                                    <div
                                        className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                                            isSelected ? "bg-violet-500/20 text-violet-400" : "bg-zinc-700 text-zinc-400"
                                        }`}
                                    >
                                        <Icon size={16} />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-semibold ${isSelected ? "text-violet-300" : "text-zinc-200"}`}>
                                            {w.label}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-0.5 leading-tight">
                                            {w.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
