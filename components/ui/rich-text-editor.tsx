"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Underline from "@tiptap/extension-underline"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableHeader from "@tiptap/extension-table-header"
import TableCell from "@tiptap/extension-table-cell"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { useState, useRef, useEffect } from "react"
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading2, Heading3, List, ListOrdered, Quote, Link2, ImageIcon,
  Undo2, Redo2, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Minus, Table as TableIcon, Code2,
} from "lucide-react"

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

// ─── Component ────────────────────────────────────────────────────────────────

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

const BRAND = "#72bf44"

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [htmlMode, setHtmlMode] = useState(false)
  const [htmlRaw, setHtmlRaw] = useState("")
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)

  // Close color picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Subscript,
      Superscript,
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[300px] px-4 py-3 prose prose-sm max-w-none focus:outline-none [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_th]:border [&_th]:border-gray-200 [&_th]:p-2 [&_th]:bg-gray-50 [&_th]:font-semibold",
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

  function toggleHtmlMode() {
    if (!htmlMode) {
      setHtmlRaw(ed.getHTML())
      setHtmlMode(true)
    } else {
      ed.commands.setContent(htmlRaw)
      onChange(htmlRaw)
      setHtmlMode(false)
    }
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
    return <span className="w-px h-5 bg-gray-200 mx-0.5 self-center flex-shrink-0" />
  }

  const inTable = ed.can().deleteTable()
  const activeColor = ed.getAttributes("textStyle").color as string | undefined

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50">

        {/* History */}
        <Btn onClick={() => ed.chain().focus().undo().run()} title="Deshacer">
          <Undo2 size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().redo().run()} title="Rehacer">
          <Redo2 size={15} />
        </Btn>

        <Divider />

        {/* Headings */}
        <Btn onClick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()} active={ed.isActive("heading", { level: 2 })} title="Encabezado H2">
          <Heading2 size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleHeading({ level: 3 }).run()} active={ed.isActive("heading", { level: 3 })} title="Encabezado H3">
          <Heading3 size={15} />
        </Btn>

        <Divider />

        {/* Inline formatting */}
        <Btn onClick={() => ed.chain().focus().toggleBold().run()} active={ed.isActive("bold")} title="Negrita">
          <Bold size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleItalic().run()} active={ed.isActive("italic")} title="Cursiva">
          <Italic size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleUnderline().run()} active={ed.isActive("underline")} title="Subrayado">
          <UnderlineIcon size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleStrike().run()} active={ed.isActive("strike")} title="Tachado">
          <Strikethrough size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleCode().run()} active={ed.isActive("code")} title="Código inline">
          <Code size={15} />
        </Btn>

        <Divider />

        {/* Script */}
        <Btn onClick={() => ed.chain().focus().toggleSubscript().run()} active={ed.isActive("subscript")} title="Subíndice">
          <SubscriptIcon size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleSuperscript().run()} active={ed.isActive("superscript")} title="Superíndice">
          <SuperscriptIcon size={15} />
        </Btn>

        <Divider />

        {/* Alignment */}
        <Btn onClick={() => ed.chain().focus().setTextAlign("left").run()} active={ed.isActive({ textAlign: "left" })} title="Alinear izquierda">
          <AlignLeft size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().setTextAlign("center").run()} active={ed.isActive({ textAlign: "center" })} title="Centrar">
          <AlignCenter size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().setTextAlign("right").run()} active={ed.isActive({ textAlign: "right" })} title="Alinear derecha">
          <AlignRight size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().setTextAlign("justify").run()} active={ed.isActive({ textAlign: "justify" })} title="Justificar">
          <AlignJustify size={15} />
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
                      ed.chain().focus().setColor(color).run()
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
                  ed.chain().focus().unsetColor().run()
                  setShowColorPicker(false)
                }}
                className="text-[11px] text-gray-400 hover:text-gray-600 text-center"
              >
                Restablecer color
              </button>
            </div>
          )}
        </div>
        <Btn onClick={() => ed.chain().focus().toggleHighlight().run()} active={ed.isActive("highlight")} title="Resaltar texto">
          <Highlighter size={15} />
        </Btn>

        <Divider />

        {/* Lists & blocks */}
        <Btn onClick={() => ed.chain().focus().toggleBulletList().run()} active={ed.isActive("bulletList")} title="Lista con viñetas">
          <List size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleOrderedList().run()} active={ed.isActive("orderedList")} title="Lista numerada">
          <ListOrdered size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleBlockquote().run()} active={ed.isActive("blockquote")} title="Cita">
          <Quote size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().toggleCodeBlock().run()} active={ed.isActive("codeBlock")} title="Bloque de código">
          <Code2 size={15} />
        </Btn>
        <Btn onClick={() => ed.chain().focus().setHorizontalRule().run()} title="Línea divisoria">
          <Minus size={15} />
        </Btn>

        <Divider />

        {/* Table */}
        <Btn
          onClick={() => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={inTable}
          title="Insertar tabla"
        >
          <TableIcon size={15} />
        </Btn>
        {inTable && (
          <>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().addColumnBefore().run() }} title="Insertar columna antes" className="px-1.5 py-1 text-[10px] font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors">+col←</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().addColumnAfter().run() }} title="Insertar columna después" className="px-1.5 py-1 text-[10px] font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors">+col→</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().deleteColumn().run() }} title="Eliminar columna" className="px-1.5 py-1 text-[10px] font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors">−col</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().addRowBefore().run() }} title="Insertar fila antes" className="px-1.5 py-1 text-[10px] font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors">+fila↑</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().addRowAfter().run() }} title="Insertar fila después" className="px-1.5 py-1 text-[10px] font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors">+fila↓</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().deleteRow().run() }} title="Eliminar fila" className="px-1.5 py-1 text-[10px] font-medium rounded text-gray-500 hover:bg-gray-100 transition-colors">−fila</button>
            <button type="button" onMouseDown={(e) => { e.preventDefault(); ed.chain().focus().deleteTable().run() }} title="Eliminar tabla" className="px-1.5 py-1 text-[10px] font-medium rounded text-red-400 hover:bg-red-50 transition-colors">×tabla</button>
          </>
        )}

        <Divider />

        {/* Media */}
        <Btn onClick={addLink} active={ed.isActive("link")} title="Insertar enlace">
          <Link2 size={15} />
        </Btn>
        <Btn onClick={addImage} title="Insertar imagen">
          <ImageIcon size={15} />
        </Btn>

        <Divider />

        {/* HTML source toggle */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); toggleHtmlMode() }}
          title={htmlMode ? "Volver al editor visual" : "Ver código HTML"}
          className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition-colors ${
            htmlMode
              ? "bg-[#72bf44]/10 text-brand-700"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          {"</>"}
        </button>
      </div>

      {/* Editor area */}
      <div className="bg-white">
        <div style={{ display: htmlMode ? "none" : "block" }}>
          <EditorContent editor={editor} />
        </div>
        {htmlMode && (
          <textarea
            value={htmlRaw}
            onChange={(e) => setHtmlRaw(e.target.value)}
            className="w-full min-h-[300px] px-4 py-3 font-mono text-xs text-gray-700 bg-gray-50 outline-none resize-y"
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}
