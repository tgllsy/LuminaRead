import { apiClient } from '../../../shared/api'
import { DEFAULT_SEARCH_LIMIT } from '../constants'
import type {
  FullTextSearchResponse,
  StatsOverview,
  ExportMarkdownResponse,
  SyncLifeOsResponse,
} from '../types'

export const searchStatsApi = {
  /**
   * 全文与笔记跨书检索
   */
  async search(query: string, limit: number = DEFAULT_SEARCH_LIMIT): Promise<FullTextSearchResponse> {
    return await apiClient.get<FullTextSearchResponse>('/api/search', {
      params: { q: query.trim(), limit },
    })
  },

  /**
   * 获取近 35 天阅读统计概览与日历热力图
   */
  async getReadingStats(): Promise<StatsOverview> {
    return await apiClient.get<StatsOverview>('/api/stats/overview')
  },

  /**
   * 导出书籍的 Markdown 结构化笔记
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
}
