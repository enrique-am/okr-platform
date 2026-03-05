"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import {
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, ImageIcon,
  Undo2, Redo2,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

const BRAND = "#72bf44"

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[300px] px-4 py-3 prose prose-sm max-w-none focus:outline-none",
      },
    },
  })

  if (!editor) return null
  const ed = editor

  function addLink() {
    const prev = ed.getAttributes("link").href ?? ""
    const url = window.prompt("URL del enlace:", prev)
    if (url === null) return
    if (url === "") {
      ed.chain().focus().unsetLink().run()
    } else {
      ed.chain().focus().setLink({ href: url }).run()
    }
  }

  function addImage() {
    const url = window.prompt("URL de la imagen:")
    if (url) ed.chain().focus().setImage({ src: url }).run()
  }

  type BtnProps = {
    onClick: () => void
    active?: boolean
    title: string
    children: React.ReactNode
  }

  function Btn({ onClick, active, title, children }: BtnProps) {
    return (
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); onClick() }}
        title={title}
        style={active ? { color: BRAND } : undefined}
        className={`p-1.5 rounded transition-colors ${
          active
            ? "bg-[#72bf44]/10"
            : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
        }`}
      >
        {children}
      </button>
    )
  }

  function Divider() {
    return <span className="w-px h-5 bg-gray-200 mx-0.5 self-center" />
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrita">
          <Bold size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Cursiva">
          <Italic size={15} />
        </Btn>

        <Divider />

        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Encabezado H2"
        >
          <Heading2 size={15} />
        </Btn>
        <Btn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Encabezado H3"
        >
          <Heading3 size={15} />
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista con viñetas">
          <List size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
          <ListOrdered size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Cita">
          <Quote size={15} />
        </Btn>

        <Divider />

        <Btn onClick={addLink} active={editor.isActive("link")} title="Insertar enlace">
          <Link2 size={15} />
        </Btn>
        <Btn onClick={addImage} title="Insertar imagen">
          <ImageIcon size={15} />
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          <Undo2 size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          <Redo2 size={15} />
        </Btn>
      </div>

      {/* Editor area */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
