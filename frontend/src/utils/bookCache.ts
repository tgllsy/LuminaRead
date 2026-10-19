import type { BookFullContent } from '../types'
import { apiClient } from '../shared/api'
import {
  isValidBookContent,
  loadOfflineFromIdb,
  saveOfflineToIdb,
  deleteOfflineFromIdb,
} from './bookIdbStore'

/**
 * High-speed Multi-Book LRU Memory Cache + IndexedDB Offline Store
 * Ensures zero-lag switching between multiple open books and instant chapter navigation.
 */
const MAX_MEMORY_BOOKS = 12
const memoryLruMap = new Map<string, BookFullContent>()
const hydratingBookIds = new Set<string>()

export function getBookFromMemoryCache(bookId: string): BookFullContent | null {
  const hit = memoryLruMap.get(bookId)
  if (!hit) return null
  // Refresh LRU order
  memoryLruMap.delete(bookId)
  memoryLruMap.set(bookId, hit)
  return hit
}

export function setBookInMemoryCache(
  bookId: string,
  content: BookFullContent,
  persistOffline = true
): void {
  if (memoryLruMap.has(bookId)) {
    memoryLruMap.delete(bookId)
  } else if (memoryLruMap.size >= MAX_MEMORY_BOOKS) {
    const oldestKey = memoryLruMap.keys().next().value
    if (oldestKey) memoryLruMap.delete(oldestKey)
  }
  memoryLruMap.set(bookId, content)

  if (!persistOffline || content.is_lite) return

  // Asynchronously persist full content to IndexedDB for PWA offline reading
  saveOfflineToIdb(bookId, content)
}

async function fetchLiteContent(bookId: string, targetChapterIndex?: number): Promise<BookFullContent> {
  const params: Record<string, string | number> = { lite: 1 }
  if (targetChapterIndex !== undefined) {
    params.chapter = targetChapterIndex
  }
  return await apiClient.get<BookFullContent>(`/api/books/${encodeURIComponent(bookId)}/content`, {
    params,
    timeoutMs: 10000,
  })
}

function scheduleIdlePrefetch(
  bookId: string,
  onFullHydrated?: (fullData: BookFullContent) => void
): void {
  if (hydratingBookIds.has(bookId)) return
  hydratingBookIds.add(bookId)

  const scheduleIdle = (cb: () => void) => {
    const w = window as unknown as {
      requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number
    }
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(cb, { timeout: 1500 })
    } else {
      window.setTimeout(cb, 600)
    }
  }

  scheduleIdle(async () => {
    try {
      const fullData = await apiClient.get<BookFullContent>(
        `/api/books/${encodeURIComponent(bookId)}/content`
      )
      if (!fullData) return
      const latestMem = memoryLruMap.get(bookId)
      const merged: BookFullContent = {
        ...fullData,
        is_lite: false,
        progress: latestMem?.progress || fullData.progress,
        highlights: latestMem?.highlights || fullData.highlights,
        bookmarks: latestMem?.bookmarks || fullData.bookmarks,
      }
      setBookInMemoryCache(bookId, merged, true)
      onFullHydrated?.(merged)
    } catch {
      // background prefetch failure can be safely ignored
    } finally {
      hydratingBookIds.delete(bookId)
    }
  })
}

const inFlightPrefetch = new Map<string, Promise<void>>()

export function prefetchChapter(bookId: string, chapterIndex: number): void {
  const mem = memoryLruMap.get(bookId)
  if (!mem) return
  const ch = mem.chapters?.[chapterIndex]
  if (ch && !ch._partial && ch.content) return

  apiClient
    .get<{ chapter?: import('../types').BookChapter }>(
      `/api/books/${encodeURIComponent(bookId)}/chapters/${chapterIndex}?bilingual=0`
    )
    .then((res) => {
      if (res?.chapter) {
        const latestMem = memoryLruMap.get(bookId)
        if (latestMem && latestMem.chapters?.[chapterIndex]) {
          latestMem.chapters[chapterIndex] = {
            ...latestMem.chapters[chapterIndex],
            content: res.chapter.content || '',
            _partial: false,
          }
        }
      }
    })
    .catch(() => {})
}

export function prefetchUpcomingChapters(bookId: string, startChapterIndex: number, count = 3): void {
  const mem = memoryLruMap.get(bookId)
  if (!mem || !mem.chapters) return
  const maxIdx = mem.chapters.length - 1
  for (let i = 0; i < count; i++) {
    const chIdx = startChapterIndex + i
    if (chIdx > maxIdx) break
    prefetchChapter(bookId, chIdx)
  }
}

export function prefetchBook(bookId: string, targetChapterIndex?: number): Promise<void> {
  const mem = memoryLruMap.get(bookId)
  if (mem && isValidBookContent(mem, bookId)) {
    const chIdx = targetChapterIndex ?? mem.progress?.chapter_index ?? 0
    const targetCh = mem.chapters?.[chIdx]
    if (targetCh && !targetCh._partial && targetCh.content) {
      return Promise.resolve()
    }
  }

  const existing = inFlightPrefetch.get(bookId)
  if (existing) return existing

  const p = getBookWithCache(bookId, false, targetChapterIndex)
    .then(() => {})
    .catch(() => {})
    .finally(() => {
      inFlightPrefetch.delete(bookId)
    })

  inFlightPrefetch.set(bookId, p)
  return p
}

export function prewarmBooks(books: Array<{ id: string; progress?: { chapter_index?: number } }>): void {
  const topBooks = books.slice(0, 3)
  for (const b of topBooks) {
    prefetchBook(b.id, b.progress?.chapter_index).catch(() => {})
  }
}

export async function getBookWithCache(
  bookId: string,
  forceRefresh = false,
  targetChapterIndex?: number,
  onFullHydrated?: (fullData: BookFullContent) => void
): Promise<{ data: BookFullContent; fromCache: boolean }> {
  if (!forceRefresh) {
    const memHit = getBookFromMemoryCache(bookId)
    if (memHit && isValidBookContent(memHit, bookId)) {
      const checkIdx = targetChapterIndex ?? memHit.progress?.chapter_index ?? 0
      const targetCh = memHit.chapters[checkIdx]
      if (!targetCh || !targetCh._partial) {
        return { data: memHit, fromCache: true }
      }
    }

    // Fast-path: Check IndexedDB offline cache with strict timeout
    const offlineHit = await loadOfflineFromIdb(bookId)
    if (offlineHit && isValidBookContent(offlineHit, bookId)) {
      memoryLruMap.set(bookId, offlineHit)
      // Background revalidate without clobbering existing complete chapters
      fetchLiteContent(bookId, targetChapterIndex)
        .then((fresh) => {
          if (!isValidBookContent(fresh, bookId)) return
          const mergedChapters = offlineHit.chapters.map((ch, idx) => {
            const freshCh = fresh.chapters?.[idx]
            if (!freshCh) return ch
            if (freshCh.content && freshCh.content.length > 0) return freshCh
            return ch
          })
          const merged: BookFullContent = {
            ...offlineHit,
            ...fresh,
            chapters: mergedChapters,
            is_lite: offlineHit.is_lite && fresh.is_lite,
          }
          setBookInMemoryCache(bookId, merged, !merged.is_lite)
          onFullHydrated?.(merged)
        })
        .catch(() => {})
      return { data: offlineHit, fromCache: true }
    }
  }

  try {
    const data = await fetchLiteContent(bookId, targetChapterIndex)
    if (!isValidBookContent(data, bookId)) {
      throw new Error('书籍内容数据格式不正确')
    }
    setBookInMemoryCache(bookId, data, !data.is_lite)

    if (data.is_lite) {
      scheduleIdlePrefetch(bookId, onFullHydrated)
    }

    return { data, fromCache: false }
  } catch (err) {
    const offlineHit = await loadOfflineFromIdb(bookId)
    if (offlineHit && isValidBookContent(offlineHit, bookId)) {
      memoryLruMap.set(bookId, offlineHit)
      return { data: offlineHit, fromCache: true }
    }
    throw err
  }
}

export function invalidateBookCache(bookId: string): void {
  memoryLruMap.delete(bookId)
  deleteOfflineFromIdb(bookId)
}
