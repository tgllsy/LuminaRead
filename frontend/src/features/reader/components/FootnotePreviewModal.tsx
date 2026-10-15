import React from 'react'
import { X } from 'lucide-react'
import type { FootnoteModalState, ReaderTypography } from '../types'

interface FootnotePreviewModalProps {
  footnoteModal: FootnoteModalState | null
  typography: ReaderTypography
  currentChapterTitle: string
  currentChapterIndex: number
  onClose: () => void
  onJumpToTarget: (targetChIdx: number, targetParaIdx: number) => void
  onJumpToBibliography: (bibChIdx: number) => void
}

export const FootnotePreviewModal: React.FC<FootnotePreviewModalProps> = ({
  footnoteModal,
  typography,
  currentChapterTitle,
  currentChapterIndex,
  onClose,
  onJumpToTarget,
  onJumpToBibliography,
}) => {
  if (!footnoteModal) return null

  const isDark = typography.theme === 'dark'

  return (
    <div
      data-no-hud-toggle="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/35 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-[0_-10px_40px_rgba(0,0,0,0.14)] p-5 space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 ${
          isDark
            ? 'bg-[#1c1c1e] text-[#f2f2f7] border-white/[0.08]'
            : 'bg-white text-[#1e1f22] border-black/[0.06]'
        }`}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center -mt-2 pb-1">
          <div
            className={`w-9 h-1 rounded-full ${
              isDark ? 'bg-white/20' : 'bg-black/15'
            }`}
          />
        </div>

        <div
          className={`flex items-center justify-between border-b pb-3 ${
            isDark ? 'border-white/[0.08]' : 'border-black/[0.06]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#1b88ee] text-white text-xs font-mono font-bold">
              {footnoteModal.rawMarker}
            </span>
            <span className="text-sm font-bold">注释与参考文献速览</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 rounded-full flex items-center justify-center ${
              isDark
                ? 'bg-[#2c2c2e] text-[#8e8e93] hover:text-white'
                : 'bg-[#f2f3f5] text-[#858c96] hover:text-[#1e1f22]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line ${
            isDark
              ? 'bg-[#2c2c2e]/70 border-white/[0.06] text-[#e5e5ea]'
              : 'bg-[#f7f8fa] border-black/[0.04] text-[#2b2e33]'
          }`}
        >
          {footnoteModal.footnoteText}
        </div>

        <div
          className={`flex items-center justify-between text-[11px] ${
            isDark ? 'text-[#8e8e93]' : 'text-[#858c96]'
          }`}
        >
          <span>
            出处章节：{footnoteModal.targetChapterTitle}（第{' '}
            {footnoteModal.targetChapterIndex + 1} 章）
          </span>
          <span>跳转后可一键返回当前段落</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-full text-xs font-semibold ${
              isDark
                ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ebebf5]'
                : 'bg-[#f2f3f5] hover:bg-[#e5e6eb] text-[#4e5358]'
            }`}
          >
            继续阅读
          </button>
          {footnoteModal.bibChapterIndex >= 0 &&
            footnoteModal.bibChapterIndex !== footnoteModal.targetChapterIndex && (
              <button
                type="button"
                onClick={() => onJumpToBibliography(footnoteModal.bibChapterIndex)}
                className={`px-4 py-2 rounded-full text-xs font-semibold ${
                  isDark
                    ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#4da3ff]'
                    : 'bg-[#1b88ee]/10 hover:bg-[#1b88ee]/15 text-[#1b88ee]'
                }`}
              >
                跳转全书参考文献
              </button>
            )}
          <button
            type="button"
            onClick={() =>
              onJumpToTarget(
                footnoteModal.targetChapterIndex,
                footnoteModal.targetParagraphIndex
              )
            }
            className="px-4 py-2 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-semibold shadow-xs"
          >
            跳转至注释位置 ↘
          </button>
        </div>
      </div>
    </div>
  )
}
