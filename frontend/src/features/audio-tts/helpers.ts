import {
  TTS_GLOBAL_CHECKPOINT_KEY,
  TTS_PREFS_STORAGE_KEY,
  getBookTtsCheckpointKey,
  AMBIENT_SOUND_CONFIGS,
} from './constants'
import type { TtsCheckpoint, AmbientPreset, TtsAudioStatus } from './types'

export function isNonSpokenMarkerParagraph(p: string | undefined): boolean {
  const trimmed = (p || '').trim()
  if (!trimmed) return true
  if (/^\[\[(?:PDF_PAGE|BOOK_IMAGE|DROPCAP):[^\]]+\]\]$/i.test(trimmed)) return true
  const stripped = trimmed
    .replace(/^>+\s*/, '')
    .replace(/[><*#~^_\=\\·•【】|`\-\+]/g, '')
    .trim()
  if (!stripped) return true
  return !/[\p{L}\p{N}]/u.test(stripped)
}

export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function cleanTtsSpokenText(text: string): string {
  return text
    .replace(/^>+\s*/, '')
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[“”‘’「」『』〝〞＂«»‹›"]/g, '')
    .replace(/(^|[^a-zA-Z])'|'([^a-zA-Z]|$)/g, '$1$2')
    .replace(/[><*#~^_\=\\·•【】|`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanTtsTextPreservingQuotes(text: string): string {
  return text
    .replace(/^>+\s*/, '')
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/[><*#~^_\=\\·•【】|`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export {
  indexParagraphSentences,
  computeActiveSentenceInfo,
  findSentenceRangeInText,
} from './helpers/sentenceIndexer'

export {
  isDialogueSentence,
  resolveSentenceVoice,
  DEFAULT_DIALOGUE_VOICES,
} from './helpers/dialogueSpeaker'

export function splitParagraphSentences(fullPara: string): string[] {
  return (fullPara.match(/[^。！？；…\n.!?]+(?:[。！？；…\n.!?]+["'”’」』]*|$)/g) || [fullPara])
    .map((s) => s.trim())
    .filter(Boolean)
}

export function computeActiveSentence(
  fullPara: string,
  progressRatio: number
): string {
  const sentences = splitParagraphSentences(fullPara)
  if (sentences.length <= 1) return fullPara
  const totalChars = sentences.reduce((acc, s) => acc + s.length, 0)
  const targetCharPos = Math.min(
    totalChars,
    Math.max(0, progressRatio * totalChars)
  )
  let running = 0
  for (const s of sentences) {
    running += s.length
    if (running >= targetCharPos) {
      return s
    }
  }
  return sentences[sentences.length - 1]
}

export function loadGlobalTtsCheckpoint(): TtsCheckpoint | null {
  try {
    const raw = localStorage.getItem(TTS_GLOBAL_CHECKPOINT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.bookId === 'string') {
      return parsed as TtsCheckpoint
    }
  } catch {
    // ignore
  }
  return null
}

export function saveGlobalTtsCheckpoint(cp: TtsCheckpoint): void {
  try {
    const serialized = JSON.stringify(cp)
    localStorage.setItem(TTS_GLOBAL_CHECKPOINT_KEY, serialized)
  } catch {
    // ignore
  }
}

export function loadBookTtsCheckpoint(bookId: string): TtsCheckpoint | null {
  if (!bookId) return null
  try {
    const raw = localStorage.getItem(getBookTtsCheckpointKey(bookId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.bookId === bookId) {
      return parsed as TtsCheckpoint
    }
  } catch {
    // ignore
  }
  return null
}

export function saveBookTtsCheckpoint(bookId: string, cp: TtsCheckpoint): void {
  if (!bookId) return
  try {
    const serialized = JSON.stringify(cp)
    localStorage.setItem(getBookTtsCheckpointKey(bookId), serialized)
    localStorage.setItem(TTS_GLOBAL_CHECKPOINT_KEY, serialized)
  } catch {
    // ignore
  }
}

export function loadTtsPreferences(): { voice?: string; rate?: number } {
  try {
    return JSON.parse(localStorage.getItem(TTS_PREFS_STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveTtsPreferences(voice: string, rate: number): void {
  try {
    localStorage.setItem(
      TTS_PREFS_STORAGE_KEY,
      JSON.stringify({ voice, rate })
    )
  } catch {
    // ignore
  }
}

export function createProceduralNoiseBuffer(
  ctx: AudioContext,
  _preset: AmbientPreset
): AudioBuffer {
  const bufferSize = ctx.sampleRate * 5
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)

  // Paul Kellet's refined 1/f Pink Noise Filter
  let b0 = 0
  let b1 = 0
  let b2 = 0
  let b3 = 0
  let b4 = 0
  let b5 = 0
  let b6 = 0
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
    data[i] = pink
  }
  return buffer
}

export function getAmbientFilterCutoff(preset: AmbientPreset): number {
  return AMBIENT_SOUND_CONFIGS[preset]?.cutoffFrequency || 800
}

export function getThemeClasses(theme: string = 'parchment') {
  const isDark = theme === 'dark'
  const isSepia = theme === 'sepia' || theme === 'parchment'
  const isGreen = theme === 'green' || theme === 'sepia_green'

  const surfaceCls = isDark
    ? 'bg-[#181b22] text-slate-100 border-slate-800/90 shadow-[0_-16px_48px_rgba(0,0,0,0.65)]'
    : isSepia
    ? 'bg-[#f8f3e8] text-[#2c241b] border-[#e6dcc8] shadow-[0_-16px_48px_rgba(60,42,20,0.16)]'
    : isGreen
    ? 'bg-[#eaf2ec] text-[#1e2d24] border-[#cfe0d4] shadow-[0_-16px_48px_rgba(25,55,35,0.14)]'
    : 'bg-white text-slate-900 border-slate-200/90 shadow-[0_-16px_48px_rgba(15,23,42,0.14)]'

  const cardBgCls = isDark
    ? 'bg-slate-800/65 border-slate-700/70'
    : isSepia
    ? 'bg-[#f1e9d8]/80 border-[#e2d6be]'
    : isGreen
    ? 'bg-[#dfece2]/80 border-[#c5dacb]'
    : 'bg-slate-50/90 border-slate-200/75'

  const mutedTextCls = isDark
    ? 'text-slate-400'
    : isSepia
    ? 'text-[#7a6a56]'
    : isGreen
    ? 'text-[#526b5c]'
    : 'text-slate-500'

  const pillIdleCls = isDark
    ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 border border-slate-700/70'
    : isSepia
    ? 'bg-[#ece2ce] text-[#4a3e30] hover:bg-[#e3d6bc] border border-[#dcd0b8]'
    : isGreen
    ? 'bg-[#d6e6da] text-[#2c4234] hover:bg-[#c8dccd] border border-[#bed4c4]'
    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/75 border border-slate-200/60'

  const accentBtnCls = isDark
    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_6px_20px_rgba(245,158,11,0.3)]'
    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-[0_6px_20px_rgba(4,120,87,0.28)]'

  const accentActivePillCls = isDark
    ? 'bg-amber-500 text-slate-950 font-semibold border border-amber-400'
    : 'bg-emerald-700 text-white font-semibold border border-emerald-700'

  const accentBadgeCls = isDark
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-emerald-700/10 text-emerald-800 border-emerald-700/20'

  const activeTextAccentCls = isDark ? 'text-amber-400' : 'text-emerald-700'

  return {
    isDark,
    surfaceCls,
    cardBgCls,
    mutedTextCls,
    pillIdleCls,
    accentBtnCls,
    accentActivePillCls,
    accentBadgeCls,
    activeTextAccentCls,
  }
}

export function isSameTtsAudioStatus(
  prev?: TtsAudioStatus | null,
  next?: TtsAudioStatus | null
): boolean {
  if (prev === next) return true
  if (!prev || !next) return false
  if (prev.active !== next.active) return false
  if (prev.playing !== next.playing) return false
  if (prev.paused !== next.paused) return false
  if (prev.loading !== next.loading) return false
  if (prev.ambientActive !== next.ambientActive) return false
  if (prev.bookId !== next.bookId) return false
  if (prev.bookTitle !== next.bookTitle) return false
  if (prev.chapterIndex !== next.chapterIndex) return false
  if (prev.chapterTitle !== next.chapterTitle) return false
  if (prev.paragraphIndex !== next.paragraphIndex) return false
  return true
}
