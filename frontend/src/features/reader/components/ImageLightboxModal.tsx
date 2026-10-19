import React from 'react'
import { BookOpen, X } from 'lucide-react'
import type { LightboxImageState } from '../types'

interface ImageLightboxModalProps {
  lightboxImage: LightboxImageState | null
  totalPdfPages: number
  bookId: string
  bookTitle: string
  onClose: () => void
  onSelectPage?: (pageNum: number) => void
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  lightboxImage,
  totalPdfPages,
  bookId,
  bookTitle,
  onClose,
  onSelectPage,
}) => {
  if (!lightboxImage) return null

  return (
    <div
      data-no-hud-toggle="true"
      onClick={onClose}
      className="fixed inset-0 h-dvh pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] z-50 bg-slate-950/88 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white"
      >
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold truncate">
            {lightboxImage.title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lightboxImage.pageNum !== undefined && (
            <>
              <button
                type="button"
                disabled={lightboxImage.pageNum <= 1}
                onClick={() => {
                  const prevP = Math.max(1, (lightboxImage.pageNum || 1) - 1)
                  onSelectPage?.(prevP)
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold"
              >
                ◀ 上一页
              </button>
              <button
                type="button"
                disabled={lightboxImage.pageNum >= totalPdfPages}
                onClick={() => {
                  const nextP = Math.min(
                    totalPdfPages,
                    (lightboxImage.pageNum || 1) + 1
                  )
                  onSelectPage?.(nextP)
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold"
              >
                下一页 ▶
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="flex-1 w-full max-w-5xl my-3 flex items-center justify-center overflow-auto"
      >
        <img
          src={lightboxImage.url}
          alt={lightboxImage.title}
          className="max-h-[82vh] w-auto object-contain rounded-xl shadow-2xl bg-white"
        />
      </div>

      <div className="text-xs text-slate-400">
        点击空白处或右上角 × 即可返回当前阅读位置
      </div>
    </div>
  )
}
