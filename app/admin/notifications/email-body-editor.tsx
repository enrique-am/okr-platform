"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import { useState, useRef, useEffect } from "react"
import {
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Link2,
  Undo2, Redo2, ChevronDown,
} from "lucide-react"

// ─── Merge tags ───────────────────────────────────────────────────────────────

const MERGE_TAGS = [
  { tag: "{{nombre}}", label: "Nombre del destinatario" },
  { tag: "{{equipo}}", label: "Nombre del equipo" },
  { tag: "{{progreso}}", label: "Progreso / porcentaje" },
  { tag: "{{enlace}}", label: "Enlace a la plataforma" },
]

const BRAND = "#72bf44"

// ─── Component ────────────────────────────────────────────────────────────────

interface EmailBodyEditorProps {
  value: string
  onChange: (html: string) => void
}

export function EmailBodyEditor({ value, onChange }: EmailBodyEditorProps) {
  const [showMergeMenu, setShowMergeMenu] = useState(false)
  const mergeRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px] px-6 py-5 prose prose-sm max-w-none focus:outline-none",
      },
    },
  })

  // Close merge menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mergeRef.current && !mergeRef.current.contains(e.target as Node)) {
        setShowMergeMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function insertMergeTag(tag: string) {
    editor?.chain().focus().insertContent(tag).run()
    setShowMergeMenu(false)
  }

  function addLink() {
    const prev = editor?.getAttributes("link").href ?? ""
    const url = window.prompt("URL del enlace:", prev)
    if (url === null) return
    if (url === "") {
      editor?.chain().focus().unsetLink().run()
    } else {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  if (!editor) return null

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
          active ? "bg-[#72bf44]/10" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
        }`}
      >
        {children}
      </button>
    )
  }

  function Divider() {
    return <span className="w-px h-5 bg-gray-200 mx-0.5 self-center flex-shrink-0" />
  }

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
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
        <Divider />
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          <Undo2 size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          <Redo2 size={15} />
        </Btn>

        {/* Merge tags dropdown — pushed to the right */}
        <div ref={mergeRef} className="relative ml-auto">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowMergeMenu((v) => !v) }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-brand-400 hover:text-brand-700 transition-colors"
          >
            <span className="font-mono font-bold">{"{ }"}</span>
            Insertar variable
            <ChevronDown size={12} />
          </button>
          {showMergeMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-60 py-1 overflow-hidden">
              {MERGE_TAGS.map(({ tag, label }) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertMergeTag(tag) }}
                  className="w-full flex flex-col items-start px-4 py-2.5 hover:bg-brand-50 transition-colors text-left"
                >
                  <span className="font-mono text-xs font-semibold text-brand-600">{tag}</span>
                  <span className="text-xs text-gray-500 mt-0.5">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
