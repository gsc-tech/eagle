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
  darkMode,
}: {
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  darkMode?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`p-1.5 rounded transition-colors ${isActive
      ? "bg-blue-100 text-blue-600"
      : darkMode
        ? "text-gray-300 hover:bg-gray-700"
        : "text-gray-600 hover:bg-gray-100"
      }`}
    type="button"
  >
    {children}
  </button>
);

const Toolbar = ({ editor, darkMode }: { editor: any, darkMode: boolean }) => {
  if (!editor) return null;

  return (
    <div className={`flex items-center flex-wrap gap-1 p-2 border-b transition-colors ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        darkMode={darkMode}
      >
        <Bold size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        darkMode={darkMode}
      >
        <Italic size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        darkMode={darkMode}
      >
        <UnderlineIcon size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        darkMode={darkMode}
      >
        <Strikethrough size={16} />
      </MenuButton>
      <div className={`w-px h-4 mx-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        darkMode={darkMode}
      >
        <Heading1 size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        darkMode={darkMode}
      >
        <Heading2 size={16} />
      </MenuButton>
      <div className={`w-px h-4 mx-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        darkMode={darkMode}
      >
        <AlignLeft size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        darkMode={darkMode}
      >
        <AlignCenter size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        darkMode={darkMode}
      >
        <AlignRight size={16} />
      </MenuButton>
      <div className={`w-px h-4 mx-1 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        darkMode={darkMode}
      >
        <List size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        darkMode={darkMode}
      >
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

  // Keep refs updated
  useEffect(() => {
    onSyncRef.current = onSync;
    idRef.current = id;
  }, [onSync, id]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: text,
    onUpdate: ({ editor }) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        if (onSyncRef.current) {
          onSyncRef.current(idRef.current || "unknown-id", editor.getHTML());
        }
      }, 500);
    },
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none w-full h-full p-4 ${darkMode ? 'prose-invert' : ''}`,
      },
    },
  });

  // Sync content from prop if it changes externally
  useEffect(() => {
    if (editor && text && editor.getHTML() !== text) {
      editor.commands.setContent(text);
    }
  }, [text, editor]);

  return (
    <div
      className={`w-full h-full drag-handle overflow-hidden flex flex-col border border-transparent transition-colors ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white'
        }`}
    >
      <Toolbar editor={editor} darkMode={darkMode} />
      <div className="flex-1 overflow-auto" onKeyDown={(e) => e.stopPropagation()}>
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};
export const TextWidgetDef = {
  component: TextWidget,
};