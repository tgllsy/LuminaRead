import React, { useState } from 'react'
import {
  X,
  Trash2,
  Sparkles,
  Headphones,
  Copy,
  Check,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react'
import type { HighlightItem } from '../../../types'
import type { CopilotAskMode } from '../types'
import { HIGHLIGHT_COLORS } from '../constants'
import { MobileSelectionMoreMenu } from './MobileSelectionMoreMenu'

export interface MobileSelectionBarProps {
  selectedText: string
  paragraphIndex?: number
  existingHighlight?: HighlightItem | null
  color: HighlightItem['color']
  styleType: HighlightItem['style_type']
  note: string
  showNoteInput: boolean
  copied: boolean
  isDark: boolean
  floatingStyle?: React.CSSProperties
  onClose: () => void
  onSelectColor: (c: HighlightItem['color']) => void
  onSelectStyle: (s: HighlightItem['style_type']) => void
  setShowNoteInput: React.Dispatch<React.SetStateAction<boolean>>
  setNote: React.Dispatch<React.SetStateAction<string>>
  onSaveNote: () => void
  handleCopy: () => void
  onAskAICopilot: (text: string, mode: CopilotAskMode) => void
  onSearchInBook: (query: string) => void
  onGeneratePoster: (text: string, note?: string) => void
  onStartTTSFromParagraph?: (paragraphIndex: number) => void
  onDeleteHighlight?: (id: string) => void
}

export const MobileSelectionBar: React.FC<MobileSelectionBarProps> = ({
  selectedText,
  paragraphIndex,
  existingHighlight,
  color,
  styleType,
  note,
  showNoteInput,
  copied,
  isDark,
  floatingStyle,
  onClose,
  onSelectColor,
  onSelectStyle,
  setShowNoteInput,
  setNote,
  onSaveNote,
  handleCopy,
  onAskAICopilot,
  onSearchInBook,
  onGeneratePoster,
  onStartTTSFromParagraph,
  onDeleteHighlight,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const activeBtnBg = isDark ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-800'
  const normalBtnBg = isDark ? 'text-slate-300 hover:bg-white/8' : 'text-slate-600 hover:bg-slate-100'

  return (
    <div
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={floatingStyle}
      className={
        floatingStyle
          ? `fixed z-[60] backdrop-blur-xl rounded-2xl border p-2.5 space-y-2 select-none shadow-[0_12px_32px_rgba(15,23,42,0.18)] animate-in fade-in duration-100 ${
              isDark
                ? 'bg-slate-900/96 text-white border-slate-700/80 shadow-[0_16px_36px_rgba(0,0,0,0.6)]'
                : 'bg-white/96 text-slate-800 border-slate-200/90'
            }`
          : `fixed bottom-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] z-[60] backdrop-blur-xl rounded-2xl border p-2.5 space-y-2 select-none shadow-[0_14px_36px_rgba(15,23,42,0.18)] animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              isDark
                ? 'bg-slate-900/96 text-white border-slate-700/80 shadow-[0_16px_36px_rgba(0,0,0,0.6)]'
                : 'bg-white/96 text-slate-800 border-slate-200/90'
            }`
      }
    >
      {/* Row 1: 5 Colors Dot Array + Style Toggle + Right Actions */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          {HIGHLIGHT_COLORS.map((c) => {
            const isSelected = color === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectColor(c.id as HighlightItem['color'])}
                aria-label={c.label}
                className={`w-5 h-5 rounded-full ${c.dot} transition-transform flex items-center justify-center shrink-0 ${
                  isSelected
                    ? 'ring-2 ring-offset-1 ring-[#1b88ee] scale-110'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />}
              </button>
            )
          })}
        </div>

        <div className={`h-4 w-[1px] ${isDark ? 'bg-white/12' : 'bg-slate-200'}`} />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectStyle('marker')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              styleType === 'marker' ? 'bg-[#1b88ee] text-white font-semibold' : normalBtnBg
            }`}
          >
            高亮
          </button>
          <button
            type="button"
            onClick={() => onSelectStyle('wavy')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              styleType === 'wavy' ? 'bg-[#1b88ee] text-white font-semibold' : normalBtnBg
            }`}
          >
            波浪
          </button>
          <button
            type="button"
            onClick={() => onSelectStyle('underline')}
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              styleType === 'underline' ? 'bg-[#1b88ee] text-white font-semibold' : normalBtnBg
            }`}
          >
            划线
          </button>
        </div>

        <div className="flex items-center gap-0.5 ml-auto">
          {existingHighlight && onDeleteHighlight && (
            <button
              type="button"
              onClick={() => onDeleteHighlight(existingHighlight.id)}
              aria-label="删除划线"
              className="p-1 rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Row 2: High-frequency Actions Mini Pills */}
      <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(false)
            setShowNoteInput((v) => !v)
          }}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 transition-colors ${
            showNoteInput || existingHighlight?.note
              ? 'bg-amber-500/18 text-amber-700 dark:text-amber-300 font-semibold border border-amber-400/40'
              : normalBtnBg
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
          <span>{existingHighlight?.note ? '改想法' : '想法'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowMoreMenu(false)
            onAskAICopilot(selectedText, 'explain')
          }}
          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1b88ee]/12 text-[#1b88ee] hover:bg-[#1b88ee]/20 flex items-center gap-1 shrink-0 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI解释</span>
        </button>

        {onStartTTSFromParagraph && (
          <button
            type="button"
            onClick={() => {
              setShowMoreMenu(false)
              onStartTTSFromParagraph(paragraphIndex ?? 0)
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-600/12 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 flex items-center gap-1 shrink-0 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>听书</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 transition-colors ${normalBtnBg}`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>

        <div className="relative shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => setShowMoreMenu((v) => !v)}
            aria-label="更多操作"
            className={`p-1.5 rounded-xl text-xs flex items-center justify-center transition-colors ${
              showMoreMenu ? activeBtnBg : normalBtnBg
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <MobileSelectionMoreMenu
              isDark={isDark}
              selectedText={selectedText}
              note={note}
              normalBtnBg={normalBtnBg}
              onClose={() => setShowMoreMenu(false)}
              onAskAICopilot={onAskAICopilot}
              onGeneratePoster={onGeneratePoster}
              onSearchInBook={onSearchInBook}
            />
          )}
        </div>
      </div>

      {/* Row 3: Collapsible Thought Input */}
      {showNoteInput && (
        <div className={`pt-2 border-t flex items-center gap-2 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="写下这一刻的想法..."
            autoFocus
            className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl text-xs border outline-none transition-colors ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-[#1b88ee]'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#1b88ee]'
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveNote()
              if (e.key === 'Escape') setShowNoteInput(false)
            }}
          />
          <button
            type="button"
            onClick={onSaveNote}
            className="px-3 py-1.5 rounded-xl bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-semibold shrink-0 transition-colors"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setShowNoteInput(false)}
            className={`px-2 py-1.5 rounded-xl text-xs shrink-0 transition-colors ${normalBtnBg}`}
          >
            取消
          </button>
        </div>
      )}
    </div>
  )
}
