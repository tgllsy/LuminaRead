import { useState, useEffect, useRef, useCallback } from 'react'
import type { PlayParagraphRequest, TtsAudioStatus } from '../types'
import { isSameTtsAudioStatus } from '../../audio-tts'

interface UseReaderTtsStateOptions {
  activeBookId?: string
  openTtsModalNonce?: number
  onOpenAmbientTtsModal: () => void
}

export function useReaderTtsState({
  activeBookId,
  openTtsModalNonce = 0,
  onOpenAmbientTtsModal,
}: UseReaderTtsStateOptions) {
  const [ttsActivePara, setTtsActivePara] = useState<number | null>(null)
  const [focusedPara, setFocusedPara] = useState<{ chapterIndex: number; paragraphIndex: number } | null>(null)
  const [playParagraphRequest, setPlayParagraphRequest] = useState<PlayParagraphRequest | null>(null)
  const [ttsAudioStatus, setTtsAudioStatusState] = useState<TtsAudioStatus>({
    active: false,
    playing: false,
    paused: false,
    loading: false,
    ambientActive: false,
  })

  const prevBookIdRef = useRef(activeBookId)
  useEffect(() => {
    if (prevBookIdRef.current !== activeBookId) {
      prevBookIdRef.current = activeBookId
      setTtsActivePara(null)
      setFocusedPara(null)
      setPlayParagraphRequest(null)
      setTtsAudioStatusState({
        active: false,
        playing: false,
        paused: false,
        loading: false,
        ambientActive: false,
      })
    }
  }, [activeBookId])

  const setTtsAudioStatus = useCallback((next: TtsAudioStatus) => {
    setTtsAudioStatusState((prev) => (isSameTtsAudioStatus(prev, next) ? prev : next))
  }, [])

  const lastOpenTtsModalNonceRef = useRef(0)
  const onOpenAmbientTtsModalRef = useRef(onOpenAmbientTtsModal)
  onOpenAmbientTtsModalRef.current = onOpenAmbientTtsModal

  useEffect(() => {
    if (openTtsModalNonce > lastOpenTtsModalNonceRef.current) {
      lastOpenTtsModalNonceRef.current = openTtsModalNonce
      onOpenAmbientTtsModalRef.current()
    }
  }, [openTtsModalNonce])

  const handleStartTtsAtParagraph = useCallback((targetChIdx: number, targetParaIdx: number) => {
    setFocusedPara({ chapterIndex: targetChIdx, paragraphIndex: targetParaIdx })
    setTtsActivePara(targetParaIdx)
    setPlayParagraphRequest((prev) => ({
      nonce: (prev?.nonce || 0) + 1,
      chapterIndex: targetChIdx,
      paragraphIndex: targetParaIdx,
    }))
  }, [])

  return {
    ttsActivePara,
    setTtsActivePara,
    focusedPara,
    setFocusedPara,
    playParagraphRequest,
    ttsAudioStatus,
    setTtsAudioStatus,
    handleStartTtsAtParagraph,
  }
}
