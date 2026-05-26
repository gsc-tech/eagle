import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Heading3,
  List,
  ListOrdered,
  Undo,
  Redo,
  Check,
  Loader2,
} from "lucide-react";
import type { BaseWidgetProps } from "../types";

export interface TextWidgetProps extends BaseWidgetProps {
  id?: string;
  /** Initial HTML content. When `storageKey` is set, localStorage takes precedence over this. */
  text?: string;
  /** Called with (id, html) on every debounced save. */
  onSync?: (id: string, data: any) => void;
  /**
   * When provided, content is automatically loaded from and saved to
   * `localStorage[storageKey]`. Each instance persists independently.
   */
  storageKey?: string;
  /** Placeholder shown when the editor is empty. */
  placeholder?: string;
  /** Show the formatting toolbar. Defaults to true. */
  showToolbar?: boolean;
  /** Render as a read-only viewer — hides toolbar and disables editing. */
  readOnly?: boolean;
  /**
   * Debounce delay in milliseconds before triggering a save.
   * Defaults to 2000 ms to match BackOffice QuickNote behavior.
   */
  debounceSaveMs?: number;
  /**
   * Show a save status indicator (spinner / checkmark) in the toolbar.
   * Defaults to true when `storageKey` or `onSync` is provided.
   */
  showSaveStatus?: boolean;
}

type SaveStatus = "idle" | "saving" | "saved";

// ── Toolbar button ─────────────────────────────────────────────────────────────

const MenuButton = ({
  isActive,
  disabled,
  onClick,
  children,
}: {
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    type="button"
    className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
      isActive
        ? "bg-blue-100 text-blue-600"
        : "text-gray-600 dark:text-[#e0e0e0] hover:bg-gray-100 dark:hover:bg-[#222222]"
    }`}
  >
    {children}
  </button>
);

const Divider = () => (
  <div className="w-px h-4 mx-1 bg-gray-300 dark:bg-[#3a3a3a] shrink-0" />
);

// ── Toolbar ────────────────────────────────────────────────────────────────────

function Toolbar({
  editor,
  saveStatus,
  showSaveStatus,
}: {
  editor: ReturnType<typeof useEditor>;
  saveStatus: SaveStatus;
  showSaveStatus: boolean;
}) {
  if (!editor) return null;

  return (
    <div className="shrink-0 flex items-center flex-wrap gap-1 p-2 border-b transition-colors bg-gray-50 dark:bg-[#1a1a1a] border-gray-200 dark:border-[#2e2e2e]">
      {/* Undo / Redo */}
      <MenuButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo size={16} />
      </MenuButton>

      <Divider />

      {/* Headings */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
      >
        <Heading1 size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 size={16} />
      </MenuButton>

      <Divider />

      {/* Inline formatting */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
      >
        <Bold size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
      >
        <Italic size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
      >
        <UnderlineIcon size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
      >
        <Strikethrough size={16} />
      </MenuButton>

      <Divider />

      {/* Text alignment */}
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
      >
        <AlignLeft size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
      >
        <AlignCenter size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
      >
        <AlignRight size={16} />
      </MenuButton>

      <Divider />

      {/* Lists */}
      <MenuButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
      >
        <List size={16} />
      </MenuButton>
      <MenuButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
      >
        <ListOrdered size={16} />
      </MenuButton>

      {/* Save status — pushed to right */}
      {showSaveStatus && saveStatus !== "idle" && (
        <div className="ml-auto shrink-0 flex items-center">
          {saveStatus === "saving" && (
            <Loader2 size={14} className="animate-spin text-muted-foreground opacity-50" />
          )}
          {saveStatus === "saved" && (
            <Check size={14} className="text-emerald-500" />
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const TextWidget: React.FC<TextWidgetProps & { darkMode?: boolean }> = ({
  id,
  text = "",
  onSync = () => {},
  darkMode = false,
  storageKey,
  placeholder = "Start typing…",
  showToolbar = true,
  readOnly = false,
  debounceSaveMs = 2000,
  showSaveStatus,
}) => {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Stable refs so callbacks don't stale-close over props
  const onSyncRef = useRef(onSync);
  const idRef = useRef(id);
  const storageKeyRef = useRef(storageKey);
  const debounceSaveMsRef = useRef(debounceSaveMs);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    onSyncRef.current = onSync;
    idRef.current = id;
    storageKeyRef.current = storageKey;
    debounceSaveMsRef.current = debounceSaveMs;
  });

  const shouldShowSaveStatus =
    showSaveStatus ?? !!(storageKey || onSync !== undefined);

  // ── Unified save ─────────────────────────────────────────────────────────────

  const doSave = useCallback(() => {
    const ed = editorRef.current;
    if (!ed || !isDirtyRef.current) return;
    const html = ed.getHTML();
    isDirtyRef.current = false;
    setSaveStatus("saving");

    if (storageKeyRef.current) {
      try { localStorage.setItem(storageKeyRef.current, html); } catch {}
    }
    onSyncRef.current(idRef.current ?? "unknown-id", html);

    setSaveStatus("saved");
    if (savedResetRef.current) clearTimeout(savedResetRef.current);
    savedResetRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
  }, []);

  // ── Initial content (read once at mount) ─────────────────────────────────────

  const initialContent = React.useMemo(() => {
    if (storageKey) {
      try { return localStorage.getItem(storageKey) ?? text; } catch {}
    }
    return text;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Editor setup ─────────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      if (readOnly) return;
      isDirtyRef.current = true;
      setSaveStatus("idle");
      if (savedResetRef.current) { clearTimeout(savedResetRef.current); savedResetRef.current = null; }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(doSave, debounceSaveMsRef.current);
      // Track empty for placeholder
      setIsEmpty(ed.isEmpty);
    },
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none w-full h-full p-4 ${darkMode ? "prose-invert" : ""}`,
      },
    },
  });

  // Keep editorRef in sync for doSave (which has a stable reference)
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // Flush on unmount — saves immediately if there's unsaved content
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedResetRef.current) clearTimeout(savedResetRef.current);
      if (isDirtyRef.current) doSave();
    };
  }, [doSave]);

  // Sync external `text` prop when storageKey is not controlling content
  useEffect(() => {
    if (!storageKey && editor && text && editor.getHTML() !== text) {
      editor.commands.setContent(text);
    }
  }, [text, editor, storageKey]);

  // ── Empty state for placeholder ───────────────────────────────────────────────

  const [isEmpty, setIsEmpty] = useState(
    () => !initialContent || initialContent === "<p></p>",
  );
  useEffect(() => {
    if (!editor) return;
    setIsEmpty(editor.isEmpty);
  }, [editor]);

  const toolbarVisible = showToolbar && !readOnly;

  return (
    <div className="w-full h-full drag-handle overflow-hidden flex flex-col border border-transparent transition-colors bg-white dark:bg-[#141414] dark:text-[#f5f5f5]">
      {toolbarVisible && (
        <Toolbar
          editor={editor}
          saveStatus={saveStatus}
          showSaveStatus={shouldShowSaveStatus}
        />
      )}
      <div
        className="relative flex-1 overflow-auto"
        onKeyDown={(e) => e.stopPropagation()}
      >
        {isEmpty && (
          <span className="absolute top-4 left-4 pointer-events-none text-gray-400 dark:text-[#555] select-none text-sm">
            {placeholder}
          </span>
        )}
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
};

export const TextWidgetDef = {
  component: TextWidget,
};
