import { useEffect, useRef } from 'react'

interface UseReaderHotkeysOptions {
  isHidden?: boolean
  hasModalOpen?: boolean
  effectiveLayoutMode: 'single' | 'dual'
  chapterIndex: number
  onPageTurnScreen: (direction: 'prev' | 'next') => void
  onSelectChapter: (nextIdx: number) => void
  onDismissOverlays: () => void
}

export function useReaderHotkeys(opts: UseReaderHotkeysOptions) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (opts.isHidden) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const cur = optsRef.current
      if (e.key === 'Escape') {
        cur.onDismissOverlays()
        return
      }

      if (cur.hasModalOpen) {
        return
      }

      if (
        e.key === 'ArrowRight' ||
        e.key === 'ArrowDown' ||
        e.key === 'PageDown' ||
        e.key === 'AudioVolumeDown' ||
        e.key === 'VolumeDown' ||
        e.code === 'AudioVolumeDown'
      ) {
        e.preventDefault()
        cur.onPageTurnScreen('next')
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowUp' ||
        e.key === 'PageUp' ||
        e.key === 'AudioVolumeUp' ||
        e.key === 'VolumeUp' ||
        e.code === 'AudioVolumeUp'
      ) {
        e.preventDefault()
        cur.onPageTurnScreen('prev')
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (e.shiftKey) cur.onPageTurnScreen('prev')
        else cur.onPageTurnScreen('next')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [opts.isHidden])
}
