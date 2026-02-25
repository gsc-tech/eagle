import React from "react";
import type { BaseWidgetProps } from "../types";
export interface PdfViewerWidgetProps extends BaseWidgetProps {
    initialPdfUrl?: string;
    darkMode?: boolean;
}
export declare const PdfViewerWidget: React.FC<PdfViewerWidgetProps>;
export declare const PdfViewerWidgetDef: {
    component: React.FC<PdfViewerWidgetProps>;
};
