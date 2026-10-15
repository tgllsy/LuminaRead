import React, { useState, useEffect } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import type { BookSummary, HighlightItem, CreateNotePayload } from '../types'
import { COLOR_META, STYLE_LABELS } from '../constants'

interface CreateNoteModalProps {
  books: BookSummary[]
  initialBookId?: string
  bookTocMap: Record<string, Array<{ id?: string; index: number; title: string }>>
  onLoadToc: (bookId: string) => void
  onClose: () => void
  onCreateNote: (payload: CreateNotePayload) => Promise<void>
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  books, initialBookId, bookTocMap, onLoadToc, onClose, onCreateNote,
}) => {
  const [bookId, setBookId] = useState<string>(initialBookId && initialBookId !== 'all' ? initialBookId : books[0]?.id || '')
  const [chapterIndex, setChapterIndex] = useState(0)
  const [quote, setQuote] = useState('')
  const [note, setNote] = useState('')
  const [color, setColor] = useState<HighlightItem['color']>('yellow')
  const [style, setStyle] = useState<HighlightItem['style_type']>('marker')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (bookId) onLoadToc(bookId) }, [bookId, onLoadToc])
  const toc = bookTocMap[bookId] || []
  const currentChapterTitle = toc.find((c) => c.index === chapterIndex)?.title || `第 ${chapterIndex + 1} 章`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookId || (!quote.trim() && !note.trim()) || submitting) return
    setSubmitting(true)
    try {
      await onCreateNote({
        bookId, chapterIndex, chapterTitle: currentChapterTitle,
        quote: quote.trim() || '随手笔记', note: note.trim(), color, style,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">添加随想笔记与划线</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">目标图书</label>
              <select
                value={bookId} onChange={(e) => { setBookId(e.target.value); setChapterIndex(0) }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
              >
                {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">关联章节</label>
              <select
                value={chapterIndex} onChange={(e) => setChapterIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] truncate"
              >
                {toc.length > 0 ? toc.map((c) => <option key={c.index} value={c.index}>{c.title}</option>) : <option value={0}>默认章节</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">摘录原文 / 锚点 (可选)</label>
            <textarea
              value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="书中的关键金句或选段..." rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">我的读书笔记 / 深度思考</label>
            <textarea
              value={note} onChange={(e) => setNote(e.target.value)} placeholder="写下你的理解、感悟与知识关联..." rows={3} required
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
            />
          </div>

          <NoteStyleFooter
            color={color} style={style} submitting={submitting} disabled={submitting || (!quote.trim() && !note.trim())}
            onSelectColor={setColor} onSelectStyle={setStyle} onClose={onClose}
          />
        </form>
      </div>
    </div>
  )
}

const NoteStyleFooter: React.FC<{
  color: HighlightItem['color']
  style: HighlightItem['style_type']
  submitting: boolean
  disabled: boolean
  onSelectColor: (c: HighlightItem['color']) => void
  onSelectStyle: (s: HighlightItem['style_type']) => void
  onClose: () => void
}> = ({ color, style, submitting, disabled, onSelectColor, onSelectStyle, onClose }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        {(Object.keys(COLOR_META) as Array<HighlightItem['color']>).map((cKey) => (
          <button
            key={cKey}
            type="button"
            onClick={() => onSelectColor(cKey)}
            className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${COLOR_META[cKey].dot} ${
              color === cKey ? 'ring-2 ring-slate-900 scale-110' : 'opacity-70'
            }`}
            title={COLOR_META[cKey].label}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
        {(Object.keys(STYLE_LABELS) as Array<HighlightItem['style_type']>).map((sKey) => (
          <button
            key={sKey}
            type="button"
            onClick={() => onSelectStyle(sKey)}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
              style === sKey
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {STYLE_LABELS[sKey]}
          </button>
        ))}
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
      >
        取消
      </button>
      <button
        type="submit"
        disabled={disabled}
        className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium text-white bg-[#1b88ee] hover:bg-[#1677d2] rounded-xl shadow-xs transition-colors cursor-pointer"
      >
        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        <span>保存笔记</span>
      </button>
    </div>
  </div>
)
