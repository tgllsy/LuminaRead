export type VoiceCategory = 'recommended' | 'flagship' | 'drama' | 'podcast' | 'dialect' | 'bilingual' | 'all'

export type SleepTimerMode = 'off' | '15' | '30' | '45' | '60' | 'chapter_end'

export type ActiveTtsDrawer =
  | 'none'
  | 'voices'
  | 'speed'
  | 'ambient'
  | 'sleep'
  | 'paragraphs'

export type AmbientPreset =
  | 'off'
  | 'rain'
  | 'fire'
  | 'wind'
  | 'study'
  | 'waves'
  | 'cafe'
  | 'pink_noise'
  | 'white_noise'
  | 'brown_noise'

export type ReaderTheme =
  | 'light'
  | 'sepia'
  | 'parchment'
  | 'green'
  | 'sepia_green'
  | 'dark'
  | 'eink'

export interface NeuralVoiceOption {
  id: string
  name: string
  shortName: string
  badge: string
  category?: 'flagship' | 'podcast' | 'dialect' | 'bilingual' | 'drama'
  provider?: string
  recommended?: boolean
  gender: 'female' | 'male'
  lang: string
  description: string
}

export interface TtsCheckpoint {
  bookId: string
  bookTitle: string
  bookAuthor?: string
  coverUrl?: string
  coverColor?: string
  chapterIndex: number
  chapterTitle: string
  paragraphIndex: number
  totalParagraphs: number
  snippet: string
  audioTimeSec: number
  voice: string
  rate: number
  updatedAt: number
}

export interface TtsAudioStatus {
  active: boolean
  playing: boolean
  paused: boolean
  loading: boolean
  ambientActive: boolean
  bookId?: string
  bookTitle?: string
  chapterIndex?: number
  chapterTitle?: string
  paragraphIndex?: number | null
  totalParagraphs?: number
  snippet?: string
  isDualRole?: boolean
}

export interface ParagraphSentenceInfo {
  index: number
  text: string
  cleanText: string
  startChar: number
  endChar: number
}

export interface CachedAudioBlob {
  blobUrl: string
  cacheHit: boolean
  durationMs: number
  engine: string
  voice: string
  dialogueVoice?: string
  isDualRole?: boolean
}

export interface AmbientSoundConfig {
  id: AmbientPreset
  name: string
  description: string
  audioSrc?: string
  category?: 'nature' | 'scene' | 'noise'
  cutoffFrequency?: number
  whiteRatio?: number
}

export interface VoicesApiResponse {
  voices: NeuralVoiceOption[]
  cache_stats?: {
    cached_clips: number
  }
}

export interface SynthesizeSpeechResponse {
  blob: Blob
  cacheHit: boolean
  durationMs: number
  engine: string
  isDualRole?: boolean
}

export interface PlayParagraphRequest {
  nonce: number
  chapterIndex: number
  paragraphIndex: number
}

export interface AmbientAndTTSBarProps {
  isOpen: boolean
  onOpen?: () => void
  onClose: () => void
  onAudioStatusChange?: (status: TtsAudioStatus) => void
  onCheckpointSaved?: (cp: TtsCheckpoint) => void
  onSelectChapter?: (chapterIdx: number, paragraphIdx?: number) => void
  resumeRequestNonce?: number
  togglePlayPauseNonce?: number
  playParagraphRequest?: PlayParagraphRequest | null
  theme?: ReaderTheme
  bookId?: string
  bookTitle?: string
  bookAuthor?: string
  chapterTitle?: string
  coverUrl?: string
  coverColor?: string
  totalChapters?: number
  paragraphs: string[]
  chapterIndex?: number
  hasNextChapter?: boolean
  activeParagraphIndex: number | null
  onActiveParagraphChange: (index: number | null) => void
  onNextChapter: () => void
  getVisibleParagraphIndex?: () => number
  onOpenToc?: () => void
}

export interface UseTtsLifecycleProps {
  ttsPlaying: boolean
  ttsPaused: boolean
  ttsLoading: boolean
  ambientPreset: string
  bookId: string
  bookTitle: string
  chapterIndex: number
  chapterTitle?: string
  activeParagraphIndex: number | null
  totalParagraphs: number
  activeSentenceSnippet: string
  resumeRequestNonce: number
  togglePlayPauseNonce: number
  playParagraphRequest: PlayParagraphRequest | null
  paragraphsLength: number
  onAudioStatusChange?: (status: TtsAudioStatus) => void
  onResumeCheckpoint: (cp: TtsCheckpoint) => void
  onTogglePlayPause: () => void
  onPlayParagraph: (paraIdx: number, chapIdx: number) => void
  onStop: () => void
}

