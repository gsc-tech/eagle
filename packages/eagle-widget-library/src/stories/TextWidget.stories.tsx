import type { Meta, StoryObj } from "@storybook/react";
import { TextWidget } from "../widgets/TextWidget";
import { mockTextContent, mockSimpleTextContent, mockRichTextContent } from "./mocks/mockWidgetData";

const meta: Meta<typeof TextWidget> = {
    title: "Widgets/TextWidget",
    component: TextWidget,
    args: {
        id: "text-widget-1",
        text: mockTextContent,
        onSync: (id: string, data: any) => console.log("Synced:", id, data),
    },
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj<typeof TextWidget>;

export const Default: Story = {
    args: {
        text: mockTextContent,
    },
};

export const SimpleText: Story = {
    args: {
        text: mockSimpleTextContent,
    },
};

export const RichContent: Story = {
    args: {
        text: mockRichTextContent,
    },
};

export const EmptyEditor: Story = {
    args: {
        text: "",
    },
};
