import { useEffect, useRef } from 'react'

export interface MediaSessionProps {
  ttsPlaying: boolean
  ttsPaused: boolean
  ttsLoading?: boolean
  bookTitle: string
  bookAuthor?: string
  chapterTitle?: string
  coverUrl?: string
  activeParagraphIndex: number | null
  shortName?: string
  currentTimeSec: number
  durationSec: number
  ttsRate: number
  onTogglePlayPause: () => void
  onStop: () => void
  onPrev: () => void
  onNext: () => void
  onSeekBackward: (offset: number) => void
  onSeekForward: (offset: number) => void
}

export function useMediaSession(props: MediaSessionProps): void {
  const {
    ttsPlaying, ttsPaused, bookTitle, bookAuthor, chapterTitle, coverUrl,
    currentTimeSec, durationSec, ttsRate, onTogglePlayPause, onStop, onPrev,
    onNext, onSeekBackward, onSeekForward,
  } = props

  const handlersRef = useRef({
    onTogglePlayPause, onStop, onPrev, onNext, onSeekBackward, onSeekForward,
  })
  handlersRef.current = {
    onTogglePlayPause, onStop, onPrev, onNext, onSeekBackward, onSeekForward,
  }

  // 1. Stable action handlers registration (once on mount / unmount)
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

    try {
      navigator.mediaSession.setActionHandler('play', () => handlersRef.current.onTogglePlayPause())
      navigator.mediaSession.setActionHandler('pause', () => handlersRef.current.onTogglePlayPause())
      navigator.mediaSession.setActionHandler('stop', () => handlersRef.current.onStop())
      navigator.mediaSession.setActionHandler('previoustrack', () => handlersRef.current.onPrev())
      navigator.mediaSession.setActionHandler('nexttrack', () => handlersRef.current.onNext())
      navigator.mediaSession.setActionHandler('seekbackward', (e) => handlersRef.current.onSeekBackward(e.seekOffset || 15))
      navigator.mediaSession.setActionHandler('seekforward', (e) => handlersRef.current.onSeekForward(e.seekOffset || 15))
    } catch {
      // ignore
    }

    return () => {
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null)
          navigator.mediaSession.setActionHandler('pause', null)
          navigator.mediaSession.setActionHandler('stop', null)
          navigator.mediaSession.setActionHandler('previoustrack', null)
          navigator.mediaSession.setActionHandler('nexttrack', null)
          navigator.mediaSession.setActionHandler('seekbackward', null)
          navigator.mediaSession.setActionHandler('seekforward', null)
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // 2. Metadata sync
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return
    try {
      const artworks: MediaImage[] = coverUrl
        ? [
            { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [{ src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' }]

      navigator.mediaSession.metadata = new MediaMetadata({
        title: chapterTitle || bookTitle,
        artist: bookAuthor || '阅境 LuminaRead',
        album: bookTitle,
        artwork: artworks,
      })
    } catch {
      // ignore
    }
  }, [bookTitle, bookAuthor, chapterTitle, coverUrl])

  // 3. Playback state & position state sync
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return
    try {
      navigator.mediaSession.playbackState = ttsPlaying ? (ttsPaused ? 'paused' : 'playing') : 'none'

      if (durationSec > 0 && currentTimeSec >= 0 && 'setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0.1, durationSec),
          playbackRate: Math.max(0.5, ttsRate),
          position: Math.min(durationSec, Math.max(0, currentTimeSec)),
        })
      }
    } catch {
      // ignore
    }
  }, [ttsPlaying, ttsPaused, currentTimeSec, durationSec, ttsRate])
}
