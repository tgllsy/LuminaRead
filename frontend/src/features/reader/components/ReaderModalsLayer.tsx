import React, { useCallback, useEffect } from 'react'
import type {
  BookSummary, BookChapter, ReaderTypography, SelectionState,
  FootnoteModalState, CopilotModalState, PosterModalState, LightboxImageState,
  PlayParagraphRequest, TtsAudioStatus, TtsCheckpoint, HighlightItem, EntityWikiModalState,
} from '../types'
import { TypographyPanel, type WeReadBottomTab } from '../../reader-controls'
import { AmbientAndTTSBar } from '../../audio-tts'
import { SelectionPopover } from '../../reader-controls'
import { EntityWikiPopover } from './EntityWikiPopover'
import { useEntityWikiState } from '../hooks/useEntityWikiState'

const AICopilotModal = React.lazy(() => import('../../copilot').then((m) => ({ default: m.AICopilotModal })))
const FootnotePreviewModal = React.lazy(() => import('./FootnotePreviewModal').then((m) => ({ default: m.FootnotePreviewModal })))
const ImageLightboxModal = React.lazy(() => import('./ImageLightboxModal').then((m) => ({ default: m.ImageLightboxModal })))
const QuotePosterModal = React.lazy(() => import('./QuotePosterModal').then((m) => ({ default: m.QuotePosterModal })))

interface ReaderModalsLayerProps {
  isHidden: boolean
  typography: ReaderTypography
  setTypography: React.Dispatch<React.SetStateAction<ReaderTypography>>
  showTypography: boolean
  setShowTypography: (v: boolean) => void
  activeBottomTab: WeReadBottomTab
  setActiveBottomTab: (tab: WeReadBottomTab) => void
  immersiveHudVisible: boolean
  setImmersiveHudVisible: (v: boolean) => void
  book: BookSummary
  chapters: BookChapter[]
  currentChapter: BookChapter
  chapterIndex: number
  progressPercent: number
  paragraphs: string[]
  showAmbientTTS: boolean
  setShowAmbientTTS: (v: boolean) => void
  ttsAudioStatus: TtsAudioStatus
  setTtsAudioStatus: (status: TtsAudioStatus) => void
  ttsActivePara: number | null
  setTtsActivePara: (idx: number | null) => void
  resumeTtsNonce?: number
  toggleTtsPlayPauseNonce?: number
  playParagraphRequest: PlayParagraphRequest | null
  onGlobalTtsStatusChange?: (status: TtsAudioStatus) => void
  onGlobalCheckpointSaved?: (cp: TtsCheckpoint) => void
  getCurrentVisibleParagraphIndex: () => number
  selectionState: SelectionState | null
  setSelectionState: (state: SelectionState | null) => void
  copilotModal: CopilotModalState
  setCopilotModal: React.Dispatch<React.SetStateAction<CopilotModalState>>
  posterModal: PosterModalState | null
  setPosterModal: (state: PosterModalState | null) => void
  footnoteModal: FootnoteModalState | null
  setFootnoteModal: (state: FootnoteModalState | null) => void
  entityWikiModal?: EntityWikiModalState | null
  setEntityWikiModal?: (state: EntityWikiModalState | null) => void
  lightboxImage: LightboxImageState | null
  setLightboxImage: React.Dispatch<React.SetStateAction<LightboxImageState | null>>
  totalPdfPages: number
  onSelectChapter: (nextIdx: number, targetParaIdx?: number) => void
  onOpenDrawerTab: (tab: 'toc' | 'notes') => void
  onOpenSearchDrawer: (kw: string) => void
  onCreateOrUpdateHighlight: (payload: { color: HighlightItem['color']; style_type: HighlightItem['style_type']; note: string }) => void
  onDeleteHighlight: (hlId: string) => void
  onSaveInsightAsNote: (text: string, noteContent: string) => Promise<void>
  onJumpToFootnoteTarget: (chIdx: number, pIdx: number) => void
  onJumpToBibliography: (bibChIdx: number) => void
  onShowToast: (msg: string) => void
  onStartTtsAtParagraph: (chIdx: number, pIdx: number) => void
}

const EntityWikiModalContainer: React.FC<{
  entityWikiModal?: EntityWikiModalState | null
  onClose: () => void
  bookId: string
  isDark: boolean
  onDeepCopilot: (term: string) => void
}> = ({ entityWikiModal, onClose, bookId, isDark, onDeepCopilot }) => {
  const { quickDef, aiExplanation, loading, openEntity, closeEntity } = useEntityWikiState(bookId)

  useEffect(() => {
    if (entityWikiModal?.isOpen) {
      openEntity(entityWikiModal.entityName, entityWikiModal.anchorRect)
    } else {
      closeEntity()
    }
  }, [entityWikiModal, openEntity, closeEntity])

  if (!entityWikiModal?.isOpen) return null

  return (
    <EntityWikiPopover
      term={entityWikiModal.entityName}
      quickDef={quickDef}
      aiExplanation={aiExplanation}
      loading={loading}
      anchorRect={entityWikiModal.anchorRect}
      isDark={isDark}
      onClose={onClose}
      onDeepCopilot={onDeepCopilot}
    />
  )
}

const ReaderAuxiliaryDialogs: React.FC<
  Pick<
    ReaderModalsLayerProps,
    | 'book' | 'currentChapter' | 'chapterIndex' | 'paragraphs' | 'typography'
    | 'selectionState' | 'setSelectionState' | 'copilotModal' | 'setCopilotModal'
    | 'posterModal' | 'setPosterModal' | 'footnoteModal' | 'setFootnoteModal'
    | 'entityWikiModal' | 'setEntityWikiModal'
    | 'lightboxImage' | 'setLightboxImage' | 'totalPdfPages' | 'onOpenSearchDrawer'
    | 'onCreateOrUpdateHighlight' | 'onDeleteHighlight' | 'onSaveInsightAsNote'
    | 'onJumpToFootnoteTarget' | 'onJumpToBibliography' | 'onShowToast' | 'onStartTtsAtParagraph'
    | 'onSelectChapter'
  >
> = ({
  book, currentChapter, chapterIndex, paragraphs, typography,
  selectionState, setSelectionState, copilotModal, setCopilotModal,
  posterModal, setPosterModal, footnoteModal, setFootnoteModal,
  entityWikiModal, setEntityWikiModal,
  lightboxImage, setLightboxImage, totalPdfPages, onOpenSearchDrawer,
  onCreateOrUpdateHighlight, onDeleteHighlight, onSaveInsightAsNote,
  onJumpToFootnoteTarget, onJumpToBibliography, onShowToast, onStartTtsAtParagraph,
  onSelectChapter,
}) => (
  <>
    {selectionState && (
      <SelectionPopover
        selectedText={selectionState.text} paragraphIndex={selectionState.paragraphIndex}
        existingHighlight={selectionState.existing} openNoteEditorInitially={selectionState.openNoteEditorInitially}
        theme={typography.theme}
        onClose={() => {
          if (typeof window !== 'undefined') {
            window.getSelection()?.removeAllRanges()
          }
          setSelectionState(null)
        }}
        onCreateOrUpdateHighlight={onCreateOrUpdateHighlight} onDeleteHighlight={onDeleteHighlight}
        onAskAICopilot={(text, mode) => setCopilotModal({ isOpen: true, mode, text, paragraphIndex: selectionState.paragraphIndex })}
        onSearchInBook={(kw) => { onOpenSearchDrawer(kw); setSelectionState(null) }}
        onGeneratePoster={(text, note) => { setPosterModal({ text, note }); setSelectionState(null) }}
        onStartTTSFromParagraph={(p) => { onStartTtsAtParagraph(selectionState.chapterIndex ?? chapterIndex, p); setSelectionState(null) }}
      />
    )}
    <React.Suspense fallback={null}>
      {copilotModal.isOpen && (
        <AICopilotModal
          isOpen={copilotModal.isOpen} onClose={() => setCopilotModal((p) => ({ ...p, isOpen: false }))}
          book={book} currentChapterIndex={chapterIndex} currentChapterTitle={currentChapter.title}
          initialMode={copilotModal.mode} selectedText={copilotModal.text} paragraphIndex={copilotModal.paragraphIndex ?? 0}
          chapterExcerpt={paragraphs.slice(0, 4).join('\n').slice(0, 320)} theme={typography.theme}
          onSaveInsightAsNote={onSaveInsightAsNote}
          onJumpToCitation={(chIdx, pIdx) => {
            onSelectChapter(chIdx, pIdx)
            setCopilotModal((p) => ({ ...p, isOpen: false }))
          }}
        />
      )}
      {footnoteModal && (
        <FootnotePreviewModal
          footnoteModal={footnoteModal} typography={typography} currentChapterTitle={currentChapter.title}
          currentChapterIndex={chapterIndex} onClose={() => setFootnoteModal(null)}
          onJumpToTarget={onJumpToFootnoteTarget} onJumpToBibliography={onJumpToBibliography}
        />
      )}
      <EntityWikiModalContainer
        entityWikiModal={entityWikiModal}
        onClose={() => setEntityWikiModal?.(null)}
        bookId={book.id}
        isDark={typography.theme === 'dark'}
        onDeepCopilot={(term) => {
          setCopilotModal({ isOpen: true, mode: 'explain', text: term })
        }}
      />
      {lightboxImage && (
        <ImageLightboxModal
          lightboxImage={lightboxImage} totalPdfPages={totalPdfPages} bookId={book.id} bookTitle={book.title}
          onClose={() => setLightboxImage(null)}
          onSelectPage={(p) => setLightboxImage((prev) => prev ? { ...prev, pageNum: p, url: `/api/books/${encodeURIComponent(book.id)}/pdf-page/${p}` } : null)}
        />
      )}
      {posterModal && (
        <QuotePosterModal
          posterModal={posterModal} book={book} currentChapterTitle={currentChapter.title}
          onClose={() => setPosterModal(null)} onShowToast={onShowToast}
        />
      )}
    </React.Suspense>
  </>
)

export const ReaderModalsLayer: React.FC<ReaderModalsLayerProps> = (props) => {
  const {
    isHidden, typography, setTypography, showTypography, setShowTypography,
    activeBottomTab, setActiveBottomTab, immersiveHudVisible, setImmersiveHudVisible,
    book, chapters, currentChapter, chapterIndex, progressPercent, paragraphs,
    showAmbientTTS, setShowAmbientTTS, ttsAudioStatus, setTtsAudioStatus,
    ttsActivePara, setTtsActivePara, resumeTtsNonce, toggleTtsPlayPauseNonce,
    playParagraphRequest, onGlobalTtsStatusChange, onGlobalCheckpointSaved,
    getCurrentVisibleParagraphIndex, setCopilotModal, onSelectChapter, onOpenDrawerTab,
  } = props

  const handleAudioStatusChange = useCallback(
    (status: TtsAudioStatus) => {
      setTtsAudioStatus(status)
      onGlobalTtsStatusChange?.(status)
    },
    [setTtsAudioStatus, onGlobalTtsStatusChange],
  )

  return (
    <>
      <TypographyPanel
        isOpen={immersiveHudVisible || showTypography}
        onClose={() => { setShowTypography(false); setImmersiveHudVisible(false) }}
        settings={typography}
        onChange={(patch) => setTypography((prev) => ({ ...prev, ...patch }))}
        activeTab={activeBottomTab} onTabChange={setActiveBottomTab}
        chapterIndex={chapterIndex} totalChapters={chapters.length}
        chapterTitle={currentChapter.title} progressPercent={progressPercent}
        onSelectChapter={onSelectChapter}
        getChapterTitle={(idx) => chapters[idx]?.title || `第 ${idx + 1} 章`}
        bookId={book.id}
        onOpenToc={() => { onOpenDrawerTab('toc'); setImmersiveHudVisible(false); setShowTypography(false) }}
        onOpenNotesOrIdeas={() => { onOpenDrawerTab('notes'); setImmersiveHudVisible(false); setShowTypography(false) }}
        onOpenAI={() => { setCopilotModal({ isOpen: true, mode: 'spoiler_free_recap', text: '' }); setImmersiveHudVisible(false); setShowTypography(false) }}
        onOpenTTS={() => { setShowAmbientTTS(true); setImmersiveHudVisible(false); setShowTypography(false) }}
        isTtsActive={ttsAudioStatus.active || ttsActivePara !== null}
      />
      <AmbientAndTTSBar
        theme={typography.theme} bookId={book.id} bookTitle={book.title} bookAuthor={book.author}
        chapterTitle={currentChapter.title} coverUrl={book.cover_url} coverColor={book.cover_color}
        totalChapters={chapters.length} isOpen={!isHidden && showAmbientTTS}
        onOpen={() => setShowAmbientTTS(true)} onClose={() => setShowAmbientTTS(false)}
        onAudioStatusChange={handleAudioStatusChange} onCheckpointSaved={onGlobalCheckpointSaved}
        onSelectChapter={(chIdx, paraIdx) => onSelectChapter(chIdx, paraIdx)} resumeRequestNonce={resumeTtsNonce}
        togglePlayPauseNonce={toggleTtsPlayPauseNonce} playParagraphRequest={playParagraphRequest}
        onOpenToc={() => { setShowAmbientTTS(false); onOpenDrawerTab('toc') }}
        paragraphs={paragraphs} chapterIndex={chapterIndex} hasNextChapter={chapterIndex < chapters.length - 1}
        activeParagraphIndex={ttsActivePara} onActiveParagraphChange={setTtsActivePara}
        onNextChapter={() => onSelectChapter(chapterIndex + 1)} getVisibleParagraphIndex={getCurrentVisibleParagraphIndex}
      />
      <ReaderAuxiliaryDialogs {...props} />
    </>
  )
}
