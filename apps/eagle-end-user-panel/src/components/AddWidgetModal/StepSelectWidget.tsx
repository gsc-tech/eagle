import { CURATED_WIDGETS } from "./widgetTypes";

interface Props {
    selected: string | null;
    onSelect: (componentName: string) => void;
}

export default function StepSelectWidget({ selected, onSelect }: Props) {
    return (
        <div>
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
                                <div
                                    className={`text-sm font-semibold ${
                                        isSelected ? "text-blue-300" : "text-zinc-200"
                                    }`}
                                >
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
        </div>
    );
}
