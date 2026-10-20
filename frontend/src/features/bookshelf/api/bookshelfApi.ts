import { apiClient } from '../../../shared/api'
import type { BookSummary, ReadingLibrary, LibraryFormData } from '../types'

interface LibrariesResponse {
  libraries: ReadingLibrary[]
}

interface LibraryMutationResponse {
  library?: ReadingLibrary
}

interface BookUploadInitResponse {
  book: BookSummary
  error?: string
}

interface BookUploadChunkResponse {
  book?: BookSummary
  error?: string
}

export const bookshelfApi = {
  async fetchLibraries(): Promise<ReadingLibrary[]> {
    const data = await apiClient.get<LibrariesResponse>('/api/libraries')
    return Array.isArray(data?.libraries) ? data.libraries : []
  },

  async createLibrary(form: LibraryFormData): Promise<ReadingLibrary | undefined> {
    const data = await apiClient.post<LibraryMutationResponse>('/api/libraries', {
      name: form.name.trim(), description: form.description.trim(), icon: form.icon, color: form.color,
    })
    return data.library
  },

  async updateLibrary(id: string, form: LibraryFormData): Promise<ReadingLibrary | undefined> {
    const data = await apiClient.put<LibraryMutationResponse>(`/api/libraries/${encodeURIComponent(id)}`, {
      name: form.name.trim(), description: form.description.trim(), icon: form.icon, color: form.color,
    })
    return data.library
  },

  async deleteLibrary(id: string): Promise<void> {
    await apiClient.delete(`/api/libraries/${encodeURIComponent(id)}`)
  },

  async updateBookOrganization(bookId: string, payload: { library_id: string; category: string; tags: string[] }): Promise<void> {
    await apiClient.put(`/api/books/${encodeURIComponent(bookId)}`, payload)
  },

  async deleteBook(bookId: string): Promise<void> {
    await apiClient.delete(`/api/books/${encodeURIComponent(bookId)}`)
  },

  async fetchBookById(bookId: string): Promise<BookSummary> {
    return await apiClient.get<BookSummary>(`/api/books/${encodeURIComponent(bookId)}`)
  },

  async reparseBook(bookId: string): Promise<BookSummary> {
    const data = await apiClient.post<{ ok: boolean; book: BookSummary }>(
      `/api/books/${encodeURIComponent(bookId)}/reparse`
    )
    return data.book
  },

  async initBookUpload(payload: { filename: string; fileSize: number; category: string; library_id: string }): Promise<BookSummary> {
    const data = await apiClient.post<BookUploadInitResponse>('/api/books/upload/init', payload)
    return data.book
  },

  async uploadBookChunk(bookId: string, chunkIndex: number, totalChunks: number, chunkBlob: Blob, offset?: number): Promise<BookSummary | undefined> {
    const data = await apiClient.post<BookUploadChunkResponse>('/api/books/upload/chunk', chunkBlob, {
      params: { book_id: bookId, chunk_index: chunkIndex, total_chunks: totalChunks, offset },
      headers: { 'Content-Type': 'application/octet-stream' },
      timeoutMs: 60000,
    })
    return data.book
  },

  async completeBookUpload(bookId: string): Promise<BookSummary> {
    const data = await apiClient.post<{ ok: boolean; book: BookSummary }>('/api/books/upload/complete', { bookId }, { timeoutMs: 180000 })
    return data.book
  },

  async failBookUpload(bookId: string, error?: string): Promise<void> {
    await apiClient.post('/api/books/upload/fail', { bookId, error })
  },

  async fetchDailyReviews(): Promise<any[]> {
    const data = await apiClient.get<{ highlights?: any[]; reviews?: any[] }>('/api/highlights/daily-review')
    const list = data?.highlights ?? data?.reviews
    return Array.isArray(list) ? list : []
  },
}
