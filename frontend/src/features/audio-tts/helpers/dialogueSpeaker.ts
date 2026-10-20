/**
 * 智能小说对白（引号内容）与旁白检测与多角色音色分配
 * 遵循 Ponytail 极简高效原则，按双引号/直角引号规则匹配
 */

export interface DialogueVoiceConfig {
  narratorVoice: string    // 旁白默认音色 (如 zh-CN-YunxiNeural 沉稳男声)
  dialogueFemaleVoice: string // 女性/高表现力对白 (如 zh-CN-XiaoxiaoNeural)
  dialogueMaleVoice: string   // 男性对白 (如 zh-CN-YunjianNeural)
}

export const DEFAULT_DIALOGUE_VOICES: DialogueVoiceConfig = {
  narratorVoice: 'zh-CN-YunxiNeural',
  dialogueFemaleVoice: 'zh-CN-XiaoxiaoNeural',
  dialogueMaleVoice: 'zh-CN-YunjianNeural',
}

/**
 * 判断句子是否属于角色直接对白
 */
export function isDialogueSentence(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  // 以引号开头并以引号结尾，或主要内容被引号包裹
  if (/^[“「『"].*[”」』"]$/.test(trimmed)) return true

  // 包含对话引导词加冒号引号，如：他说道：“...”、她问：“...”
  if (/(?:说|道|问|喊|答|叫|喝|叹|念)[：:](?:“|「|『|")/.test(trimmed)) return true

  return false
}

/**
 * 根据对话上下文与句子特征分配演播音色
 */
export function resolveSentenceVoice(
  sentenceText: string,
  baseVoice: string,
  enableMultiRole: boolean = true
): string {
  if (!enableMultiRole || baseVoice.startsWith('drama-')) return baseVoice

  const isDialogue = isDialogueSentence(sentenceText)
  if (!isDialogue) return baseVoice

  // 根据句意及前缀代词微调对白性别音色
  const isFemale = /(?:她|妹|母|娘|妻|姐|女|郡主|夫人|姑娘|阿姨)/.test(sentenceText)
  if (isFemale) {
    return DEFAULT_DIALOGUE_VOICES.dialogueFemaleVoice
  }

  // 默认对白如果 baseVoice 本身是女声，则对白切男声；反之切女声产生反差
  if (baseVoice.includes('Xiaoxiao') || baseVoice.includes('Xiaoyi')) {
    return DEFAULT_DIALOGUE_VOICES.dialogueMaleVoice
  }

  return DEFAULT_DIALOGUE_VOICES.dialogueFemaleVoice
}
