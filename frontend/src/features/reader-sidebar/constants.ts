export const COLOR_HEX: Record<string, string> = {
  yellow: '#f59e0b',
  blue: '#1b88ee',
  pink: '#f43f5e',
  green: '#10b981',
  purple: '#8b5cf6',
}

export const COLOR_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'yellow', label: '黄' },
  { id: 'blue', label: '蓝' },
  { id: 'pink', label: '粉' },
  { id: 'green', label: '绿' },
  { id: 'purple', label: '紫' },
] as const

export const MIN_MINDMAP_ZOOM = 0.6
export const MAX_MINDMAP_ZOOM = 1.8
export const MINDMAP_ZOOM_STEP = 0.2

export const DEFAULT_LEAF_SPACING = 44
export const MIN_BLOCK_HEIGHT = 64
export const MIN_MINDMAP_HEIGHT = 420
export const SYNC_MSG_TIMEOUT_MS = 3500
