export {
  AmbientAndTTSBar,
  TtsHeader,
  TtsCoverStage,
  TtsPlayerBar,
  TtsDrawerModal,
  AmbientMixerModal,
  VoicePickerModal,
  SpeedPickerModal,
  TimerPickerModal,
  ParagraphPickerModal,
  BlackGoldTheaterModal,
} from './components'

export {
  loadGlobalTtsCheckpoint,
  saveGlobalTtsCheckpoint,
  loadBookTtsCheckpoint,
  saveBookTtsCheckpoint,
  loadTtsPreferences,
  saveTtsPreferences,
  formatCountdown,
  computeActiveSentence,
  isNonSpokenMarkerParagraph,
  splitParagraphSentences,
  createProceduralNoiseBuffer,
  getAmbientFilterCutoff,
  getThemeClasses,
  isSameTtsAudioStatus,
} from './helpers'

export {
  useAmbientMixer,
  useAudioPlayback,
  useVoicesManager,
  useSleepTimer,
  useTtsCheckpoint,
  useMediaSession,
  useWebSpeechFallback,
  useTtsSynthesis,
} from './hooks'

export {
  fetchVoicesApi,
  synthesizeSpeech,
  getTtsStreamingAudioUrl,
  updateReadingProgress,
} from './api'

export {
  computeChapterTimeStats,
  seekChapterTarget,
  stepChapterSeconds,
} from './helpers/chapterTimeHelper'

export {
  createGaplessAudioDeckPool,
} from './helpers/gaplessAudioDeck'

export { AmbientAudioEngine } from './helpers/ambientAudioEngine'

export {
  DEFAULT_VOICES,
  TTS_PREFS_STORAGE_KEY,
  TTS_GLOBAL_CHECKPOINT_KEY,
  getBookTtsCheckpointKey,
  AMBIENT_LABEL_MAP,
  AMBIENT_SOUND_CONFIGS,
  SPEED_PRESETS,
  SLEEP_TIMER_OPTIONS,
  VOICE_CATEGORY_TABS,
} from './constants'

export type {
  VoiceCategory,
  SleepTimerMode,
  ActiveTtsDrawer,
  AmbientPreset,
  ReaderTheme,
  NeuralVoiceOption,
  TtsCheckpoint,
  TtsAudioStatus,
  CachedAudioBlob,
  AmbientSoundConfig,
  VoicesApiResponse,
  SynthesizeSpeechResponse,
  PlayParagraphRequest,
  AmbientAndTTSBarProps,
} from './types'
