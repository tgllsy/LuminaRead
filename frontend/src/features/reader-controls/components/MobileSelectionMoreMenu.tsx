import React from 'react'
import {
  HelpCircle,
  Languages,
  Share2,
  Search,
} from 'lucide-react'
import type { CopilotAskMode } from '../types'

export interface MobileSelectionMoreMenuProps {
  isDark: boolean
  selectedText: string
  note: string
  normalBtnBg: string
  onClose: () => void
  onAskAICopilot: (text: string, mode: CopilotAskMode) => void
  onGeneratePoster: (text: string, note?: string) => void
  onSearchInBook: (query: string) => void
}

export const MobileSelectionMoreMenu: React.FC<MobileSelectionMoreMenuProps> = ({
  isDark,
  selectedText,
  note,
  normalBtnBg,
  onClose,
  onAskAICopilot,
  onGeneratePoster,
  onSearchInBook,
}) => {
  return (
    <div
      className={`absolute right-0 bottom-full mb-2 w-36 rounded-xl border p-1 shadow-lg backdrop-blur-xl z-[70] space-y-0.5 animate-in fade-in duration-100 ${
        isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          onClose()
          onAskAICopilot(selectedText, 'socratic')
        }}
        className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center gap-2 ${normalBtnBg}`}
      >
        <HelpCircle className="w-3.5 h-3.5 text-[#1b88ee]" />
        <span>苏格拉底追问</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onClose()
          onAskAICopilot(selectedText, 'bilingual')
        }}
        className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center gap-2 ${normalBtnBg}`}
      >
        <Languages className="w-3.5 h-3.5 text-amber-500" />
        <span>双语翻译</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onClose()
          onGeneratePoster(selectedText, note)
        }}
        className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center gap-2 ${normalBtnBg}`}
      >
        <Share2 className="w-3.5 h-3.5 text-purple-500" />
        <span>生成金句卡</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onClose()
          onSearchInBook(selectedText.slice(0, 12))
        }}
        className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left flex items-center gap-2 ${normalBtnBg}`}
      >
        <Search className="w-3.5 h-3.5 text-emerald-500" />
        <span>在书中检索</span>
      </button>
    </div>
  )
}
