"use client"

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    darkMode: boolean;
    pageSizeOptions?: number[];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
    onPageSizeChange,
    darkMode,
    pageSizeOptions = [25, 50, 100, 200],
}) => {
    const borderColor = darkMode ? "border-gray-800" : "border-gray-100";
    const bgColor = darkMode ? "bg-gray-900/50" : "bg-gray-50/50";
    const textColor = darkMode ? "text-gray-400" : "text-gray-500";

    const btnBase = "h-6 min-w-[24px] px-1.5 text-xs rounded border transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed";
    const btnActive = darkMode
        ? "bg-[#00998b]/20 text-[#00998b] border-[#00998b]/40"
        : "bg-[#00998b]/10 text-[#00998b] border-[#00998b]/30";
    const btnDefault = darkMode
        ? "bg-transparent border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50";

    const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    const getPageNumbers = (): (number | "...")[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | "...")[] = [1];
        if (currentPage > 3) pages.push("...");
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pages.push(i);
        }
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
        return pages;
    };

    return (
        <div className={`flex items-center justify-between px-4 py-2 border-t ${borderColor} ${bgColor} flex-shrink-0`}>
            <div className={`flex items-center gap-2 text-[11px] ${textColor}`}>
                <span>Rows per page:</span>
                <select
                    value={pageSize}
                    onChange={(e) => {
                        onPageSizeChange(Number(e.target.value));
                        onPageChange(1);
                    }}
                    className={`border rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-[#00998b] ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-700"
                        }`}
                >
                    {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="tabular-nums">{start}–{end} of {totalItems.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={`${btnBase} ${btnDefault}`}
                    title="First page"
                >
                    <ChevronsLeft size={12} />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`${btnBase} ${btnDefault}`}
                    title="Previous page"
                >
                    <ChevronLeft size={12} />
                </button>
                {getPageNumbers().map((page, i) =>
                    page === "..." ? (
                        <span key={`ellipsis-${i}`} className={`px-1 text-[11px] ${textColor}`}>…</span>
                    ) : (
                        <button
                            key={page}
                            onClick={() => onPageChange(page as number)}
                            className={`${btnBase} ${currentPage === page ? btnActive : btnDefault}`}
                        >
                            {page}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`${btnBase} ${btnDefault}`}
                    title="Next page"
                >
                    <ChevronRight size={12} />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`${btnBase} ${btnDefault}`}
                    title="Last page"
                >
                    <ChevronsRight size={12} />
                </button>
            </div>
        </div>
    );
};
