import React, { useState } from 'react'
import { Bookmark, Check, Copy, X } from 'lucide-react'
import { copyTextToClipboard, SavedTtsQuote } from '../helpers/quoteStorage'

interface QuoteCelebrationModalProps {
  quote: SavedTtsQuote | null
  onClose: () => void
}

export const QuoteCelebrationModal: React.FC<QuoteCelebrationModalProps> = ({
  quote,
  onClose,
}) => {
  const [copied, setCopied] = useState(false)

  if (!quote) return null

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(quote.text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg bg-[#141622] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-500/10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono tracking-wider uppercase">
            <Bookmark className="w-4 h-4 fill-amber-400" />
            <span>金句已沉淀至灵感库</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative p-6 rounded-2xl bg-gradient-to-b from-white/5 to-transparent border border-white/10 font-serif space-y-4">
          <div className="text-4xl text-amber-400/40 font-serif leading-none select-none">“</div>
          <p className="text-white text-base sm:text-lg leading-relaxed text-justify tracking-wide -mt-4">
            {quote.text}
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-sans text-slate-400 border-t border-white/10">
            <span className="font-medium text-amber-300 truncate">《{quote.bookTitle}》</span>
            {quote.chapterTitle && <span className="truncate ml-2">{quote.chapterTitle}</span>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-300" />}
            <span>{copied ? '已复制' : '复制文案'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  )
}
