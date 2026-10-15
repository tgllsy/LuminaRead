import { apiClient } from '../../../shared/api'
import type {
  NotesHubOverviewResponse,
  HighlightItem,
  AIConversationItem,
  CreateNotePayload,
  AskAiPayload,
} from '../types'

export const notesApi = {
  async fetchNotesHub(): Promise<NotesHubOverviewResponse> {
    return await apiClient.get<NotesHubOverviewResponse>('/api/notes/hub')
  },

  async fetchBookToc(
    bookId: string
  ): Promise<Array<{ id?: string; index: number; title: string; word_count?: number }>> {
    const data = await apiClient.get<{
      toc?: Array<{ id?: string; index: number; title: string; word_count?: number }>
    }>(`/api/books/${encodeURIComponent(bookId)}/content`, { params: { lite: 1 } })
    return Array.isArray(data?.toc) ? data.toc : []
  },

  async createNoteHighlight(payload: CreateNotePayload): Promise<HighlightItem> {
    const res = await apiClient.post<{ highlight: HighlightItem }>(
      `/api/books/${encodeURIComponent(payload.bookId)}/highlights`,
      {
        chapter_index: payload.chapterIndex,
        chapter_title: payload.chapterTitle,
        selected_text: payload.quote.trim(),
        paragraph_index: 0,
        color: payload.color,
        style_type: payload.style,
        note: payload.note.trim(),
      }
    )
    return res.highlight
  },

  async updateHighlight(
    hlId: string,
    payload: {
      note?: string
      selected_text?: string
      color?: HighlightItem['color']
      style_type?: HighlightItem['style_type']
    }
  ): Promise<void> {
    await apiClient.put(`/api/highlights/${encodeURIComponent(hlId)}`, payload)
  },

  async deleteHighlight(hlId: string): Promise<void> {
    await apiClient.delete(`/api/highlights/${encodeURIComponent(hlId)}`)
  },

  async deleteBookmark(bmId: string): Promise<void> {
    await apiClient.delete(`/api/bookmarks/${encodeURIComponent(bmId)}`)
  },

  async askAi(payload: AskAiPayload): Promise<AIConversationItem> {
    const res = await apiClient.post<{ conversation: AIConversationItem }>(
      '/api/ai/conversations',
      {
        book_id: payload.bookId,
        chapter_index: payload.chapterIndex,
        chapter_title: payload.chapterTitle,
        selected_text: payload.selectedText,
        mode: payload.mode,
        question: payload.question,
      }
    )
    return res.conversation
  },

  async updateAiConversation(
    convId: string,
    payload: {
      is_pinned?: boolean
      saved_highlight_id?: string
      question?: string
      selected_text?: string
      answer_title?: string
      answer_content?: string
    }
  ): Promise<void> {
    await apiClient.put(`/api/ai/conversations/${encodeURIComponent(convId)}`, payload)
  },

  async deleteAiConversation(convId: string): Promise<void> {
    await apiClient.delete(`/api/ai/conversations/${encodeURIComponent(convId)}`)
  },

  async exportMarkdown(bookId: string): Promise<string> {
    const res = await apiClient.get<{ markdown?: string }>(
      `/api/export/markdown/${encodeURIComponent(bookId)}`
    )
    return res.markdown || ''
  },

  async exportLifeOs(bookId: string): Promise<any> {
    return await apiClient.post('/api/export/lifeos', { book_id: bookId })
  },
}
