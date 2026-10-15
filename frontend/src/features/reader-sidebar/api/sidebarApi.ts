import { apiClient } from '../../../shared/api'
import type {
  FullTextSearchResponse,
  ExportMarkdownResponse,
  SyncLifeOsResponse,
  HighlightItem,
} from '../types'

export const sidebarApi = {
  /**
   * 搜索当前书籍的章节内容与划线笔记
   */
  async searchInBook(bookId: string, query: string): Promise<FullTextSearchResponse> {
    return await apiClient.get<FullTextSearchResponse>(
      `/api/books/${encodeURIComponent(bookId)}/search`,
      { params: { q: query.trim() } }
    )
  },

  /**
   * 导出书籍笔记为 Markdown 格式
   */
  async exportMarkdown(bookId: string): Promise<ExportMarkdownResponse> {
    return await apiClient.get<ExportMarkdownResponse>(
      `/api/export/markdown/${encodeURIComponent(bookId)}`
    )
  },

  /**
   * 推送划线笔记至本地 LifeOS 知识库
   */
  async syncLifeOs(bookId: string): Promise<SyncLifeOsResponse> {
    return await apiClient.post<SyncLifeOsResponse>('/api/export/lifeos', {
      book_id: bookId,
    })
  },

  /**
   * 更新划线笔记内容或颜色
   */
  async updateHighlight(
    hlId: string,
    payload: Partial<HighlightItem>
  ): Promise<void> {
    await apiClient.put(`/api/highlights/${encodeURIComponent(hlId)}`, payload)
  },

  /**
   * 删除划线笔记
   */
  async deleteHighlight(hlId: string): Promise<void> {
    await apiClient.delete(`/api/highlights/${encodeURIComponent(hlId)}`)
  },

  /**
   * 删除书签
   */
  async deleteBookmark(bmId: string): Promise<void> {
    await apiClient.delete(`/api/bookmarks/${encodeURIComponent(bmId)}`)
  },
}
