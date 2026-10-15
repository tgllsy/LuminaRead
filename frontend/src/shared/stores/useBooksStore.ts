import { create } from 'zustand'
import type { BookSummary } from '../../types'
import { apiClient } from '../api'
import { AppError } from '../api/errors'

interface BooksApiResponse {
  books: BookSummary[]
}

interface BooksState {
  books: BookSummary[]
  isLoading: boolean
  error: string | null
  lastFetchedAt: number | null

  // Actions
  fetchBooks: (force?: boolean) => Promise<BookSummary[]>
  invalidateBooks: () => void
  updateBookOptimistically: (bookId: string, patch: Partial<BookSummary>) => void
  removeBookOptimistically: (bookId: string) => void
}

const CACHE_TTL_MS = 60 * 1000 // 60s cache

export const useBooksStore = create<BooksState>((set, get) => ({
  books: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,

  fetchBooks: async (force = false) => {
    const state = get()
    const now = Date.now()

    if (!force && state.books.length > 0 && state.lastFetchedAt && now - state.lastFetchedAt < CACHE_TTL_MS) {
      return state.books
    }

    set({ isLoading: true, error: null })
    try {
      const data = await apiClient.get<BooksApiResponse>('/api/books')
      const booksList = Array.isArray(data?.books) ? data.books : []
      set({
        books: booksList,
        isLoading: false,
        lastFetchedAt: Date.now(),
        error: null,
      })
      return booksList
    } catch (err) {
      const message = AppError.isAppError(err) ? err.message : '获取书架书籍失败'
      set({ isLoading: false, error: message })
      return get().books
    }
  },

  invalidateBooks: () => {
    set({ lastFetchedAt: null })
    get().fetchBooks(true)
  },

  updateBookOptimistically: (bookId, patch) => {
    set((state) => ({
      books: state.books.map((b) => (b.id === bookId ? { ...b, ...patch } : b)),
    }))
  },

  removeBookOptimistically: (bookId) => {
    set((state) => ({
      books: state.books.filter((b) => b.id !== bookId),
    }))
  },
}))
