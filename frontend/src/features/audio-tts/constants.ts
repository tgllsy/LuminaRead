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

import { DEFAULT_VOICES } from './constants/defaultVoices'
import { DRAMA_VOICE_PRESETS } from './constants/dramaVoices'

export { DEFAULT_VOICES }
export const ALL_FALLBACK_VOICES: NeuralVoiceOption[] = [...DRAMA_VOICE_PRESETS, ...DEFAULT_VOICES]

export const DEFAULT_THEATER_PARAGRAPHS: string[] = [
  '阅境致力于打造纸质书质感与现代数字声学融合的极致阅读体验。',
  '晓晓、云希、云健基于微软 Edge 神经网络拟真模型，提供沉浸温润的自然语调朗读。',
  '伴随微风、夜雨与壁炉白噪音多轨混音，让阅读成为一场随时随地的声音大剧场。',
  '点击右侧任意段落，播放器将瞬间无缝精准定点跟读；点击进度条可随心跳段。',
]

export const AMBIENT_LABEL_MAP: Record<AmbientPreset, string> = {
  off: '环境音',
  rain: '江南夜雨',
  fire: '冬日壁炉',
  wind: '山谷松风',
  study: '深夜书房',
  waves: '潮汐海浪',
  cafe: '午后咖啡',
  pink_noise: '纯净粉噪',
  white_noise: '纯净白噪',
  brown_noise: '深度褐噪',
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
    description: '窗外细雨潺潺，柔和清润沉浸',
    audioSrc: '/audio/ambient/rain.mp3',
    category: 'nature',
    cutoffFrequency: 1200,
    whiteRatio: 0.08,
  },
  fire: {
    id: 'fire',
    name: '冬日壁炉',
    description: '轻微柴火噼啪声，温暖而安详',
    audioSrc: '/audio/ambient/fire.mp3',
    category: 'nature',
    cutoffFrequency: 650,
    whiteRatio: 0.03,
  },
  wind: {
    id: 'wind',
    name: '山谷松风',
    description: '自然微风穿林而过，舒缓身心',
    audioSrc: '/audio/ambient/wind.mp3',
    category: 'nature',
    cutoffFrequency: 800,
    whiteRatio: 0.04,
  },
  study: {
    id: 'study',
    name: '深夜书房',
    description: '静谧图书馆与书房翻页，专注伴读',
    audioSrc: '/audio/ambient/study.mp3',
    category: 'scene',
    cutoffFrequency: 420,
    whiteRatio: 0.02,
  },
  waves: {
    id: 'waves',
    name: '潮汐海浪',
    description: '节奏舒缓的海浪拍岸，助眠放松',
    audioSrc: '/audio/ambient/waves.mp3',
    category: 'nature',
    cutoffFrequency: 600,
    whiteRatio: 0.05,
  },
  cafe: {
    id: 'cafe',
    name: '午后咖啡',
    description: '惬意咖啡馆背景环境，松弛漫读',
    audioSrc: '/audio/ambient/cafe.mp3',
    category: 'scene',
    cutoffFrequency: 900,
    whiteRatio: 0.04,
  },
  pink_noise: {
    id: 'pink_noise',
    name: '纯净粉噪',
    description: '1/f 声学自然均衡，温润护耳助眠',
    audioSrc: '/audio/ambient/pink_noise.mp3',
    category: 'noise',
    cutoffFrequency: 500,
    whiteRatio: 0.06,
  },
  white_noise: {
    id: 'white_noise',
    name: '纯净白噪',
    description: '全频等能量遮蔽声，高效阻绝杂音',
    audioSrc: '/audio/ambient/white_noise.mp3',
    category: 'noise',
    cutoffFrequency: 1000,
    whiteRatio: 0.1,
  },
  brown_noise: {
    id: 'brown_noise',
    name: '深度褐噪',
    description: '深沉低频如远方瀑布，深度专注',
    audioSrc: '/audio/ambient/brown_noise.mp3',
    category: 'noise',
    cutoffFrequency: 300,
    whiteRatio: 0.02,
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
  { id: 'drama', label: '广播剧场' },
  { id: 'podcast', label: '松弛夜聊' },
  { id: 'dialect', label: '方言韵味' },
  { id: 'bilingual', label: '中英双语' },
  { id: 'all', label: '全部' },
]

export const MOBILE_SPEED_OPTIONS = [0.8, 1.0, 1.25, 1.5, 1.75, 2.0]
export const MOBILE_TIMER_OPTIONS = [
  { mins: 0, label: '关闭定时' },
  { mins: 15, label: '15 分钟' },
  { mins: 30, label: '30 分钟' },
  { mins: 45, label: '45 分钟' },
  { mins: 60, label: '60 分钟' },
]

