import React from 'react'
import { Share2, Download } from 'lucide-react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import type { BookSummary, PosterModalState } from '../types'
import { generateAndDownloadPosterPng } from '../helpers/posterCanvasHelpers'

interface QuotePosterModalProps {
  posterModal: PosterModalState | null
  book: BookSummary
  currentChapterTitle: string
  onClose: () => void
  onShowToast: (msg: string) => void
}

export const QuotePosterModal: React.FC<QuotePosterModalProps> = ({
  posterModal,
  book,
  currentChapterTitle,
  onClose,
  onShowToast,
}) => {
  if (!posterModal) return null

  const handleCopyMarkdown = () => {
    const md = `> “${posterModal.text}”\n>\n> —— ${book.author}《${book.title}》（${currentChapterTitle}）${
      posterModal.note ? `\n\n💡 想法：${posterModal.note}` : ''
    }`
    navigator.clipboard?.writeText(md)
    onShowToast('金句海报 Markdown 已复制')
  }

  const handleDownloadPng = () => {
    generateAndDownloadPosterPng(book, currentChapterTitle, posterModal)
    onClose()
    onShowToast('高清金句 PNG 海报已下载')
  }

  return (
    <BottomSheet
      isOpen={Boolean(posterModal)}
      onClose={onClose}
      title="阅境金句分享卡"
      subtitle="支持一键复制 Markdown 或导出高清 PNG 海报"
      maxWidthClass="md:max-w-md"
    >
      <div className="p-4 sm:p-5 space-y-4">
        <div
          className="p-6 sm:p-7 rounded-2xl text-white space-y-5 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${
              book.cover_color || '#0f4c5c'
            } 0%, #0f172a 100%)`,
          }}
        >
          <div className="flex items-center justify-between text-xs opacity-75 font-mono">
            <span>LUMINAREAD · 阅境金句卡</span>
            <span>{new Date().toISOString().slice(0, 10)}</span>
          </div>

          <blockquote className="text-base sm:text-lg font-serif leading-relaxed">
            “{posterModal.text}”
          </blockquote>

          {posterModal.note && (
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-xs text-xs text-amber-200">
              💡 读者批注：{posterModal.note}
            </div>
          )}

          <div className="pt-4 border-t border-white/15 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">《{book.title}》</div>
              <div className="text-xs opacity-80">
                {book.author} · {currentChapterTitle}
              </div>
            </div>
            <Share2 className="w-5 h-5 opacity-75" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 active:scale-[0.97] transition-all cursor-pointer"
          >
            关闭预览
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold active:scale-[0.97] transition-all cursor-pointer"
            >
              复制文本
            </button>
            <button
              onClick={handleDownloadPng}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              下载高清 PNG 海报
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  )
}
