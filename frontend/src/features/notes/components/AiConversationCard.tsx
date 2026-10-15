import React, { useState } from 'react'
import {
  Sparkles,
  Pin,
  Trash2,
  Copy,
  Check,
  MessageSquarePlus,
  BookmarkPlus,
  Send,
  Loader2,
} from 'lucide-react'
import type { AIConversationItem } from '../types'
import { AI_MODE_META } from '../constants'
import { renderStructuredMarkdown } from '../helpers'

interface AiConversationCardProps {
  item: AIConversationItem
  onTogglePin: (conv: AIConversationItem) => Promise<void>
  onConvertToNote: (conv: AIConversationItem) => Promise<void>
  onDelete: (convId: string) => Promise<void>
  onFollowUpAsk: (parentConv: AIConversationItem, followUpQuestion: string) => Promise<void>
  onSelectBook: (bookId: string) => void
}

export const AiConversationCard: React.FC<AiConversationCardProps> = ({
  item,
  onTogglePin,
  onConvertToNote,
  onDelete,
  onFollowUpAsk,
  onSelectBook,
}) => {
  const [showReplyInput, setShowReplyInput] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingNote, setSavingNote] = useState(false)

  const modeMeta = AI_MODE_META[item.mode] || AI_MODE_META.custom

  const handleCopy = () => {
    const text = `【问】${item.question}\n\n【答】\n${item.answer_content}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || replying) return
    setReplying(true)
    try {
      await onFollowUpAsk(item, replyText.trim())
      setReplyText('')
      setShowReplyInput(false)
    } catch (err) {
      console.error('Failed to submit AI reply:', err)
    } finally {
      setReplying(false)
    }
  }

  const handleConvertToNote = async () => {
    if (savingNote || item.saved_highlight_id) return
    setSavingNote(true)
    try {
      await onConvertToNote(item)
    } catch (err) {
      console.error('Failed to convert AI conversation to note:', err)
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3 relative ${
        item.is_pinned ? 'ring-2 ring-purple-500/20 bg-purple-50/20' : ''
      }`}
    >
      {/* Header */}
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
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${modeMeta.badgeClass}`}>
            {modeMeta.label}
          </span>
          {item.saved_highlight_id && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
              已收录至读书笔记
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400">
            {(item.updated_at || item.created_at || '').slice(0, 16).replace('T', ' ')}
          </span>
          <button
            type="button"
            onClick={() => onTogglePin(item)}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              item.is_pinned ? 'text-purple-600 bg-purple-100' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={item.is_pinned ? '取消置顶' : '置顶研讨'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quoted Text if any */}
      {item.selected_text && (
        <div className="pl-3 border-l-2 border-purple-300 py-0.5">
          <p className="text-xs font-serif text-slate-500 italic line-clamp-2">
            “{item.selected_text}”
          </p>
        </div>
      )}

      {/* Question */}
      <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs sm:text-sm font-semibold text-purple-950 flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <span className="flex-1">{item.question}</span>
      </div>

      {/* Answer */}
      <div className="pl-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
        {renderStructuredMarkdown(item.answer_content)}
      </div>

      {/* Follow-up input form */}
      {showReplyInput && (
        <form onSubmit={handleReplySubmit} className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="围绕上述结论继续追问..."
            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={replying}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium cursor-pointer"
          >
            {replying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>追问</span>
          </button>
        </form>
      )}

      {/* Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowReplyInput((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 text-xs transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            <span>追问研讨</span>
          </button>

          {!item.saved_highlight_id && (
            <button
              type="button"
              disabled={savingNote}
              onClick={handleConvertToNote}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-[#1b88ee] hover:bg-blue-50 text-xs transition-colors cursor-pointer"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>{savingNote ? '保存中...' : '转存读书笔记'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '已复制' : '复制回答'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (window.confirm('确定删除此条 AI 对话吗？')) {
              onDelete(item.id)
            }
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
