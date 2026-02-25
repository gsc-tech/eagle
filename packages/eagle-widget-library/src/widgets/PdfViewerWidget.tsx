"use client";

import React, { useState, useRef, useEffect } from "react";
import type { BaseWidgetProps, ParameterValues } from "../types";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { Upload, X, FileText, AlertCircle } from "lucide-react";

export interface PdfViewerWidgetProps extends BaseWidgetProps {
    initialPdfUrl?: string; // Optional URL to load initially
    darkMode?: boolean;
}

export const PdfViewerWidget: React.FC<PdfViewerWidgetProps> = ({
    apiUrl, // Not strictly used for upload, but good for conformity
    title,
    parameters,
    initialPdfUrl,
    darkMode = false,
    groupedParametersValues,
    onGroupedParametersChange,
}) => {
    const defaultParams = useParameterDefaults(parameters);
    const [, setCurrentParams] = useState<ParameterValues>(defaultParams);
    const [pdfUrl, setPdfUrl] = useState<string | null>(initialPdfUrl || null);
    const [fileName, setFileName] = useState<string | null>(initialPdfUrl ? "Document.pdf" : null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleParametersChange = (values: ParameterValues) => {
        setCurrentParams(values);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== "application/pdf") {
                setError("Please select a valid PDF file.");
                return;
            }
            const objectUrl = URL.createObjectURL(file);
            setPdfUrl(objectUrl);
            setFileName(file.name);
            setError(null);
        }
    };

    const handleRemove = () => {
        if (pdfUrl && !initialPdfUrl) {
            URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(null);
        setFileName(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    useEffect(() => {
        return () => {
            // Cleanup blob URL on unmount if it was created locally
            if (pdfUrl && !initialPdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl, initialPdfUrl]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.type !== "application/pdf") {
                setError("Please upload a valid PDF file.");
                return;
            }
            const objectUrl = URL.createObjectURL(file);
            setPdfUrl(objectUrl);
            setFileName(file.name);
            setError(null);
        }
    };

    return (
        <WidgetContainer
            title={title}
            parameters={parameters}
            onParametersChange={handleParametersChange}
            darkMode={darkMode}
            onGroupedParametersChange={onGroupedParametersChange}
            groupedParametersValues={groupedParametersValues}
        >
            <div className={`flex flex-col h-full w-full ${pdfUrl ? 'min-h-[500px]' : ''} ${darkMode ? "text-white" : "text-gray-900"}`}>

                {/* Header / Controls */}
                {pdfUrl && (
                    <div className={`flex items-center justify-between p-2 text-sm border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                        <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-primary" />
                            <span className="font-medium truncate max-w-[200px]">{fileName}</span>
                        </div>
                        <button
                            onClick={handleRemove}
                            className={`p-1 rounded-md hover:bg-opacity-80 transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"}`}
                            title="Close PDF"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 relative overflow-hidden h-full">
                    {!pdfUrl ? (
                        <div
                            className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg m-4 transition-colors
                                ${darkMode
                                    ? "border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500 text-gray-400"
                                    : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-500"
                                }`}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <div className="flex flex-col items-center p-6 text-center">
                                <div className={`p-4 rounded-full mb-4 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                                    <Upload className={`w-8 h-8 ${darkMode ? "text-gray-300" : "text-gray-600"}`} />
                                </div>
                                <h3 className={`text-lg font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                                    Upload PDF
                                </h3>
                                <p className="text-sm mb-6 max-w-xs opacity-80">
                                    Drag and drop your PDF file here, or click to browse
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="application/pdf"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors
                                        ${darkMode
                                            ? "bg-blue-600 text-white hover:bg-blue-500"
                                            : "bg-blue-600 text-white hover:bg-blue-700"
                                        }`}
                                >
                                    Choose File
                                </button>

                                {error && (
                                    <div className="mt-4 flex items-center text-red-500 text-sm animate-pulse">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        {error}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <iframe
                            src={pdfUrl}
                            className="w-full h-full border-0"
                            title="PDF Viewer"
                        />
                    )}
                </div>
            </div>
        </WidgetContainer>
    );
};

export const PdfViewerWidgetDef = {
    component: PdfViewerWidget,
};
