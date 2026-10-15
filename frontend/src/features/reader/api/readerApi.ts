import { apiClient } from '../../../shared/api'
import type {
  PdfBookMeta,
  BookChapter,
  ReadingProgress,
  HighlightItem,
  BookmarkItem,
} from '../../../types'

export interface UpdateProgressPayload {
  chapter_index: number
  scroll_offset: number
  percentage: number
  reading_seconds_delta?: number
}

export interface CreateHighlightPayload {
  chapter_index: number
  chapter_title: string
  selected_text: string
  paragraph_index: number
  end_paragraph_index?: number
  start_offset?: number
  end_offset?: number
  cfi_range?: string
  style_type: HighlightItem['style_type']
  color: HighlightItem['color']
  note?: string
}

export interface UpdateHighlightPayload {
  color: HighlightItem['color']
  style_type: HighlightItem['style_type']
  note?: string
}

export interface CreateBookmarkPayload {
  chapter_index: number
  chapter_title: string
  scroll_offset: number
  snippet: string
  percentage: number
}

export interface BilingualChapterResponse {
  chapter?: {
    bilingual?: Array<{
      paragraph_index: number
      translation: string
    }>
  }
}

export const readerApi = {
  /** 获取 PDF 书籍版面元数据 */
  async getPdfMeta(bookId: string): Promise<PdfBookMeta | null> {
    try {
      return await apiClient.get<PdfBookMeta>(
        `/api/books/${encodeURIComponent(bookId)}/pdf-meta`
      )
    } catch {
      return null
    }
  },

  /** 上报活跃阅读心跳时长 */
  async recordReadingSession(bookId: string, durationSeconds: number = 30): Promise<void> {
    try {
      await apiClient.post<void>('/api/stats/session', {
        book_id: bookId,
        duration_seconds: durationSeconds,
      })
    } catch {
      // ignore session heartbeat failure
    }
  },

  /** 获取章节双语平行翻译 */
  async getChapterBilingual(
    bookId: string,
    chapterIndex: number
  ): Promise<BilingualChapterResponse> {
    return apiClient.get<BilingualChapterResponse>(
      `/api/books/${encodeURIComponent(bookId)}/chapters/${chapterIndex}`
    )
  },

  /** 预取或加载特定章节内容 (去翻译纯文本) */
  async getChapterContent(
    bookId: string,
    chapterIndex: number
  ): Promise<{ chapter?: BookChapter } | null> {
    try {
      return await apiClient.get<{ chapter?: BookChapter }>(
        `/api/books/${encodeURIComponent(bookId)}/chapters/${chapterIndex}?bilingual=0`
      )
    } catch {
      return null
    }
  },

  /** 上报最新阅读进度 */
  async updateReadingProgress(
    bookId: string,
    payload: UpdateProgressPayload
  ): Promise<{ progress: ReadingProgress }> {
    return apiClient.put<{ progress: ReadingProgress }>(
      `/api/books/${encodeURIComponent(bookId)}/progress`,
      payload
    )
  },

  /** 创建划线高亮或想法 */
  async createHighlight(
    bookId: string,
    payload: CreateHighlightPayload
  ): Promise<{ highlight: HighlightItem }> {
    return apiClient.post<{ highlight: HighlightItem }>(
      `/api/books/${encodeURIComponent(bookId)}/highlights`,
      payload
    )
  },

  /** 更新划线高亮或想法 */
  async updateHighlight(
    highlightId: string,
    payload: UpdateHighlightPayload
  ): Promise<{ highlight: HighlightItem }> {
    return apiClient.put<{ highlight: HighlightItem }>(
      `/api/highlights/${encodeURIComponent(highlightId)}`,
      payload
    )
  },

  /** 删除划线高亮 */
  async deleteHighlight(highlightId: string): Promise<void> {
    await apiClient.delete<void>(`/api/highlights/${encodeURIComponent(highlightId)}`)
  },

  /** 添加书签 */
  async createBookmark(
    bookId: string,
    payload: CreateBookmarkPayload
  ): Promise<{ bookmark: BookmarkItem }> {
    return apiClient.post<{ bookmark: BookmarkItem }>(
      `/api/books/${encodeURIComponent(bookId)}/bookmarks`,
      payload
    )
  },

  /** 删除书签 */
  async deleteBookmark(bookmarkId: string): Promise<void> {
    await apiClient.delete<void>(`/api/bookmarks/${encodeURIComponent(bookmarkId)}`)
  },
}
