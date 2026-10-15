import type { HighlightItem, AIConversationItem } from '../../types'

export const COLOR_META: Record<
  HighlightItem['color'],
  {
    label: string
    dot: string
    border: string
    bg: string
    markBg: string
  }
> = {
  yellow: {
    label: '暖阳黄',
    dot: 'bg-amber-400',
    border: 'border-l-amber-400',
    bg: 'bg-amber-50/50',
    markBg: 'bg-amber-200/70',
  },
  blue: {
    label: '晴空蓝',
    dot: 'bg-[#1b88ee]',
    border: 'border-l-[#1b88ee]',
    bg: 'bg-blue-50/50',
    markBg: 'bg-blue-200/60',
  },
  pink: {
    label: '樱花粉',
    dot: 'bg-rose-400',
    border: 'border-l-rose-400',
    bg: 'bg-rose-50/50',
    markBg: 'bg-rose-200/60',
  },
  green: {
    label: '竹林绿',
    dot: 'bg-emerald-500',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-50/50',
    markBg: 'bg-emerald-200/60',
  },
  purple: {
    label: '丁香紫',
    dot: 'bg-purple-500',
    border: 'border-l-purple-500',
    bg: 'bg-purple-50/50',
    markBg: 'bg-purple-200/60',
  },
}

export const STYLE_LABELS: Record<HighlightItem['style_type'], string> = {
  marker: '马克笔',
  wavy: '波浪线',
  underline: '下划线',
}

export const AI_MODE_META: Record<
  AIConversationItem['mode'],
  { label: string; shortLabel: string; badgeClass: string }
> = {
  explain: {
    label: '💡 重点解读',
    shortLabel: '💡 解读',
    badgeClass: 'bg-blue-50 text-[#1b88ee] border-blue-200/80',
  },
  socratic: {
    label: '🤔 深度探讨',
    shortLabel: '🤔 探讨',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
  },
  example: {
    label: '🌍 现实案例',
    shortLabel: '🌍 案例',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  },
  bilingual: {
    label: '🌐 双语对照',
    shortLabel: '🌐 双语',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
  },
  custom: {
    label: '💬 提问解答',
    shortLabel: '💬 提问',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  },
}

export const PRESET_AI_QUESTIONS = [
  '梳理当前章节的核心要点与逻辑',
  '解释其中较为晦涩的概念与背景',
  '结合具体事例说明文中的关键观点',
  '总结本章节的主要结论与启发',
]
