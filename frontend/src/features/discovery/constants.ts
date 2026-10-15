import type { SourceTabItem, LangFilterItem } from './types'

export const SOURCE_TABS: SourceTabItem[] = [
  { id: 'all', label: '全网聚合', badge: '5源并发' },
  { id: 'zlibrary', label: 'Z-Library', badge: '镜像直连' },
  { id: 'annas_archive', label: "Anna's Archive", badge: '影子书库' },
  { id: 'openlibrary', label: 'OpenLibrary', badge: '开放书库' },
  { id: 'gutenberg', label: 'Gutendex 公版', badge: '免配置' },
  { id: 'opds', label: 'OPDS 订阅', badge: '标准协议' },
]

export const FORMAT_FILTERS: string[] = ['all', 'epub', 'txt', 'pdf', 'mobi']

export const LANG_FILTERS: LangFilterItem[] = [
  { id: 'all', label: '全部语言' },
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
]

export const DEFAULT_SELECTED_SOURCE_ID = 'zlib-official'
