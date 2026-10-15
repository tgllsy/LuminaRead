import React, { useState, useEffect } from 'react'
import { X, Sparkles, Send, Loader2 } from 'lucide-react'
import type { BookSummary, AIConversationItem, AskAiPayload } from '../types'
import { AI_MODE_META, PRESET_AI_QUESTIONS } from '../constants'

interface AiWorkbenchModalProps {
  books: BookSummary[]
  initialBookId?: string
  bookTocMap: Record<string, Array<{ id?: string; index: number; title: string }>>
  onLoadToc: (bookId: string) => void
  onClose: () => void
  onAskAi: (payload: AskAiPayload) => Promise<unknown>
}

export const AiWorkbenchModal: React.FC<AiWorkbenchModalProps> = ({
  books,
  initialBookId,
  bookTocMap,
  onLoadToc,
  onClose,
  onAskAi,
}) => {
  const [bookId, setBookId] = useState<string>(
    initialBookId && initialBookId !== 'all' ? initialBookId : books[0]?.id || ''
  )
  const [chapterIndex, setChapterIndex] = useState(0)
  const [selectedText, setSelectedText] = useState('')
  const [mode, setMode] = useState<AIConversationItem['mode']>('custom')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (bookId) onLoadToc(bookId)
  }, [bookId, onLoadToc])

  const toc = bookTocMap[bookId] || []
  const currentChapterTitle =
    toc.find((c) => c.index === chapterIndex)?.title || `第 ${chapterIndex + 1} 章`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bookId || !question.trim() || loading) return
    setLoading(true)
    try {
      await onAskAi({
        bookId,
        chapterIndex,
        chapterTitle: currentChapterTitle,
        selectedText: selectedText.trim(),
        mode,
        question: question.trim(),
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-800">向全书 AI 深度研讨提问</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Book & Chapter Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">研讨目标图书</label>
              <select
                value={bookId}
                onChange={(e) => {
                  setBookId(e.target.value)
                  setChapterIndex(0)
                }}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">当前关联章节</label>
              <select
                value={chapterIndex}
                onChange={(e) => setChapterIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 truncate"
              >
                {toc.length > 0 ? (
                  toc.map((c) => (
                    <option key={c.index} value={c.index}>
                      {c.title}
                    </option>
                  ))
                ) : (
                  <option value={0}>全书总览</option>
                )}
              </select>
            </div>
          </div>

          {/* AI Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">研讨思维模型模式</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(AI_MODE_META) as Array<AIConversationItem['mode']>).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`p-2 rounded-xl text-left border text-xs font-medium transition-all cursor-pointer ${
                    mode === m
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {AI_MODE_META[m].shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Context Quote (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              选段锚点背景（可选，提供具体段落供 AI 解析）
            </label>
            <textarea
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="可粘贴书中的段落原文..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          {/* Question & Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">研讨核心问题</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="请输入你想向 AI 深入探讨的问题..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 mb-2"
              required
            />
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 block">推荐思维模型快捷指令：</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_AI_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuestion(q)}
                    className="px-2 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{loading ? '思考中...' : '发起研讨'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
