import type { Meta, StoryObj } from "@storybook/react";
import { PdfViewerWidget } from "../widgets/PdfViewerWidget";

const meta: Meta<typeof PdfViewerWidget> = {
    title: "Widgets/PdfViewerWidget",
    component: PdfViewerWidget,
    args: {
        fetchMode: "manual",
        parameters: [],
        darkMode: false,
    },
    parameters: {
        layout: 'padded',
    },
    decorators: [
        (Story) => (
            <div style={{ minHeight: '600px', height: '600px', width: '100%' }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof PdfViewerWidget>;

export const Default: Story = {};

export const DarkMode: Story = {
    args: {
        darkMode: true,
    }
};

export const WithInitialPdf: Story = {
    args: {
        // Using a standard sample PDF
        initialPdfUrl: "https://pdfobject.com/pdf/sample.pdf",
    }
};
