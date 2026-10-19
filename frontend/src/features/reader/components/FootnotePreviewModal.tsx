import React from 'react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
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
  onClose,
  onJumpToTarget,
  onJumpToBibliography,
}) => {
  if (!footnoteModal) return null

  const isDark = typography.theme === 'dark'

  const headerTitle = (
    <div className="flex items-center gap-2">
      <span className="px-2.5 py-0.5 rounded-full bg-[#1b88ee] text-white text-xs font-mono font-bold">
        {footnoteModal.rawMarker}
      </span>
      <span className="text-sm font-bold">注释与参考文献速览</span>
    </div>
  )

  return (
    <BottomSheet
      isOpen={Boolean(footnoteModal)}
      onClose={onClose}
      isDark={isDark}
      maxWidthClass="md:max-w-lg"
      title={headerTitle}
      subtitle={`出处章节：${footnoteModal.targetChapterTitle}（第 ${footnoteModal.targetChapterIndex + 1} 章）`}
    >
      <div className="p-4 sm:p-5 space-y-4">
        <div
          className={`p-3.5 rounded-2xl border-[0.5px] text-xs sm:text-sm leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line ${
            isDark
              ? 'bg-[#2c2c2e]/70 border-white/[0.08] text-[#e5e5ea]'
              : 'bg-[#f7f8fa] border-black/[0.05] text-[#2b2e33]'
          }`}
        >
          {footnoteModal.footnoteText}
        </div>

        <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-[#8e8e93]' : 'text-[#858c96]'}`}>
          <span>支持手势下拉关闭</span>
          <span>跳转后可一键返回当前段落</span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.97] transition-all cursor-pointer ${
              isDark ? 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-[#ebebf5]' : 'bg-[#f2f3f5] hover:bg-[#e5e6eb] text-[#4e5358]'
            }`}
          >
            继续阅读
          </button>
          {footnoteModal.bibChapterIndex >= 0 &&
            footnoteModal.bibChapterIndex !== footnoteModal.targetChapterIndex && (
              <button
                type="button"
                onClick={() => onJumpToBibliography(footnoteModal.bibChapterIndex)}
                className={`px-4 py-2 rounded-full text-xs font-semibold active:scale-[0.97] transition-all cursor-pointer ${
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
            onClick={() => onJumpToTarget(footnoteModal.targetChapterIndex, footnoteModal.targetParagraphIndex)}
            className="px-4 py-2 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-semibold shadow-xs active:scale-[0.97] transition-all cursor-pointer"
          >
            跳转至注释位置 ↘
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
