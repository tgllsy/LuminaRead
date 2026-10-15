import type { CopilotPromptPreset } from './types'

export const COPILOT_PRESETS: CopilotPromptPreset[] = [
  { id: 'book_rag', label: '📚 全书知识库' },
  { id: 'explain', label: '💡 通俗解读' },
  { id: 'example', label: '🌍 现实类比' },
  { id: 'socratic', label: '🤔 苏格拉底追问' },
  { id: 'bilingual', label: '🌐 双语精译' },
]

export const COPILOT_COLOR = {
  primary: '#1b88ee',
  primaryMuted: '#1b88ee/12',
} as const
