import type { ExternalBookResult, BookSourceConfig } from '../../types'

export type { ExternalBookResult, BookSourceConfig }

export interface DownloadTask {
  id: string
  title: string
  book_title?: string
  author?: string
  source_id?: string
  source_type?: string
  format: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  local_book_id?: string
  error_message?: string
  created_at: string
  updated_at?: string
}

export interface SearchParams {
  q?: string
  source?: string
  format?: string
  lang?: string
}

export interface SearchResponse {
  query: string
  source: string
  count: number
  results: ExternalBookResult[]
}

export interface DownloadResponse {
  book?: {
    id: string
    title?: string
  }
  task_id?: string
  error?: string
}

export interface SourcesResponse {
  sources: BookSourceConfig[]
}

export interface SourceMutationResponse {
  source?: BookSourceConfig
  error?: string
}

export interface TestConnectivityPayload {
  source_id: string
  base_url: string
  proxy_url?: string
}

export interface TestConnectivityResponse {
  status: string
  message: string
  latency_ms: number
}

export interface DownloadItemState {
  status: string
  progress: number
  localBookId?: string
}

export interface SourceTabItem {
  id: string
  label: string
  badge: string
}

export interface LangFilterItem {
  id: string
  label: string
}

export interface BookDiscoveryModalProps {
  isOpen: boolean
  onClose: () => void
  onBookDownloaded: (bookId: string, openImmediately?: boolean) => void
  onOpenSourceSettings: () => void
  asPage?: boolean
}

export interface SourceSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  asPage?: boolean
}
