"use client";

import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Undo,
  Redo,
  Minus,
  Pilcrow,
} from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

function ToolbarButton({
  pressed,
  onPressedChange,
  disabled,
  title,
  children,
}: {
  pressed?: boolean;
  onPressedChange: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Toggle
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      aria-label={title}
      title={title}
      className="size-8 p-0"
    >
      {children}
    </Toggle>
  );
}

export function RichTextEditor({ content, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tkn-prose min-h-72 px-4 py-3 outline-none",
      },
    },
  });

  const run = useCallback(
    (fn: (e: NonNullable<typeof editor>) => void) => {
      if (editor) fn(editor);
    },
    [editor],
  );

  if (!editor) return null;

  return (
    <div className={"overflow-hidden rounded-lg border bg-background " + (className ?? "")}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        <ToolbarButton
          pressed={editor.isActive("heading", { level: 1 })}
          onPressedChange={() => run((e) => e.chain().focus().toggleHeading({ level: 1 }).run())}
          title="Heading 1"
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("heading", { level: 2 })}
          onPressedChange={() => run((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}
          title="Heading 2"
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("heading", { level: 3 })}
          onPressedChange={() => run((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}
          title="Heading 3"
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("paragraph")}
          onPressedChange={() => run((e) => e.chain().focus().setParagraph().run())}
          title="Paragraph"
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          pressed={editor.isActive("bold")}
          onPressedChange={() => run((e) => e.chain().focus().toggleBold().run())}
          title="Bold"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("italic")}
          onPressedChange={() => run((e) => e.chain().focus().toggleItalic().run())}
          title="Italic"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("underline")}
          onPressedChange={() => run((e) => e.chain().focus().toggleUnderline().run())}
          title="Underline"
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          pressed={editor.isActive("bulletList")}
          onPressedChange={() => run((e) => e.chain().focus().toggleBulletList().run())}
          title="Bullet list"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={editor.isActive("orderedList")}
          onPressedChange={() => run((e) => e.chain().focus().toggleOrderedList().run())}
          title="Numbered list"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onPressedChange={() => run((e) => e.chain().focus().setHorizontalRule().run())}
          title="Horizontal rule"
        >
          <Minus className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <ToolbarButton
          onPressedChange={() => run((e) => e.chain().focus().undo().run())}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onPressedChange={() => run((e) => e.chain().focus().redo().run())}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="size-4" />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Detect whether stored NDA content is rich (HTML) or legacy plain text.
 * Plain text from `buildDefaultNdaText` never contains HTML tags.
 */
export function isRichNdaContent(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/** Convert plain text (with newlines) to basic HTML paragraphs for the editor. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
