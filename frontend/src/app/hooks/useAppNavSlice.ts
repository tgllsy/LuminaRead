import { useReaderNavStore } from '../../stores/readerNavStore'

export function useAppNavSlice() {
  const isReaderOpen = useReaderNavStore((s) => s.isReaderOpen)
  const activeBookId = useReaderNavStore((s) => s.activeBookId)
  const chapterIndex = useReaderNavStore((s) => s.chapterIndex)
  const jumpTarget = useReaderNavStore((s) => s.jumpTarget)
  const openTabBookIds = useReaderNavStore((s) => s.openTabBookIds)
  const activePage = useReaderNavStore((s) => s.activePage)
  const openBook = useReaderNavStore((s) => s.openBook)
  const closeReader = useReaderNavStore((s) => s.closeReader)
  const switchBookTab = useReaderNavStore((s) => s.switchBookTab)
  const closeBookTab = useReaderNavStore((s) => s.closeBookTab)
  const setChapterIndex = useReaderNavStore((s) => s.setChapterIndex)
  const setActivePage = useReaderNavStore((s) => s.setActivePage)
  const syncFromBrowserUrl = useReaderNavStore((s) => s.syncFromBrowserUrl)

  return {
    isReaderOpen,
    activeBookId,
    chapterIndex,
    jumpTarget,
    openTabBookIds,
    activePage,
    openBook,
    closeReader,
    switchBookTab,
    closeBookTab,
    setChapterIndex,
    setActivePage,
    syncFromBrowserUrl,
  }
}
