import type { CopilotPromptPreset, CognitiveMode } from './types'

export const COGNITIVE_MODES: Array<{
  id: CognitiveMode
  label: string
  iconName: 'flame' | 'git-branch' | 'shuffle'
  color: string
  desc: string
}> = [
  {
    id: 'socratic',
    label: '苏格拉底质疑',
    iconName: 'flame',
    color: 'text-amber-600',
    desc: '辩难模式 · 逻辑压力测试与反向挑战',
  },
  {
    id: 'causal_graph',
    label: '因果网络图谱',
    iconName: 'git-branch',
    color: 'text-[#1b88ee]',
    desc: '全书推演逻辑链与前情脉络星图',
  },
  {
    id: 'intertextual',
    label: '跨书互文碰撞',
    iconName: 'shuffle',
    color: 'text-purple-600',
    desc: '全馆馆藏多著作论点交锋与对照',
  },
]

export const COPILOT_PRESETS: CopilotPromptPreset[] = [
  { id: 'socratic', label: '🔥 苏格拉底辩难' },
  { id: 'book_rag', label: '📚 全书知识库' },
  { id: 'explain', label: '💡 通俗解读' },
  { id: 'example', label: '🌍 现实类比' },
  { id: 'intertextual', label: '🔀 跨书互文' },
  { id: 'bilingual', label: '🌐 双语精译' },
]

export const DEFAULT_HEURISTIC_CHIPS: string[] = [
  '⚡ 为何既有激励机制会导致这一路径依赖？',
  '⚡ 如果把核心前提假设反转，逻辑会如何分叉？',
  '⚡ 寻找全书中与此观点针锋相对的反向论据',
  '⚡ 结合现实历史场景进行推演压力测试',
]

export const COPILOT_COLOR = {
  primary: '#1b88ee',
  primaryMuted: '#1b88ee/12',
} as const
