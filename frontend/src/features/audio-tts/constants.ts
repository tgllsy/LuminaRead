import type {
  NeuralVoiceOption,
  AmbientPreset,
  AmbientSoundConfig,
  SleepTimerMode,
  VoiceCategory,
} from './types'

export const TTS_PREFS_STORAGE_KEY = 'luminaread_tts_prefs_v1'
export const TTS_GLOBAL_CHECKPOINT_KEY = 'luminaread_tts_checkpoint_v1'

export const getBookTtsCheckpointKey = (bookId: string): string =>
  `luminaread_tts_book_${bookId}`

export const DEFAULT_VOICES: NeuralVoiceOption[] = [
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓 · 温暖自然女声',
    shortName: '晓晓 · 温暖女声',
    badge: '旗舰推荐 · 文学/全能',
    category: 'flagship',
    recommended: true,
    gender: 'female',
    lang: 'zh-CN',
    description: '温暖细腻的超拟人女声，呼吸感与情感细节自然，最适合小说、散文与长文沉浸伴读',
  },
  {
    id: 'zh-CN-YunjianNeural',
    name: '云健 · 磁性沉稳男声',
    shortName: '云健 · 磁性演播',
    badge: '大师演播 · 史诗/悬疑',
    category: 'flagship',
    recommended: true,
    gender: 'male',
    lang: 'zh-CN',
    description: '浑厚磁性的剧场感演播男声，极具叙事张力，适合科幻、历史、经典名著与悬疑作品',
  },
  {
    id: 'zh-CN-YunxiNeural',
    name: '云希 · 清澈书生男声',
    shortName: '云希 · 清澈书生',
    badge: '温润书卷 · 叙事/哲思',
    category: 'flagship',
    recommended: true,
    gender: 'male',
    lang: 'zh-CN',
    description: '温和清澈的书卷气青年男声，语调自然松弛，久听不累',
  },
  {
    id: 'zh-TW-HsiaoChenNeural',
    name: '晓臻 · 温润治愈女声',
    shortName: '晓臻 · 台湾国语',
    badge: '温润舒缓 · 散文/美学',
    category: 'dialect',
    recommended: true,
    gender: 'female',
    lang: 'zh-TW',
    description: '温柔细腻的舒缓声线，极适合散文、心理学与睡前伴读',
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    name: '晓伊 · 灵动亲和女声',
    shortName: '晓伊 · 亲切灵动',
    badge: '轻快灵动 · 随笔/日常',
    category: 'flagship',
    recommended: false,
    gender: 'female',
    lang: 'zh-CN',
    description: '清脆温婉的生活感女声，语调亲切自然，适合传记回忆录与旅行随笔',
  },
  {
    id: 'zh-CN-YunyangNeural',
    name: '云扬 · 专业播音男声',
    shortName: '云扬 · 专业播音',
    badge: '专业权威 · 经管/时政',
    category: 'flagship',
    recommended: false,
    gender: 'male',
    lang: 'zh-CN',
    description: '播音级稳重男声，发音清晰笃定，适合哲学、商业与非虚构著作',
  },
  {
    id: 'en-US-AvaMultilingualNeural',
    name: 'Ava · 中英双语女声',
    shortName: 'Ava · 中英双语',
    badge: '中英双语 · 无缝混排',
    category: 'bilingual',
    recommended: true,
    gender: 'female',
    lang: 'en-US',
    description: '原生支持中英双语自然切换，适合英文原著与双语夹杂文本',
  },
  {
    id: 'en-US-BrianMultilingualNeural',
    name: 'Brian · 慵懒播客男声',
    shortName: 'Brian · 松弛播客',
    badge: '松弛漫谈 · 零机械感',
    category: 'podcast',
    recommended: true,
    gender: 'male',
    lang: 'en-US',
    description: '跨语言自然男声，吐字松弛随性，像老友在书房随性漫谈',
  },
]

export const AMBIENT_LABEL_MAP: Record<AmbientPreset, string> = {
  off: '环境音',
  rain: '江南夜雨',
  fire: '冬日壁炉',
  study: '深夜书房',
  wind: '山谷松风',
}

export const AMBIENT_SOUND_CONFIGS: Record<AmbientPreset, AmbientSoundConfig> = {
  off: {
    id: 'off',
    name: '静音',
    description: '关闭环境音效',
    cutoffFrequency: 0,
    whiteRatio: 0,
  },
  rain: {
    id: 'rain',
    name: '江南夜雨',
    description: '柔和雨滴声，适合深夜沉浸',
    cutoffFrequency: 1200,
    whiteRatio: 0.08,
  },
  fire: {
    id: 'fire',
    name: '冬日壁炉',
    description: '轻微柴火噼啪声，温暖安宁',
    cutoffFrequency: 650,
    whiteRatio: 0.03,
  },
  study: {
    id: 'study',
    name: '深夜书房',
    description: '极低频粉红噪音，提升专注力',
    cutoffFrequency: 420,
    whiteRatio: 0.02,
  },
  wind: {
    id: 'wind',
    name: '山谷松风',
    description: '空灵山风，舒缓身心',
    cutoffFrequency: 800,
    whiteRatio: 0.04,
  },
}

export const SPEED_PRESETS: number[] = [0.8, 0.9, 1.0, 1.15, 1.3, 1.5, 1.8, 2.0]

export const SLEEP_TIMER_OPTIONS: { id: SleepTimerMode; label: string }[] = [
  { id: 'off', label: '不开启' },
  { id: '15', label: '15 分钟' },
  { id: '30', label: '30 分钟' },
  { id: '45', label: '45 分钟' },
  { id: '60', label: '60 分钟' },
  { id: 'chapter_end', label: '本章读完' },
]

export const VOICE_CATEGORY_TABS: { id: VoiceCategory; label: string }[] = [
  { id: 'recommended', label: '精选推荐' },
  { id: 'flagship', label: '文学演播' },
  { id: 'podcast', label: '松弛夜聊' },
  { id: 'dialect', label: '方言韵味' },
  { id: 'all', label: '全部' },
]
