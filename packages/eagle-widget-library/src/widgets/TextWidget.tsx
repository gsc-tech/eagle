import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from "lucide-react";
import type { BaseWidgetProps } from "../types";

export interface TextWidgetProps extends BaseWidgetProps {
  id?: string;
  text?: string;
  onSync?: (id: string, data: any) => void;
}

const MenuButton = ({
  isActive,
  onClick,
  children,
}: {
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded transition-colors ${isActive
      ? "bg-blue-100 text-blue-600"
      : "text-gray-600 dark:text-[#e0e0e0] hover:bg-gray-100 dark:hover:bg-[#222222]"
      }`}
    type="button"
  >
    {children}
  </button>
);

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center flex-wrap gap-1 p-2 border-b transition-colors bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2e2e2e]">
      <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}>
        <Bold size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}>
        <Italic size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")}>
        <UnderlineIcon size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive("strike")}>
        <Strikethrough size={16} />
      </MenuButton>
      <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-[#3a3a3a]" />
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive("heading", { level: 1 })}>
        <Heading1 size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive("heading", { level: 2 })}>
        <Heading2 size={16} />
      </MenuButton>
      <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-[#3a3a3a]" />
      <MenuButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })}>
        <AlignLeft size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })}>
        <AlignCenter size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })}>
        <AlignRight size={16} />
      </MenuButton>
      <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-[#3a3a3a]" />
      <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}>
        <List size={16} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}>
        <ListOrdered size={16} />
      </MenuButton>
    </div>
  );
};

export const TextWidget: React.FC<TextWidgetProps & { darkMode?: boolean }> = ({
  id,
  text = "start editing...",
  onSync = (id: string, data: any) => { },
  darkMode = false,
}) => {
  const debounceRef = React.useRef<any>(null);
  const onSyncRef = React.useRef(onSync);
  const idRef = React.useRef(id);

  useEffect(() => {
    onSyncRef.current = onSync;
    idRef.current = id;
  }, [onSync, id]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: text,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (onSyncRef.current) onSyncRef.current(idRef.current || "unknown-id", editor.getHTML());
      }, 500);
    },
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none w-full h-full p-4 ${darkMode ? 'prose-invert' : ''}`,
      },
    },
  });

  useEffect(() => {
    if (editor && text && editor.getHTML() !== text) {
      editor.commands.setContent(text);
    }
  }, [text, editor]);

  return (
    <div className="w-full h-full drag-handle overflow-hidden flex flex-col border border-transparent transition-colors bg-white dark:bg-[#141414] dark:text-[#f5f5f5]">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-auto" onKeyDown={(e) => e.stopPropagation()}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};
export const TextWidgetDef = {
  component: TextWidget,
};
