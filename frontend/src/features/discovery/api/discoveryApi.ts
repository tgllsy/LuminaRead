import { apiClient } from '../../../shared/api'
import type {
  ExternalBookResult,
  BookSourceConfig,
  SearchParams,
  SearchResponse,
  DownloadResponse,
  SourcesResponse,
  SourceMutationResponse,
  TestConnectivityPayload,
  TestConnectivityResponse,
  DownloadTask,
} from '../types'

interface DownloadTasksResponse {
  tasks: DownloadTask[]
}

export const discoveryApi = {
  async searchBooks(
    params: SearchParams,
    signal?: AbortSignal
  ): Promise<ExternalBookResult[]> {
    const data = await apiClient.get<SearchResponse>('/api/discover/search', {
      params: {
        q: params.q || '',
        source: params.source || 'all',
        format: params.format || 'all',
        lang: params.lang || 'all',
      },
      signal,
    })
    return Array.isArray(data?.results) ? data.results : []
  },

  async downloadBook(item: ExternalBookResult, signal?: AbortSignal): Promise<DownloadResponse> {
    return await apiClient.post<DownloadResponse>('/api/discover/download', item, { timeoutMs: 120000, signal })
  },

  async fetchDownloadTasks(): Promise<DownloadTask[]> {
    const data = await apiClient.get<DownloadTasksResponse>('/api/discover/tasks')
    return Array.isArray(data?.tasks) ? data.tasks : []
  },

  async fetchSources(): Promise<BookSourceConfig[]> {
    const data = await apiClient.get<SourcesResponse>('/api/sources')
    return Array.isArray(data?.sources) ? data.sources : []
  },

  async updateSource(
    id: string,
    payload: Partial<BookSourceConfig>
  ): Promise<BookSourceConfig | undefined> {
    const data = await apiClient.put<SourceMutationResponse>(
      `/api/sources/${encodeURIComponent(id)}`,
      payload
    )
    return data?.source
  },

  async testSourceConnectivity(
    payload: TestConnectivityPayload
  ): Promise<TestConnectivityResponse> {
    return await apiClient.post<TestConnectivityResponse>(
      '/api/sources/test',
      payload
    )
  },
}
