import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { CachedAudioBlob } from '../types'
import { synthesizeSpeech } from '../api'
import { getCachedAudioBlob, putCachedAudioBlob } from '../helpers/ttsAudioStorage'

export function useTtsSynthesis() {
  const [lastCacheStatus, setLastCacheStatus] = useState<'HIT' | 'MISS' | 'LOCAL' | null>(null)
  const blobCacheRef = useRef<Map<string, CachedAudioBlob>>(new Map())
  const inflightFetchRef = useRef<Map<string, Promise<CachedAudioBlob>>>(new Map())

  const fetchParagraphNeuralAudio = useCallback(
    async (text: string, voice: string, dialogueVoice?: string): Promise<CachedAudioBlob> => {
      const normalized = text.replace(/\s+/g, ' ').trim()
      const cacheKey = dialogueVoice ? `${voice}:${dialogueVoice}::${normalized}` : `${voice}::${normalized}`

      const existing = blobCacheRef.current.get(cacheKey)
      if (existing) {
        return { ...existing, cacheHit: true }
      }

      const inflight = inflightFetchRef.current.get(cacheKey)
      if (inflight) {
        return inflight
      }

      const setEntryInCache = (k: string, e: CachedAudioBlob) => {
        if (blobCacheRef.current.size >= 64) {
          const oldestKey = blobCacheRef.current.keys().next().value
          if (oldestKey) {
            const oldEntry = blobCacheRef.current.get(oldestKey)
            if (oldEntry?.blobUrl) {
              const urlToRevoke = oldEntry.blobUrl
              setTimeout(() => {
                try { URL.revokeObjectURL(urlToRevoke) } catch {}
              }, 60000)
            }
            blobCacheRef.current.delete(oldestKey)
          }
        }
        blobCacheRef.current.set(k, e)
      }

      const promise = (async () => {
        const storedBlob = await getCachedAudioBlob(cacheKey)
        if (storedBlob) {
          const blobUrl = URL.createObjectURL(storedBlob)
          const entry: CachedAudioBlob = {
            blobUrl,
            cacheHit: true,
            durationMs: Math.max(800, Math.round(normalized.length * 180)),
            engine: 'edge-neural',
            voice,
            dialogueVoice,
            isDualRole: Boolean(dialogueVoice) || voice.startsWith('drama-'),
          }
          setEntryInCache(cacheKey, entry)
          return entry
        }

        const resp = await synthesizeSpeech(normalized, voice, 1.0, dialogueVoice)
        putCachedAudioBlob(cacheKey, resp.blob).catch(() => {})
        const blobUrl = URL.createObjectURL(resp.blob)
        const entry: CachedAudioBlob = {
          blobUrl,
          cacheHit: resp.cacheHit,
          durationMs: resp.durationMs,
          engine: resp.engine,
          voice,
          dialogueVoice,
          isDualRole: resp.isDualRole || Boolean(dialogueVoice) || voice.startsWith('drama-'),
        }
        setEntryInCache(cacheKey, entry)
        return entry
      })()

      inflightFetchRef.current.set(cacheKey, promise)
      try {
        return await promise
      } finally {
        inflightFetchRef.current.delete(cacheKey)
      }
    },
    []
  )

  const prefetchParagraph = useCallback((text: string, voice: string, dialogueVoice?: string) => {
    if (!text.trim()) return
    fetchParagraphNeuralAudio(text, voice, dialogueVoice).catch(() => {})
  }, [fetchParagraphNeuralAudio])

  const hasCachedAudio = useCallback((text: string, voice: string, dialogueVoice?: string): boolean => {
    const normalized = text.replace(/\s+/g, ' ').trim()
    const cacheKey = dialogueVoice ? `${voice}:${dialogueVoice}::${normalized}` : `${voice}::${normalized}`
    return blobCacheRef.current.has(cacheKey)
  }, [])

  useEffect(() => {
    return () => {
      for (const item of blobCacheRef.current.values()) {
        try { URL.revokeObjectURL(item.blobUrl) } catch { /* ignore */ }
      }
      blobCacheRef.current.clear()
    }
  }, [])

  const abortInflightRequests = useCallback(() => {
    inflightFetchRef.current.clear()
  }, [])

  return useMemo(
    () => ({
      lastCacheStatus,
      setLastCacheStatus,
      fetchParagraphNeuralAudio,
      prefetchParagraph,
      hasCachedAudio,
      abortInflightRequests,
    }),
    [
      lastCacheStatus,
      fetchParagraphNeuralAudio,
      prefetchParagraph,
      hasCachedAudio,
      abortInflightRequests,
    ]
  )
}
