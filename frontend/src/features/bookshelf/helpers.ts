import type { BookSummary, ReadingLibrary, BookshelfFilterState } from './types'
import { ELEGANT_BOOK_COVERS, type ElegantCoverTheme } from './constants'
import { toSimplified, toTraditional } from '../../utils/chineseConversion'

export function getBookCoverStyle(book: { id?: string; title?: string; cover_color?: string }): ElegantCoverTheme {
  if (book.cover_color && book.cover_color !== '#1e3a8a') {
    return { bg: book.cover_color, accent: '#93c5fd', spine: 'rgba(255,255,255,0.1)' }
  }
  let hash = 0
  const key = book.id || book.title || 'book'
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % ELEGANT_BOOK_COVERS.length
  return ELEGANT_BOOK_COVERS[index]
}


function matchesQueryVariants(text: string, queries: string[]): boolean {
  const lower = text.toLowerCase()
  return queries.some((q) => lower.includes(q))
}

export function filterAndSearchBooks(
  books: BookSummary[],
  filters: BookshelfFilterState
): BookSummary[] {
  const { libraryFilter, categoryFilter, statusFilter, localFilterText } = filters
  const query = localFilterText.trim().toLowerCase()
  const queries = query
    ? Array.from(new Set([query, toSimplified(query), toTraditional(query)]))
    : []

  const filtered = books.filter((b) => {
    if (libraryFilter !== 'all') {
      const bLib = b.library_id || 'lib-default'
      if (bLib !== libraryFilter) return false
    }

    if (categoryFilter !== 'all' && b.category !== categoryFilter) {
      return false
    }

    if (statusFilter === 'reading' && b.status !== 'reading') return false
    if (
      statusFilter === 'unread' &&
      b.status !== 'unread' &&
      b.status !== 'importing' &&
      b.status !== 'error'
    ) {
      return false
    }
    if (statusFilter === 'finished' && b.status !== 'finished') return false

    if (queries.length > 0) {
      const matchTitle = matchesQueryVariants(b.title, queries)
      const matchAuthor = matchesQueryVariants(b.author, queries)
      const matchCategory = matchesQueryVariants(b.category || '', queries)
      const matchTags = (b.tags || []).some((t) => matchesQueryVariants(t, queries))
      return matchTitle || matchAuthor || matchCategory || matchTags
    }

    return true
  })

  return filtered.sort((a, b) => {
    const timeA = a.last_read_at || a.progress?.updated_at || a.created_at || ''
    const timeB = b.last_read_at || b.progress?.updated_at || b.created_at || ''
    return timeB.localeCompare(timeA)
  })
}

export function extractUniqueCategories(books: BookSummary[]): string[] {
  return Array.from(
    new Set(
      books
        .map((b) => (b.category || '').trim())
        .filter((c) => c && c !== '未分类')
    )
  )
}

export function parseTagsInput(rawTags: string): string[] {
  return rawTags
    .split(/[,，、\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export function formatReadingTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '未开始'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ''}`
  }
  return `${Math.max(1, minutes)}分钟`
}

export function getLibraryForBook(
  book: BookSummary,
  libraries: ReadingLibrary[]
): ReadingLibrary | undefined {
  const libId = book.library_id || 'lib-default'
  return libraries.find((l) => l.id === libId)
}
