import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { AICopilotModalProps, CopilotChatMode, CopilotLayoutMode } from './types'
import { buildEffectiveAnchorText } from './helpers'
import { useCopilotRecap, useCopilotChat, useCopilotPresets } from './hooks'
import { CopilotHeader, CopilotRecapTab, CopilotChatTab } from './components'

function useCopilotModalSync(params: {
  isOpen: boolean
  onClose: () => void
  book: AICopilotModalProps['book']
  currentChapterIndex: number
  currentChapterTitle: string
  paragraphIndex: number
  effectiveAnchorText: string
  customQuestion: string
  initialMode: NonNullable<AICopilotModalProps['initialMode']>
  selectedText: string
  sendQuery: ReturnType<typeof useCopilotChat>['sendQuery']
  loadRecap: ReturnType<typeof useCopilotRecap>['loadRecap']
  setCopilotMode: ReturnType<typeof useCopilotChat>['setCopilotMode']
  setActiveTab: React.Dispatch<React.SetStateAction<'recap' | 'copilot'>>
}) {
  const latestRef = useRef(params)
  latestRef.current = params

  const executeCopilotQuery = useCallback(
    (mode: CopilotChatMode, text?: string, question?: string, skipLog = false) => {
      const cur = latestRef.current
      cur.sendQuery({
        mode,
        book_id: cur.book.id,
        book_title: cur.book.title,
        chapter_index: cur.currentChapterIndex,
        chapter_title: cur.currentChapterTitle,
        paragraph_index: cur.paragraphIndex,
        selected_text: text ?? cur.effectiveAnchorText,
        question: question ?? cur.customQuestion,
        skip_log: skipLog,
      })
    },
    []
  )

  useEffect(() => {
    if (!params.isOpen) return
    const cur = latestRef.current
    if (params.initialMode === 'spoiler_free_recap') {
      cur.setActiveTab('recap')
    } else {
      cur.setActiveTab('copilot')
      cur.setCopilotMode(params.initialMode)
    }
    cur.loadRecap(cur.book.id, params.currentChapterIndex, cur.book.progress?.percentage || 0)
    executeCopilotQuery(
      params.initialMode === 'spoiler_free_recap' ? 'explain' : params.initialMode,
      cur.effectiveAnchorText,
      '',
      params.initialMode === 'spoiler_free_recap'
    )
  }, [
    params.isOpen,
    params.book.id,
    params.currentChapterIndex,
    params.initialMode,
    params.selectedText,
    executeCopilotQuery,
  ])

  useEffect(() => {
    if (!params.isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') params.onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [params.isOpen, params.onClose])

  return executeCopilotQuery
}

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen, onClose, book, currentChapterIndex, currentChapterTitle,
  chapterExcerpt = '', theme = 'light', initialMode = 'spoiler_free_recap',
  selectedText = '', paragraphIndex = 0, onSaveInsightAsNote, onJumpToCitation,
}) => {
  const isDark = theme === 'dark'
  const [activeTab, setActiveTab] = useState<'recap' | 'copilot'>(initialMode === 'spoiler_free_recap' ? 'recap' : 'copilot')
  const { recapData, recapLoading, recapError, selectedChar, setSelectedChar, loadRecap } = useCopilotRecap()
  const defaultChatMode: CopilotChatMode = initialMode === 'spoiler_free_recap' ? 'explain' : initialMode
  const chat = useCopilotChat(defaultChatMode)
  const { isSaveActionQuery } = useCopilotPresets()
  const effectiveAnchorText = useMemo(
    () => buildEffectiveAnchorText(selectedText, chapterExcerpt, book.title, currentChapterTitle),
    [selectedText, chapterExcerpt, book.title, currentChapterTitle]
  )

  const [layoutMode, setLayoutMode] = useState<CopilotLayoutMode>(() => {
    try {
      const saved = localStorage.getItem('luminaread_copilot_dock_v1') as CopilotLayoutMode | null
      return saved === 'dock-left' || saved === 'dock-right' || saved === 'modal' ? saved : 'modal'
    } catch {
      return 'modal'
    }
  })

  const handleChangeLayoutMode = (nextMode: CopilotLayoutMode) => {
    setLayoutMode(nextMode)
    try {
      localStorage.setItem('luminaread_copilot_dock_v1', nextMode)
    } catch {
      // ignore
    }
  }

  const executeCopilotQuery = useCopilotModalSync({
    isOpen, onClose, book, currentChapterIndex, currentChapterTitle, paragraphIndex,
    effectiveAnchorText, customQuestion: chat.customQuestion, initialMode, selectedText,
    sendQuery: chat.sendQuery, loadRecap, setCopilotMode: chat.setCopilotMode, setActiveTab,
  })

  if (!isOpen) return null

  const isDock = layoutMode !== 'modal'
  const isDockLeft = layoutMode === 'dock-left'

  return (
    <div
      data-no-hud-toggle="true"
      onClick={isDock ? undefined : onClose}
      className={`fixed inset-0 z-50 transition-all ${
        isDock
          ? `pointer-events-none flex items-stretch sm:items-start ${
              isDockLeft ? 'sm:justify-start sm:pl-4 sm:pt-14' : 'sm:justify-end sm:pr-4 sm:pt-14'
            } p-0`
          : 'flex items-stretch sm:items-center justify-center sm:bg-black/45 sm:backdrop-blur-xs p-0 sm:p-6'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`pointer-events-auto transition-all ${
          isDock
            ? 'w-full sm:w-[400px] xl:w-[440px] h-dvh sm:h-[calc(100dvh-4.5rem)] rounded-none sm:rounded-3xl shadow-2xl border flex flex-col overflow-hidden'
            : 'w-full max-w-3xl h-dvh sm:h-auto sm:max-h-[86dvh] rounded-none sm:rounded-3xl sm:shadow-2xl sm:border flex flex-col overflow-hidden'
        } ${
          isDark ? 'bg-[#1c1c1e] text-slate-100 border-white/10' : 'bg-white text-slate-900 border-slate-200/80'
        }`}
      >
        <CopilotHeader
          bookTitle={book.title} currentChapterTitle={currentChapterTitle} activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            if (tab === 'copilot') executeCopilotQuery(chat.copilotMode, effectiveAnchorText, chat.customQuestion, false)
          }}
          layoutMode={layoutMode} onChangeLayoutMode={handleChangeLayoutMode}
          onClose={onClose} isDark={isDark}
        />

        {activeTab === 'recap' ? (
          <CopilotRecapTab
            recapData={recapData}
            recapLoading={recapLoading}
            recapError={recapError}
            onRetry={() => loadRecap(book.id, currentChapterIndex, book.progress?.percentage || 0)}
            selectedChar={selectedChar}
            onSelectChar={setSelectedChar}
            isDark={isDark}
          />
        ) : (
          <CopilotChatTab
            effectiveAnchorText={effectiveAnchorText} hasSelectedText={Boolean(selectedText.trim())} copilotMode={chat.copilotMode}
            onSelectMode={(mode) => { chat.setCopilotMode(mode); executeCopilotQuery(mode) }}
            loading={chat.copilotLoading} response={chat.copilotResponse} savedNotice={chat.savedNotice}
            onSaveAsNote={() => chat.saveInsightNote(effectiveAnchorText, onSaveInsightAsNote)}
            onSelectFollowUp={(q) => {
              if (isSaveActionQuery(q)) { chat.saveInsightNote(effectiveAnchorText, onSaveInsightAsNote); return }
              chat.setCustomQuestion(q); chat.setCopilotMode('custom'); executeCopilotQuery('custom', effectiveAnchorText, q)
            }}
            onJumpToCitation={onJumpToCitation}
            questionInput={chat.customQuestion} onQuestionInputChange={chat.setCustomQuestion}
            onSubmitQuestion={(prompt) => {
              const q = (prompt || chat.customQuestion).trim()
              if (!q) return
              chat.setCustomQuestion('')
              chat.setCopilotMode('custom')
              executeCopilotQuery('custom', effectiveAnchorText, q)
            }}
            isDark={isDark}
          />
        )}
      </div>
    </div>
  )
}

export type { AICopilotModalProps } from './types'
