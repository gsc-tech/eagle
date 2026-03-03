"use client"

import React, { useState, useEffect, useRef } from "react";

interface InsertSheetModalProps {
    isOpen: boolean;
    isLoading: boolean;
    error: string | null;
    onConfirm: (productName: string) => void;
    onCancel: () => void;
}

export const InsertSheetModal: React.FC<InsertSheetModalProps> = ({
    isOpen,
    isLoading,
    error,
    onConfirm,
    onCancel,
}) => {
    const [productName, setProductName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setProductName("");
            // Focus input after modal opens
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        const trimmed = productName.trim().toUpperCase();
        if (!trimmed) return;
        onConfirm(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleConfirm();
        if (e.key === "Escape") onCancel();
    };

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onCancel}
                style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0, 0, 0, 0.55)",
                    zIndex: 9998,
                    backdropFilter: "blur(2px)",
                }}
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="insert-sheet-modal-title"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    zIndex: 9999,
                    background: "linear-gradient(145deg, #1e2130, #252840)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(100,120,255,0.15)",
                    padding: "28px 32px 24px",
                    minWidth: "360px",
                    maxWidth: "440px",
                    width: "90vw",
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    color: "#e2e8f0",
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: "20px", gap: "10px" }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: "18px",
                        }}
                    >
                        📊
                    </div>
                    <div>
                        <h2
                            id="insert-sheet-modal-title"
                            style={{
                                margin: 0,
                                fontSize: "16px",
                                fontWeight: 700,
                                color: "#f1f5f9",
                                letterSpacing: "-0.01em",
                            }}
                        >
                            Insert Product Sheet
                        </h2>
                    </div>
                </div>

                {/* Input */}
                <label
                    htmlFor="product-name-input"
                    style={{ display: "block", fontSize: "13px", color: "#94a3b8", marginBottom: "6px", fontWeight: 500 }}
                >
                    Product Code
                </label>
                <input
                    id="product-name-input"
                    ref={inputRef}
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. CL, RB, HO, NG…"
                    disabled={isLoading}
                    style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "rgba(255,255,255,0.06)",
                        color: "#f1f5f9",
                        fontSize: "15px",
                        fontWeight: 600,
                        outline: "none",
                        transition: "border-color 0.2s",
                        boxSizing: "border-box",
                        letterSpacing: "0.05em",
                        opacity: isLoading ? 0.6 : 1,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(79, 110, 247, 0.7)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
                />

                {/* Error message */}
                {error && (
                    <div
                        style={{
                            marginTop: "10px",
                            padding: "8px 12px",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.35)",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#fca5a5",
                        }}
                    >
                        ⚠️ {error}
                    </div>
                )}

                {/* Loading indicator */}
                {isLoading && (
                    <div
                        style={{
                            marginTop: "10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            color: "#94a3b8",
                        }}
                    >
                        <LoadingSpinner />
                        <span>Fetching contracts for <strong style={{ color: "#a5b4fc" }}>{productName}</strong>…</span>
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "20px", justifyContent: "flex-end" }}>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        style={{
                            padding: "9px 20px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.05)",
                            color: "#94a3b8",
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: isLoading ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            opacity: isLoading ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) (e.currentTarget.style.background = "rgba(255,255,255,0.1)");
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) (e.currentTarget.style.background = "rgba(255,255,255,0.05)");
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading || !productName.trim()}
                        style={{
                            padding: "9px 22px",
                            borderRadius: "8px",
                            border: "none",
                            background:
                                isLoading || !productName.trim()
                                    ? "rgba(79,110,247,0.4)"
                                    : "linear-gradient(135deg, #4f6ef7, #7c3aed)",
                            color: isLoading || !productName.trim() ? "#94a3b8" : "#fff",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: isLoading || !productName.trim() ? "not-allowed" : "pointer",
                            transition: "all 0.2s",
                            boxShadow:
                                isLoading || !productName.trim()
                                    ? "none"
                                    : "0 4px 15px rgba(79,110,247,0.4)",
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && productName.trim()) {
                                e.currentTarget.style.transform = "translateY(-1px)";
                                e.currentTarget.style.boxShadow = "0 6px 20px rgba(79,110,247,0.5)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                                isLoading || !productName.trim() ? "none" : "0 4px 15px rgba(79,110,247,0.4)";
                        }}
                    >
                        {isLoading ? "Loading…" : "Insert Sheet"}
                    </button>
                </div>
            </div>
        </>
    );
};

const LoadingSpinner: React.FC = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}
    >
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <circle cx="12" cy="12" r="10" stroke="#4f6ef7" strokeWidth="3" strokeOpacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="#4f6ef7" strokeWidth="3" strokeLinecap="round" />
    </svg>
);
