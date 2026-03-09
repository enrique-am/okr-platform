"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import { useState, useRef, useEffect } from "react"
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, Heading3, List, ListOrdered, Quote, Link2,
  Undo2, Redo2, AlignLeft, AlignCenter, AlignRight,
  Highlighter, Minus, ChevronDown,
} from "lucide-react"

// ─── Merge tags ───────────────────────────────────────────────────────────────

const MERGE_TAGS = [
  { tag: "{{nombre}}", label: "Nombre del destinatario" },
  { tag: "{{equipo}}", label: "Nombre del equipo" },
  { tag: "{{progreso}}", label: "Progreso / porcentaje" },
  { tag: "{{enlace}}", label: "Enlace a la plataforma" },
]

// ─── Color palette ────────────────────────────────────────────────────────────

const COLORS = [
  { color: "#111827", label: "Negro" },
  { color: "#dc2626", label: "Rojo" },
  { color: "#d97706", label: "Ámbar" },
  { color: "#16a34a", label: "Verde" },
  { color: "#2563eb", label: "Azul" },
  { color: "#7c3aed", label: "Morado" },
  { color: "#6b7280", label: "Gris" },
]

const BRAND = "#72bf44"

// ─── Component ────────────────────────────────────────────────────────────────

interface EmailBodyEditorProps {
  value: string
  onChange: (html: string) => void
}

export function EmailBodyEditor({ value, onChange }: EmailBodyEditorProps) {
  const [showMergeMenu, setShowMergeMenu] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const mergeRef = useRef<HTMLDivElement>(null)
  const colorRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight,
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

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mergeRef.current && !mergeRef.current.contains(e.target as Node)) {
        setShowMergeMenu(false)
      }
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
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

  const activeColor = editor.getAttributes("textStyle").color as string | undefined

  return (
    <div className="flex flex-col h-full border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-shrink-0">

        {/* History */}
        <Btn onClick={() => editor.chain().focus().undo().run()} title="Deshacer">
          <Undo2 size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Rehacer">
          <Redo2 size={15} />
        </Btn>

        <Divider />

        {/* Inline formatting */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrita">
          <Bold size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Cursiva">
          <Italic size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Subrayado">
          <UnderlineIcon size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
          <Strikethrough size={15} />
        </Btn>

        <Divider />

        {/* Alignment */}
        <Btn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Alinear izquierda">
          <AlignLeft size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centrar">
          <AlignCenter size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Alinear derecha">
          <AlignRight size={15} />
        </Btn>

        <Divider />

        {/* Color */}
        <div ref={colorRef} className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowColorPicker((v) => !v) }}
            title="Color de texto"
            className="p-1.5 rounded transition-colors text-gray-500 hover:text-gray-800 hover:bg-gray-100 flex flex-col items-center gap-px"
          >
            <span className="font-bold text-sm leading-none" style={{ color: activeColor ?? "#111827" }}>A</span>
            <span className="w-3.5 h-[3px] rounded-sm" style={{ backgroundColor: activeColor ?? "#111827" }} />
          </button>
          {showColorPicker && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-2 flex flex-col gap-2">
              <div className="flex gap-1.5">
                {COLORS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    title={label}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      editor.chain().focus().setColor(color).run()
                      setShowColorPicker(false)
                    }}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      borderColor: activeColor === color ? BRAND : "transparent",
                      outline: activeColor === color ? `2px solid ${BRAND}` : "none",
                      outlineOffset: "1px",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  editor.chain().focus().unsetColor().run()
                  setShowColorPicker(false)
                }}
                className="text-[11px] text-gray-400 hover:text-gray-600 text-center"
              >
                Restablecer color
              </button>
            </div>
          )}
        </div>
        <Btn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Resaltar texto">
          <Highlighter size={15} />
        </Btn>

        <Divider />

        {/* Lists & blocks */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista con viñetas">
          <List size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista numerada">
          <ListOrdered size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Cita">
          <Quote size={15} />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Línea divisoria">
          <Minus size={15} />
        </Btn>

        <Divider />

        {/* Headings */}
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

        {/* Link */}
        <Btn onClick={addLink} active={editor.isActive("link")} title="Insertar enlace">
          <Link2 size={15} />
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
