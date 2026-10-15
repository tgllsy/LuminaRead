import type { NeuralVoiceOption } from '../types'

export const DRAMA_VOICE_PRESETS: NeuralVoiceOption[] = [
  {
    id: 'drama-yunxi-xiaoxiao',
    name: '广播剧 · 云希旁白+晓晓对白',
    shortName: '广播剧 (云希/晓晓)',
    badge: '智能双角色 · 书卷叙事+灵动对白',
    category: 'flagship',
    recommended: true,
    gender: 'male',
    lang: 'zh-CN',
    description: '智能识别引号内对白与引号外旁白：云希温润朗读旁白，晓晓情感充沛演绎对白，呈现双音色广播剧体验',
  },
  {
    id: 'drama-yunjian-xiaoxiao',
    name: '广播剧 · 云健演播+晓晓对白',
    shortName: '广播剧 (云健/晓晓)',
    badge: '大师剧场 · 磁性演播+灵动对白',
    category: 'flagship',
    recommended: true,
    gender: 'male',
    lang: 'zh-CN',
    description: '云健磁性剧场男声旁白，晓晓富有故事张力演绎对白，极具沉浸故事感染力',
  },
]

export function isDualRoleVoice(voiceId?: string): boolean {
  if (!voiceId) return false
  return voiceId.startsWith('drama-') || voiceId.includes('+')
}
