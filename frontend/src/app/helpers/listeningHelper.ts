import type { JumpTarget } from '../../types'
import type { loadGlobalTtsCheckpoint } from '../../features/audio-tts'
import type { useBooksStore } from '../../shared/stores/useBooksStore'

export function resolveListeningTarget(
  books: ReturnType<typeof useBooksStore.getState>['books'],
  activeBookId: string | null,
  checkpoint: ReturnType<typeof loadGlobalTtsCheckpoint>
): JumpTarget | null {
  const readCandidates = books
    .filter((b) => b.status !== 'importing' && b.status !== 'error' && Boolean(b.last_read_at || (b.progress?.percentage ?? 0) > 0))
    .sort((a, b) => (b.last_read_at || b.progress?.updated_at || '').localeCompare(a.last_read_at || a.progress?.updated_at || ''))
  const recentBook = readCandidates.find((b) => b.status !== 'finished') || readCandidates[0] || books[0]
  const targetBookId = activeBookId || recentBook?.id || checkpoint?.bookId
  if (!targetBookId) return null
  const targetBook = books.find((b) => b.id === targetBookId)
  const bookProgressCh = targetBook?.progress?.chapter_index
  const bookProgressPara = typeof targetBook?.progress?.scroll_offset === 'number'
    ? Math.floor(targetBook.progress.scroll_offset)
    : undefined
  const useCp = checkpoint?.bookId === targetBookId && bookProgressCh === undefined
  return {
    bookId: targetBookId,
    chapterIndex: useCp ? checkpoint.chapterIndex : (bookProgressCh ?? checkpoint?.chapterIndex ?? 0),
    paragraphIndex: useCp ? checkpoint.paragraphIndex : (bookProgressPara ?? checkpoint?.paragraphIndex),
  }
}
