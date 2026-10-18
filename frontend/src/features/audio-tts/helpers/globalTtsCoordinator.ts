import { useTtsStore } from '../../../stores/ttsStore'
import { stopAllRegisteredDeckAudios } from './gaplessAudioDeck'

interface ActiveTtsSession {
  bookId: string
  stop: () => void
  audioEl?: HTMLAudioElement | null
}

let activeSession: ActiveTtsSession | null = null
let broadcastChannel: BroadcastChannel | null = null

const CHANNEL_NAME = 'luminaread_tts_global_channel'
const STORAGE_LOCK_KEY = 'luminaread_tts_global_lock'
const TAB_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `tab_${Math.random().toString(36).slice(2)}`

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME)
      broadcastChannel.onmessage = (event: MessageEvent) => {
        handleCrossTabMessage(event.data)
      }
    } catch {
      // BroadcastChannel not supported in this runtime
    }
  }
  return broadcastChannel
}

function handleCrossTabMessage(data: any): void {
  if (!data || data.senderTabId === TAB_ID) return
  if (data.type === 'EXCLUSIVE_PLAY') {
    // Another tab/window claimed playback for a book, halt local playback immediately
    stopLocalTts(`Cross-tab playback takeover by book ${data.bookId}`)
  } else if (data.type === 'STOP_ALL') {
    stopLocalTts('Cross-tab STOP_ALL event')
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_LOCK_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        if (parsed.senderTabId !== TAB_ID && (parsed.type === 'EXCLUSIVE_PLAY' || parsed.type === 'STOP_ALL')) {
          stopLocalTts(`Storage event takeover: ${parsed.type}`)
        }
      } catch {
        // ignore parse errors
      }
    }
  })
  getBroadcastChannel()
}

export function stopLocalTts(reason?: string): void {
  stopAllRegisteredDeckAudios()
  if (activeSession) {
    const s = activeSession
    activeSession = null
    try {
      s.stop()
    } catch {
      // ignore
    }
    if (s.audioEl) {
      try {
        s.audioEl.pause()
        s.audioEl.removeAttribute('src')
        s.audioEl.load()
      } catch {
        // ignore
      }
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
  }

  const ttsStore = useTtsStore.getState()
  ttsStore.setActivePara(null)
  ttsStore.setFocusedPara(null)
  ttsStore.setActiveSentence('')
  if (ttsStore.audioStatus.playing || ttsStore.audioStatus.active) {
    ttsStore.setAudioStatus((prev) => ({
      ...prev,
      playing: false,
      paused: false,
      loading: false,
      active: prev.ambientActive,
    }))
  }
}

export function claimGlobalTtsSession(
  bookId: string,
  stop: () => void,
  audioEl?: HTMLAudioElement | null
): void {
  stopAllRegisteredDeckAudios(audioEl)
  if (activeSession) {
    if (activeSession.bookId !== bookId) {
      stopLocalTts(`Switching TTS session from ${activeSession.bookId} to ${bookId}`)
    } else {
      if (activeSession.stop !== stop) {
        try {
          activeSession.stop()
        } catch {
          // ignore
        }
      }
      if (activeSession.audioEl && activeSession.audioEl !== audioEl) {
        try {
          activeSession.audioEl.pause()
          activeSession.audioEl.removeAttribute('src')
          activeSession.audioEl.load()
        } catch {
          // ignore
        }
      }
    }
  }

  activeSession = { bookId, stop, audioEl }

  const payload = {
    type: 'EXCLUSIVE_PLAY',
    bookId,
    senderTabId: TAB_ID,
    timestamp: Date.now(),
  }

  const ch = getBroadcastChannel()
  if (ch) {
    try {
      ch.postMessage(payload)
    } catch {
      // ignore
    }
  }

  try {
    localStorage.setItem(STORAGE_LOCK_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

export function releaseGlobalTtsSession(bookId?: string): void {
  if (activeSession && (!bookId || activeSession.bookId === bookId)) {
    activeSession = null
  }
}

export function stopAllGlobalTts(reason?: string): void {
  stopLocalTts(reason)

  const payload = {
    type: 'STOP_ALL',
    senderTabId: TAB_ID,
    timestamp: Date.now(),
  }

  const ch = getBroadcastChannel()
  if (ch) {
    try {
      ch.postMessage(payload)
    } catch {
      // ignore
    }
  }

  try {
    localStorage.setItem(STORAGE_LOCK_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}
