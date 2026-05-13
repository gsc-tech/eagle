import { useRef, useState } from "react";
import { Upload, FileText, Trash2 } from "lucide-react";
import type { CsvDataset } from "@/store/csvDataStore";
import { parseCsv } from "@/lib/formulaEngine";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB warning threshold

interface Props {
    existingDatasets: CsvDataset[];
    selectedDatasetId: string | null;
    onDatasetReady: (dataset: CsvDataset) => void;
    onSelectExisting: (id: string) => void;
    onRemoveExisting: (id: string) => void;
}

export default function StepCsvUpload({
    existingDatasets,
    selectedDatasetId,
    onDatasetReady,
    onSelectExisting,
    onRemoveExisting,
}: Props) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, any>[] } | null>(null);

    const handleFile = (file: File) => {
        setError(null);
        if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
            setError("Only .csv files are supported.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const parsed = parseCsv(text);
            if (parsed.headers.length === 0) {
                setError("The CSV file appears to be empty.");
                return;
            }
            const id = `csv-${Date.now()}`;
            const dataset: CsvDataset = {
                id,
                name: file.name.replace(/\.csv$/i, ""),
                headers: parsed.headers,
                rows: parsed.rows,
                uploadedAt: Date.now(),
                sizeBytes: file.size,
            };
            if (file.size > MAX_SIZE_BYTES) {
                setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — large files may slow down the browser. Proceeding anyway.`);
            }
            setPreview({ headers: parsed.headers, rows: parsed.rows });
            onDatasetReady(dataset);
        };
        reader.readAsText(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const activeDataset = selectedDatasetId
        ? existingDatasets.find((d) => d.id === selectedDatasetId) || null
        : null;
    const activePreview = activeDataset
        ? { headers: activeDataset.headers, rows: activeDataset.rows }
        : preview;

    return (
        <div className="space-y-5">
            {/* Upload zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
                    dragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-600 hover:border-zinc-400 bg-zinc-800/30"
                }`}
            >
                <Upload size={22} className="text-zinc-400" />
                <span className="text-sm text-zinc-300 font-medium">Drop a CSV file here, or click to browse</span>
                <span className="text-xs text-zinc-500">.csv only · 2 MB recommended limit</span>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleChange} />
            </div>

            {error && (
                <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            {/* Previously uploaded datasets */}
            {existingDatasets.length > 0 && (
                <div>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                        Previously uploaded
                    </p>
                    <div className="space-y-2">
                        {existingDatasets.map((ds) => (
                            <div
                                key={ds.id}
                                onClick={() => onSelectExisting(ds.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                    selectedDatasetId === ds.id
                                        ? "border-blue-500 bg-blue-500/10"
                                        : "border-zinc-700 hover:border-zinc-500 bg-zinc-800/30"
                                }`}
                            >
                                <FileText size={16} className="text-zinc-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-zinc-200 truncate">{ds.name}</div>
                                    <div className="text-xs text-zinc-500">
                                        {ds.rows.length} rows · {ds.headers.length} columns ·{" "}
                                        {new Date(ds.uploadedAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onRemoveExisting(ds.id); }}
                                    className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Preview */}
            {activePreview && activePreview.headers.length > 0 && (
                <div>
                    <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                        Preview (first 5 rows)
                    </p>
                    <div className="overflow-x-auto rounded-lg border border-zinc-700">
                        <table className="text-xs w-full">
                            <thead>
                                <tr className="bg-zinc-800">
                                    {activePreview.headers.map((h) => (
                                        <th key={h} className="px-3 py-2 text-left text-zinc-400 font-semibold whitespace-nowrap border-b border-zinc-700">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {activePreview.rows.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b border-zinc-800/50 last:border-0">
                                        {activePreview.headers.map((h) => (
                                            <td key={h} className="px-3 py-1.5 text-zinc-300 whitespace-nowrap max-w-[120px] truncate">
                                                {row[h] === null || row[h] === undefined ? "" : String(row[h])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                        {activePreview.rows.length} total rows
                    </p>
                </div>
            )}
        </div>
    );
}
