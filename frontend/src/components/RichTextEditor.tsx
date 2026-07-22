import Link from "@tiptap/extension-link"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react"

import { cn } from "@/lib/utils"

function ToolbarButton({ onClick, active, label, children }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn("inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted", active && "bg-muted text-cas-navy")}
    >
      {children}
    </button>
  )
}

/**
 * A small TipTap WYSIWYG editor. Emits HTML via onChange (which the server
 * sanitizes on save). The parent should give it a stable `key` per record so
 * switching to a different post re-initialises the content cleanly.
 */
export default function RichTextEditor({
  value,
  onChange,
  ariaLabel = "Post body",
}: {
  value: string
  onChange: (html: string) => void
  ariaLabel?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-52 max-h-96 overflow-y-auto px-3 py-2 text-sm leading-relaxed focus:outline-none [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-cas-navy [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_a]:text-cas-navy [&_a]:underline",
        "aria-label": ariaLabel,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
  })

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", prev ?? "https://")
    if (url === null) return
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()

      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} label="Bold"><Bold className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} label="Italic"><Italic className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} label="Strikethrough"><Strikethrough className="size-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} label="Heading 2"><Heading2 className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} label="Heading 3"><Heading3 className="size-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} label="Bulleted list"><List className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} label="Numbered list"><ListOrdered className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} label="Quote"><Quote className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} label="Code block"><Code className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={setLink} active={editor.isActive("link")} label="Link"><LinkIcon className="size-4" /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo"><Undo2 className="size-4" /></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo"><Redo2 className="size-4" /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
