import { useEffect, useRef } from 'react'
import type { UseTtsLifecycleProps } from '../types'
import { loadBookTtsCheckpoint, loadGlobalTtsCheckpoint } from '../helpers'
import { useTtsStore } from '../../../stores/ttsStore'

function useTtsStatusSync({
  ttsPlaying,
  ttsPaused,
  ttsLoading,
  ambientPreset,
  bookId,
  bookTitle,
  chapterIndex,
  chapterTitle,
  activeParagraphIndex,
  totalParagraphs,
  activeSentenceSnippet,
  onAudioStatusChange,
}: Pick<
  UseTtsLifecycleProps,
  | 'ttsPlaying'
  | 'ttsPaused'
  | 'ttsLoading'
  | 'ambientPreset'
  | 'bookId'
  | 'bookTitle'
  | 'chapterIndex'
  | 'chapterTitle'
  | 'activeParagraphIndex'
  | 'totalParagraphs'
  | 'activeSentenceSnippet'
  | 'onAudioStatusChange'
>) {
  const prevStatusKeyRef = useRef('')
  const onAudioStatusChangeRef = useRef(onAudioStatusChange)
  onAudioStatusChangeRef.current = onAudioStatusChange

  useEffect(() => {
    const isAmbientActive = ambientPreset !== 'off'
    const isActive = ttsPlaying || ttsPaused || ttsLoading || isAmbientActive
    const key = `${isActive}|${ttsPlaying}|${ttsPaused}|${ttsLoading}|${isAmbientActive}|${bookId}|${bookTitle}|${chapterIndex}|${chapterTitle}|${activeParagraphIndex}|${totalParagraphs}|${activeSentenceSnippet}`
    if (prevStatusKeyRef.current !== key) {
      prevStatusKeyRef.current = key
      onAudioStatusChangeRef.current?.({
        active: isActive,
        playing: ttsPlaying,
        paused: ttsPaused,
        loading: ttsLoading,
        ambientActive: isAmbientActive,
        bookId,
        bookTitle,
        chapterIndex,
        chapterTitle,
        paragraphIndex: activeParagraphIndex,
        totalParagraphs,
        snippet: activeSentenceSnippet,
      })
    }
  }, [
    ttsPlaying,
    ttsPaused,
    ttsLoading,
    ambientPreset,
    bookId,
    bookTitle,
    chapterIndex,
    chapterTitle,
    activeParagraphIndex,
    totalParagraphs,
    activeSentenceSnippet,
  ])
  useEffect(() => {
    return () => {
      onAudioStatusChangeRef.current?.({
        active: false,
        playing: false,
        paused: false,
        loading: false,
        ambientActive: false,
        bookId,
        bookTitle,
      })
    }
  }, [bookId, bookTitle])
}

function useTtsResumeListener({
  resumeRequestNonce,
  paragraphsLength,
  bookId,
  chapterIndex,
  activeParagraphIndex,
  onResumeCheckpoint,
  onPlayParagraph,
}: Pick<
  UseTtsLifecycleProps,
  | 'resumeRequestNonce'
  | 'paragraphsLength'
  | 'bookId'
  | 'chapterIndex'
  | 'activeParagraphIndex'
  | 'onResumeCheckpoint'
  | 'onPlayParagraph'
>) {
  const initialStore = useTtsStore.getState()
  const isFreshForThisBook =
    initialStore.resumeTargetBookId === bookId &&
    initialStore.resumeRequestTimestamp > 0 &&
    Date.now() - initialStore.resumeRequestTimestamp < 60000

  const lastResumeNonceRef = useRef(isFreshForThisBook ? resumeRequestNonce - 1 : resumeRequestNonce)
  const onResumeCheckpointRef = useRef(onResumeCheckpoint)
  onResumeCheckpointRef.current = onResumeCheckpoint
  const onPlayParagraphRef = useRef(onPlayParagraph)
  onPlayParagraphRef.current = onPlayParagraph

  useEffect(() => {
    if (resumeRequestNonce > lastResumeNonceRef.current) {
      if (paragraphsLength <= 0) return
      lastResumeNonceRef.current = resumeRequestNonce
      const storeState = useTtsStore.getState()
      const targetId = storeState.resumeTargetBookId
      const reqTime = storeState.resumeRequestTimestamp
      const isTargetMatch = targetId ? targetId === bookId : false
      const isFresh = reqTime > 0 && Date.now() - reqTime < 60000

      if (!isTargetMatch || !isFresh) return

      useTtsStore.getState().clearResumeRequest()
      const cp = loadBookTtsCheckpoint(bookId) || loadGlobalTtsCheckpoint()
      if (cp && (!cp.bookId || cp.bookId === bookId) && cp.chapterIndex === chapterIndex) {
        onResumeCheckpointRef.current(cp)
      } else if (paragraphsLength > 0 && targetId === bookId) {
        onPlayParagraphRef.current(activeParagraphIndex ?? 0, chapterIndex)
      }
    }
  }, [resumeRequestNonce, bookId, paragraphsLength, activeParagraphIndex, chapterIndex])
}

function useTtsControlsListener({
  togglePlayPauseNonce,
  playParagraphRequest,
  bookId,
  onTogglePlayPause,
  onPlayParagraph,
  onStop,
}: Pick<
  UseTtsLifecycleProps,
  | 'togglePlayPauseNonce'
  | 'playParagraphRequest'
  | 'bookId'
  | 'onTogglePlayPause'
  | 'onPlayParagraph'
  | 'onStop'
>) {
  const lastToggleNonceRef = useRef(togglePlayPauseNonce)
  const lastPlayParaNonceRef = useRef(playParagraphRequest?.nonce ?? 0)
  const prevBookIdRef = useRef(bookId)

  const onPlayParagraphRef = useRef(onPlayParagraph)
  onPlayParagraphRef.current = onPlayParagraph
  const onTogglePlayPauseRef = useRef(onTogglePlayPause)
  onTogglePlayPauseRef.current = onTogglePlayPause
  const onStopRef = useRef(onStop)
  onStopRef.current = onStop

  useEffect(() => {
    return () => {
      onStopRef.current()
    }
  }, [])

  useEffect(() => {
    if (prevBookIdRef.current !== bookId) {
      prevBookIdRef.current = bookId
      lastToggleNonceRef.current = togglePlayPauseNonce
      lastPlayParaNonceRef.current = playParagraphRequest?.nonce ?? 0
      onStopRef.current()
    }
  }, [bookId, togglePlayPauseNonce, playParagraphRequest])

  useEffect(() => {
    if (playParagraphRequest && playParagraphRequest.nonce > lastPlayParaNonceRef.current) {
      lastPlayParaNonceRef.current = playParagraphRequest.nonce
      onPlayParagraphRef.current(playParagraphRequest.paragraphIndex, playParagraphRequest.chapterIndex)
    }
  }, [playParagraphRequest])

  useEffect(() => {
    if (togglePlayPauseNonce > lastToggleNonceRef.current) {
      lastToggleNonceRef.current = togglePlayPauseNonce
      onTogglePlayPauseRef.current()
    }
  }, [togglePlayPauseNonce])
}

export function useTtsLifecycle(props: UseTtsLifecycleProps) {
  useTtsStatusSync(props)
  useTtsResumeListener(props)
  useTtsControlsListener(props)
}
