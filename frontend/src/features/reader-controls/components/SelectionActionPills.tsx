import React from 'react'
import {
  MessageSquarePlus,
  Sparkles,
  Search,
  Copy,
  Share2,
  Trash2,
  Check,
  Headphones,
} from 'lucide-react'
import type { SelectionActionPillsProps } from '../types'

export const SelectionActionPills: React.FC<SelectionActionPillsProps> = ({
  selectedText,
  paragraphIndex,
  note,
  showNoteInput,
  setShowNoteInput,
  copied,
  existingHighlight,
  pillBtnClass,
  onStartTTSFromParagraph,
  onAskAICopilot,
  onSearchInBook,
  onGeneratePoster,
  handleCopy,
  onDeleteHighlight,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {onStartTTSFromParagraph && (
        <button
          type="button"
          onClick={() => onStartTTSFromParagraph(paragraphIndex)}
          className="px-3 py-1.5 rounded-full bg-emerald-600/14 hover:bg-emerald-600/24 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors"
          title="从当前选中段落开始听书"
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>从此段听</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowNoteInput((v) => !v)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${
          showNoteInput
            ? 'bg-[#1b88ee] text-white font-semibold'
            : pillBtnClass
        }`}
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        <span>{existingHighlight?.note ? '改想法' : '写想法'}</span>
      </button>

      <button
        type="button"
        onClick={() => onAskAICopilot(selectedText, 'explain')}
        className="px-3 py-1.5 rounded-full bg-[#1b88ee]/12 hover:bg-[#1b88ee]/20 text-[#1b88ee] text-xs font-semibold flex items-center gap-1 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>AI问书</span>
      </button>

      <button
        type="button"
        onClick={() => onAskAICopilot(selectedText, 'socratic')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${pillBtnClass}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#1b88ee]" />
        <span>追问</span>
      </button>

      <button
        type="button"
        onClick={() => onAskAICopilot(selectedText, 'bilingual')}
        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${pillBtnClass}`}
      >
        翻译
      </button>

      <button
        type="button"
        onClick={() => onSearchInBook(selectedText.slice(0, 12))}
        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${pillBtnClass}`}
      >
        <Search className="w-3.5 h-3.5" />
        <span>检索</span>
      </button>

      <button
        type="button"
        onClick={() => onGeneratePoster(selectedText, note)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${pillBtnClass}`}
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>金句卡</span>
      </button>

      <button
        type="button"
        onClick={handleCopy}
        className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${pillBtnClass}`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>已复制</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>复制</span>
          </>
        )}
      </button>

      {existingHighlight && onDeleteHighlight && (
        <button
          type="button"
          onClick={() => onDeleteHighlight(existingHighlight.id)}
          className="px-3 py-1.5 rounded-full bg-rose-500/12 hover:bg-rose-500/20 text-rose-500 text-xs font-medium flex items-center gap-1 ml-auto transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除</span>
        </button>
      )}
    </div>
  )
}
