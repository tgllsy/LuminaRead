export interface BookSourceConfig {
  id: string
  source_type: 'zlibrary' | 'annas_archive' | 'gutenberg' | 'openlibrary' | 'opds'
  name: string
  description: string
  base_url: string
  mirror_urls: string[]
  auth_config: {
    email?: string
    password?: string
    remix_userid?: string
    remix_userkey?: string
    api_key?: string
    username?: string
  }
  proxy_url: string
  enabled: boolean
  priority: number
  last_test_ms: number
  last_test_status: string
  updated_at: string
}

export interface ExternalBookResult {
  remote_id: string
  ia_identifier?: string
  source_id: string
  source_type: string
  title: string
  author: string
  publisher: string
  year: string
  isbn: string
  format: string
  file_size: string
  language: string
  cover_url?: string
  cover_color: string
  md5?: string
  download_url?: string
  category: string
  tags: string[]
  description: string
  already_in_shelf?: boolean
  local_book_id?: string
}

export interface DownloadTaskItem {
  id: string
  source_id: string
  source_type: string
  remote_id: string
  title: string
  author: string
  format: string
  file_size: string
  cover_color: string
  status: 'queued' | 'downloading' | 'parsing' | 'completed' | 'failed'
  progress: number
  error_message: string
  book_id: string
  created_at: string
  updated_at: string
}
