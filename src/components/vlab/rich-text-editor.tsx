import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { useEffect } from "react";

import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 160,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, protocols: ["http", "https"] } })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text min-h-[var(--rte-min)] px-3 py-2 focus:outline-none",
        "aria-label": placeholder ?? "Editor teks",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === "" && editor.isEmpty)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  const btn = (label: string, active: boolean, run: () => void, Icon: typeof Bold) => (
    <Toggle size="sm" pressed={active} onPressedChange={run} aria-label={label} title={label} type="button">
      <Icon className="size-4" />
    </Toggle>
  );

  return (
    <div
      className="rounded-md border bg-card focus-within:ring-2 focus-within:ring-ring"
      style={{ ["--rte-min" as string]: `${minHeight}px` }}
    >
      <div className="flex flex-wrap gap-0.5 border-b p-1">
        {editor && (
          <>
            {btn("Tebal", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold)}
            {btn("Miring", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic)}
            {btn("Judul", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2)}
            {btn("Subjudul", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3)}
            {btn("Daftar poin", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List)}
            {btn("Daftar bernomor", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered)}
            {btn("Kutipan", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), Quote)}
            {btn("Tautan", editor.isActive("link"), () => {
              if (editor.isActive("link")) return void editor.chain().focus().unsetLink().run();
              const url = window.prompt("Alamat tautan (https://…)");
              if (url && /^https?:\/\//i.test(url.trim())) editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
            }, Link2)}
            <span className="mx-1 w-px bg-border" />
            {btn("Urungkan", false, () => editor.chain().focus().undo().run(), Undo2)}
            {btn("Ulangi", false, () => editor.chain().focus().redo().run(), Redo2)}
          </>
        )}
      </div>
      <EditorContent editor={editor} className={cn("text-sm")} />
    </div>
  );
}
