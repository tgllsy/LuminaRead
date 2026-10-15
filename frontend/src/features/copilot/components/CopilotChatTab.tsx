import React from 'react'
import type { CopilotChatMode, CopilotResponse } from '../types'
import { CopilotContextQuote } from './CopilotContextQuote'
import { CopilotModeSelector } from './CopilotModeSelector'
import { CopilotResponseCard } from './CopilotResponseCard'
import { CopilotInputBar } from './CopilotInputBar'

interface CopilotChatTabProps {
  effectiveAnchorText: string
  hasSelectedText: boolean
  copilotMode: CopilotChatMode
  onSelectMode: (mode: CopilotChatMode) => void
  loading: boolean
  response: CopilotResponse | null
  savedNotice: boolean
  onSaveAsNote: () => void
  onSelectFollowUp: (question: string) => void
  onJumpToCitation?: (chapterIndex: number, paragraphIndex: number) => void
  questionInput: string
  onQuestionInputChange: (val: string) => void
  onSubmitQuestion: (prompt?: string) => void
  isDark: boolean
}

export const CopilotChatTab: React.FC<CopilotChatTabProps> = ({
  effectiveAnchorText,
  hasSelectedText,
  copilotMode,
  onSelectMode,
  loading,
  response,
  savedNotice,
  onSaveAsNote,
  onSelectFollowUp,
  onJumpToCitation,
  questionInput,
  onQuestionInputChange,
  onSubmitQuestion,
  isDark,
}) => {
  return (
    <>
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 ${
          isDark ? 'bg-[#141416]' : 'bg-[#f7f8fa]'
        }`}
      >
        <CopilotContextQuote
          effectiveAnchorText={effectiveAnchorText}
          hasSelectedText={hasSelectedText}
          isDark={isDark}
        />

        <CopilotModeSelector
          currentMode={copilotMode}
          onSelectMode={onSelectMode}
          isDark={isDark}
        />

        <CopilotResponseCard
          loading={loading}
          response={response}
          savedNotice={savedNotice}
          onSaveAsNote={onSaveAsNote}
          onSelectFollowUp={onSelectFollowUp}
          onJumpToCitation={onJumpToCitation}
          isDark={isDark}
        />
      </div>

      <CopilotInputBar
        value={questionInput}
        onChange={onQuestionInputChange}
        onSubmit={onSubmitQuestion}
        loading={loading}
        isDark={isDark}
      />
    </>
  )
}
