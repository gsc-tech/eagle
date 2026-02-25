"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { WidgetContainer } from "../components/WidgetContainer";
import { useParameterDefaults } from "../hooks/useParameterDefaults";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
export const PdfViewerWidget = ({ apiUrl, // Not strictly used for upload, but good for conformity
title, parameters, initialPdfUrl, darkMode = false, groupedParametersValues, onGroupedParametersChange, }) => {
    const defaultParams = useParameterDefaults(parameters);
    const [, setCurrentParams] = useState(defaultParams);
    const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || null);
    const [fileName, setFileName] = useState(initialPdfUrl ? "Document.pdf" : null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const handleParametersChange = (values) => {
        setCurrentParams(values);
    };
    const handleFileChange = (event) => {
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
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e) => {
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
    return (_jsx(WidgetContainer, { title: title, parameters: parameters, onParametersChange: handleParametersChange, darkMode: darkMode, onGroupedParametersChange: onGroupedParametersChange, groupedParametersValues: groupedParametersValues, children: _jsxs("div", { className: `flex flex-col h-full w-full ${pdfUrl ? 'min-h-[500px]' : ''} ${darkMode ? "text-white" : "text-gray-900"}`, children: [pdfUrl && (_jsxs("div", { className: `flex items-center justify-between p-2 text-sm border-b ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`, children: [_jsxs("div", { className: "flex items-center gap-2 truncate", children: [_jsx(FileText, { className: "w-4 h-4 text-primary" }), _jsx("span", { className: "font-medium truncate max-w-[200px]", children: fileName })] }), _jsx("button", { onClick: handleRemove, className: `p-1 rounded-md hover:bg-opacity-80 transition-colors ${darkMode ? "hover:bg-gray-700 text-gray-400 hover:text-white" : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"}`, title: "Close PDF", children: _jsx(X, { className: "w-4 h-4" }) })] })), _jsx("div", { className: "flex-1 relative overflow-hidden h-full", children: !pdfUrl ? (_jsx("div", { className: `flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg m-4 transition-colors
                                ${darkMode
                            ? "border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-500 text-gray-400"
                            : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 text-gray-500"}`, onDragOver: handleDragOver, onDrop: handleDrop, children: _jsxs("div", { className: "flex flex-col items-center p-6 text-center", children: [_jsx("div", { className: `p-4 rounded-full mb-4 ${darkMode ? "bg-gray-700" : "bg-gray-200"}`, children: _jsx(Upload, { className: `w-8 h-8 ${darkMode ? "text-gray-300" : "text-gray-600"}` }) }), _jsx("h3", { className: `text-lg font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-900"}`, children: "Upload PDF" }), _jsx("p", { className: "text-sm mb-6 max-w-xs opacity-80", children: "Drag and drop your PDF file here, or click to browse" }), _jsx("input", { ref: fileInputRef, type: "file", accept: "application/pdf", className: "hidden", onChange: handleFileChange }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: `px-4 py-2 rounded-md font-medium text-sm transition-colors
                                        ${darkMode
                                        ? "bg-blue-600 text-white hover:bg-blue-500"
                                        : "bg-blue-600 text-white hover:bg-blue-700"}`, children: "Choose File" }), error && (_jsxs("div", { className: "mt-4 flex items-center text-red-500 text-sm animate-pulse", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), error] }))] }) })) : (_jsx("iframe", { src: pdfUrl, className: "w-full h-full border-0", title: "PDF Viewer" })) })] }) }));
};
export const PdfViewerWidgetDef = {
    component: PdfViewerWidget,
};
