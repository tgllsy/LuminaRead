import { useState, useEffect, useCallback } from 'react'
import type { AppNavPage } from '../types'
import { loadGlobalTtsCheckpoint } from '../../features/audio-tts'
import { getBookWithCache } from '../../utils/bookCache'
import { useBooksStore } from '../../shared/stores/useBooksStore'
import { useAppNavSlice } from './useAppNavSlice'
import { useAppTtsSlice } from './useAppTtsSlice'
import { resolveListeningTarget } from '../helpers/listeningHelper'

export function useAppActions() {
  const books = useBooksStore((s) => s.books)
  const fetchBooks = useBooksStore((s) => s.fetchBooks)
  const nav = useAppNavSlice()
  const tts = useAppTtsSlice()
  const [globalSearchInitQuery, setGlobalSearchInitQuery] = useState('')

  useEffect(() => {
    fetchBooks()
    const onPopState = () => nav.syncFromBrowserUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [fetchBooks, nav.syncFromBrowserUrl])

  useEffect(() => {
    if (tts.audioStatus.playing) tts.setListeningCapsuleDismissed(false)
  }, [tts.audioStatus.playing, tts.setListeningCapsuleDismissed])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (nav.isReaderOpen) nav.closeReader(true)
        nav.setActivePage('search')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nav.isReaderOpen, nav.closeReader, nav.setActivePage])

  const handleBookDownloaded = useCallback((bookId: string, openImmediately?: boolean) => {
    fetchBooks(true)
    getBookWithCache(bookId, true).catch(() => {})
    if (openImmediately) nav.openBook({ bookId, chapterIndex: 0 })
  }, [fetchBooks, nav.openBook])

  const handleResumeGlobalListening = useCallback((openReaderModal: boolean) => {
    const activeTtsBookId = tts.audioStatus.bookId || nav.activeBookId
    if (tts.audioStatus.active && activeTtsBookId) {
      if (openReaderModal) {
        nav.openBook({
          bookId: activeTtsBookId,
          chapterIndex: tts.audioStatus.chapterIndex ?? nav.chapterIndex,
          paragraphIndex: tts.audioStatus.paragraphIndex ?? undefined,
        })
        tts.triggerOpenTtsModal()
      } else {
        tts.triggerTogglePlayPause()
      }
      return
    }
    const target = resolveListeningTarget(books, nav.activeBookId, tts.checkpoint || loadGlobalTtsCheckpoint())
    if (!target) {
      if (openReaderModal) nav.setActivePage('tts')
      return
    }
    nav.openBook(target)
    tts.setListeningCapsuleDismissed(false)
    if (openReaderModal) tts.triggerOpenTtsModal()
    tts.triggerResumeTts(target.bookId)
  }, [tts, nav, books])

  const handleSelectNavPage = useCallback((page: AppNavPage) => {
    if (page === 'tts') {
      handleResumeGlobalListening(true)
      return
    }
    nav.setActivePage(page)
  }, [handleResumeGlobalListening, nav.setActivePage])

  const handleOpenGlobalSearch = useCallback((q = '') => {
    setGlobalSearchInitQuery(q)
    nav.setActivePage('search')
  }, [nav.setActivePage])

  return {
    books,
    fetchBooks,
    nav,
    tts,
    globalSearchInitQuery,
    handleBookDownloaded,
    handleResumeGlobalListening,
    handleSelectNavPage,
    handleOpenGlobalSearch,
  }
}
