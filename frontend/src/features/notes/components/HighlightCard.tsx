import React, { useState } from 'react'
import {
  MessageSquareQuote,
  Trash2,
  Edit3,
  Copy,
  Check,
  ArrowUpRight,
} from 'lucide-react'
import type { HighlightItem, JumpTarget } from '../types'
import { COLOR_META, STYLE_LABELS } from '../constants'

interface HighlightCardProps {
  item: HighlightItem
  onOpenBook: (target: JumpTarget) => void
  onSaveEdit: (
    hlId: string,
    bookId: string,
    patch: {
      note?: string
      selected_text?: string
      color?: HighlightItem['color']
      style_type?: HighlightItem['style_type']
    }
  ) => Promise<void>
  onDelete: (hlId: string, bookId: string) => Promise<void>
  onSelectBook: (bookId: string) => void
}

export const HighlightCard: React.FC<HighlightCardProps> = ({
  item, onOpenBook, onSaveEdit, onDelete, onSelectBook,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editQuote, setEditQuote] = useState(item.selected_text)
  const [editNote, setEditNote] = useState(item.note || '')
  const [editColor, setEditColor] = useState<HighlightItem['color']>(item.color)
  const [editStyle, setEditStyle] = useState<HighlightItem['style_type']>(item.style_type)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const cMeta = COLOR_META[item.color] || COLOR_META.yellow
  const hasNote = Boolean(item.note?.trim())

  const handleCopy = () => {
    const text = item.note ? `“${item.selected_text}”\n\n【我的读书笔记】\n${item.note}` : `“${item.selected_text}”`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSaveEdit(item.id, item.book_id, {
        selected_text: editQuote.trim(), note: editNote.trim(), color: editColor, style_type: editStyle,
      })
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to save highlight edit:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3 border-l-4 ${cMeta.border}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onSelectBook(item.book_id)}
            className="font-bold text-slate-900 hover:text-[#1b88ee] transition-colors truncate cursor-pointer"
          >
            《{item.book_title || '馆藏图书'}》
          </button>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 truncate">{item.chapter_title}</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
            {cMeta.label} · {STYLE_LABELS[item.style_type] || '马克笔'}
          </span>
          {hasNote && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70 text-[10px] font-semibold">
              💡 随想
            </span>
          )}
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          {(item.updated_at || item.created_at || '').slice(0, 16).replace('T', ' ')}
        </span>
      </div>

      {isEditing ? (
        <HighlightEditForm
          editQuote={editQuote} editNote={editNote} editColor={editColor} editStyle={editStyle} saving={saving}
          onChangeQuote={setEditQuote} onChangeNote={setEditNote} onChangeColor={setEditColor}
          onChangeStyle={setEditStyle} onCancel={() => setIsEditing(false)} onSave={handleSave}
        />
      ) : (
        <HighlightReadView
          item={item} hasNote={hasNote} copied={copied} onOpenBook={onOpenBook}
          onEdit={() => setIsEditing(true)} onCopy={handleCopy} onDelete={onDelete}
        />
      )}
    </div>
  )
}

const HighlightEditForm: React.FC<{
  editQuote: string
  editNote: string
  editColor: HighlightItem['color']
  editStyle: HighlightItem['style_type']
  saving: boolean
  onChangeQuote: (v: string) => void
  onChangeNote: (v: string) => void
  onChangeColor: (v: HighlightItem['color']) => void
  onChangeStyle: (v: HighlightItem['style_type']) => void
  onCancel: () => void
  onSave: () => void
}> = ({
  editQuote, editNote, editColor, editStyle, saving,
  onChangeQuote, onChangeNote, onChangeColor, onChangeStyle, onCancel, onSave,
}) => (
  <div className="space-y-3 pt-1 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80">
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">划线摘录：</label>
      <textarea
        value={editQuote} onChange={(e) => onChangeQuote(e.target.value)} rows={2}
        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-serif text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
      />
    </div>
    <div>
      <label className="text-[11px] font-semibold text-slate-500 mb-1 block">我的读书笔记：</label>
      <textarea
        value={editNote} onChange={(e) => onChangeNote(e.target.value)} placeholder="写下你的思考..." rows={3}
        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
      />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          {(Object.keys(COLOR_META) as Array<HighlightItem['color']>).map((cKey) => (
            <button
              key={cKey} type="button" onClick={() => onChangeColor(cKey)} title={COLOR_META[cKey].label}
              className={`w-5 h-5 rounded-full cursor-pointer ${COLOR_META[cKey].dot} ${editColor === cKey ? 'ring-2 ring-slate-900 scale-110' : 'opacity-70'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
          {(Object.keys(STYLE_LABELS) as Array<HighlightItem['style_type']>).map((sKey) => (
            <button
              key={sKey} type="button" onClick={() => onChangeStyle(sKey)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                editStyle === sKey ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {STYLE_LABELS[sKey]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 cursor-pointer">
          取消
        </button>
        <button type="button" disabled={saving} onClick={onSave} className="px-4 py-1.5 rounded-full bg-[#1b88ee] hover:bg-[#1477d6] text-white text-xs font-semibold cursor-pointer">
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  </div>
)

const HighlightReadView: React.FC<{
  item: HighlightItem
  hasNote: boolean
  copied: boolean
  onOpenBook: (target: JumpTarget) => void
  onEdit: () => void
  onCopy: () => void
  onDelete: (hlId: string, bookId: string) => Promise<void>
}> = ({ item, hasNote, copied, onOpenBook, onEdit, onCopy, onDelete }) => {
  const triggerJump = () =>
    onOpenBook({
      bookId: item.book_id, chapterIndex: item.chapter_index,
      paragraphIndex: item.paragraph_index, highlightKeyword: item.selected_text.slice(0, 12),
    })

  return (
    <>
      <div onClick={triggerJump} className="cursor-pointer group">
        <p
          className={`text-xs sm:text-sm font-serif text-slate-800 leading-relaxed pl-3 border-l-2 border-slate-200 group-hover:border-[#1b88ee] transition-colors ${
            item.style_type === 'wavy'
              ? 'underline decoration-wavy decoration-amber-500/70 underline-offset-4'
              : item.style_type === 'underline'
              ? 'underline decoration-2 decoration-[#1b88ee]/60 underline-offset-4'
              : ''
          }`}
        >
          “{item.selected_text}”
        </p>
      </div>

      {hasNote && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs sm:text-[13px] text-slate-800 leading-relaxed flex items-start gap-2">
          <MessageSquareQuote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-800 mr-1">随想：</span>
            <span className="whitespace-pre-wrap">{item.note}</span>
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs transition-colors cursor-pointer">
            <Edit3 className="w-3.5 h-3.5" /><span>编辑</span>
          </button>
          <button type="button" onClick={onCopy} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs transition-colors cursor-pointer">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制' : '复制'}</span>
          </button>
          <button
            type="button"
            onClick={() => { if (window.confirm('确定删除此条划线与笔记吗？')) onDelete(item.id, item.book_id) }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button type="button" onClick={triggerJump} className="inline-flex items-center gap-1 text-xs text-[#1b88ee] hover:underline font-medium cursor-pointer">
          <span>阅读定位</span><ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </>
  )
}
