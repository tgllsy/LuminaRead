import { apiClient } from '../../../shared/api'
import type {
  VoicesApiResponse,
  SynthesizeSpeechResponse,
} from '../types'
import { cleanTtsTextPreservingQuotes } from '../helpers'

export async function fetchVoicesApi(): Promise<VoicesApiResponse> {
  return apiClient.get<VoicesApiResponse>('/api/tts/voices')
}

export function getTtsStreamingAudioUrl(
  text: string,
  voice: string,
  dialogueVoice?: string
): string {
  const normalized = cleanTtsTextPreservingQuotes(text)
  const params = new URLSearchParams({
    text: normalized,
    voice,
    format: 'audio/mpeg',
  })
  if (dialogueVoice) {
    params.append('dialogue_voice', dialogueVoice)
  }
  return `/api/tts/speak?${params.toString()}`
}

export async function synthesizeSpeech(
  text: string,
  voice: string,
  rate = 1.0,
  dialogueVoice?: string,
  signal?: AbortSignal
): Promise<SynthesizeSpeechResponse> {
  const normalized = cleanTtsTextPreservingQuotes(text)
  const res = await apiClient.post<Response>(
    '/api/tts/speak',
    {
      text: normalized,
      voice,
      dialogue_voice: dialogueVoice,
      rate,
    },
    {
      rawResponse: true,
      headers: {
        Accept: 'audio/mpeg, application/json',
      },
      signal,
    }
  )

  const contentType = res.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const json = await res.json()
    if (!json?.audio_url) {
      throw new Error(json?.error || 'Invalid TTS JSON response')
    }
    const audioRes = await apiClient.get<Response>(json.audio_url, {
      rawResponse: true,
      headers: { Accept: 'audio/mpeg' },
    })
    const blob = await audioRes.blob()
    if (blob.size < 100) {
      throw new Error('Empty TTS audio blob')
    }
    return {
      blob,
      cacheHit: Boolean(json.cached),
      durationMs: Math.round(Number(json.duration_ms || (json.duration_estimate_sec || 8) * 1000)),
      engine: String(json.engine || 'edge-neural'),
    }
  }

  const cacheHeader = res.headers.get('X-TTS-Cache')
  const durationHeader = Number(res.headers.get('X-TTS-Duration-Ms') || 0)
  const engineHeader = res.headers.get('X-TTS-Engine') || 'edge-neural'
  const blob = await res.blob()

  if (blob.size < 100) {
    throw new Error('Empty TTS audio blob')
  }

  return {
    blob,
    cacheHit: cacheHeader === 'HIT',
    durationMs: durationHeader || Math.round(blob.size / 6),
    engine: engineHeader,
  }
}

export async function updateReadingProgress(
  bookId: string,
  payload: { current_chapter: number; scroll_progress: number }
): Promise<void> {
  if (!bookId) return
  await apiClient.put(
    `/api/books/${encodeURIComponent(bookId)}/progress`,
    payload
  )
}
