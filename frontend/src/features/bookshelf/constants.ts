export const LIBRARY_PRESET_ICONS = ['📚', '🏛️', '💡', '🔬', '🎨', '🧠', '🌏', '⚔️', '📈', '☕']

export const LIBRARY_PRESET_COLORS = [
  '#1b88ee',
  '#0f766e',
  '#7c3aed',
  '#b45309',
  '#be123c',
  '#15803d',
  '#334155',
]

export const CATEGORY_PRESETS = [
  '政治经济学',
  '历史社科',
  '计算机与AI',
  '文学小说',
  '哲学思想',
  '心理学',
  '商业财经',
  '两性沟通',
  '本地导入',
]

export interface ElegantCoverTheme {
  bg: string
  accent: string
  spine: string
}

export const ELEGANT_BOOK_COVERS: ElegantCoverTheme[] = [
  { bg: '#1e293b', accent: '#38bdf8', spine: 'rgba(255,255,255,0.08)' }, // 黛青
  { bg: '#064e3b', accent: '#34d399', spine: 'rgba(255,255,255,0.08)' }, // 松柏墨绿
  { bg: '#4c0519', accent: '#fb7185', spine: 'rgba(255,255,255,0.08)' }, // 勃艮第酒红
  { bg: '#451a03', accent: '#fbbf24', spine: 'rgba(255,255,255,0.08)' }, // 琥珀深褐
  { bg: '#1e1b4b', accent: '#818cf8', spine: 'rgba(255,255,255,0.08)' }, // 普鲁士深靛
  { bg: '#3b0764', accent: '#c084fc', spine: 'rgba(255,255,255,0.08)' }, // 典雅紫晶
  { bg: '#134e4a', accent: '#2dd4bf', spine: 'rgba(255,255,255,0.08)' }, // 极光墨青
  { bg: '#27272a', accent: '#a1a1aa', spine: 'rgba(255,255,255,0.08)' }, // 曜石素黑
]

