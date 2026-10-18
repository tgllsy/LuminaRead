export type DeckId = 'A' | 'B'

export interface GaplessAudioDeckManager {
  getActiveDeckId: () => DeckId
  getActiveAudio: () => HTMLAudioElement
  getStandbyAudio: () => HTMLAudioElement
  preloadStandby: (url: string, rate: number) => void
  swapAndPlay: () => HTMLAudioElement
  pauseAll: () => void
  resetAll: () => void
  setPlaybackRate: (rate: number) => void
}

const registeredDeckAudios = new Set<HTMLAudioElement>()

export function stopAllRegisteredDeckAudios(exceptEl?: HTMLAudioElement | null): void {
  for (const el of registeredDeckAudios) {
    if (exceptEl && el === exceptEl) continue
    try {
      el.pause()
      el.removeAttribute('src')
      el.load()
      el.onended = null
      el.onerror = null
      el.ontimeupdate = null
      el.onloadedmetadata = null
    } catch {
      // ignore
    }
  }
}

function createConfiguredAudioElement(): HTMLAudioElement {
  const el = new Audio()
  el.preload = 'auto'
  el.setAttribute('playsinline', 'true')
  if ('preservesPitch' in el) {
    ;(el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true
  }
  registeredDeckAudios.add(el)
  return el
}

export function createGaplessAudioDeckPool(): GaplessAudioDeckManager {
  let activeDeckId: DeckId = 'A'
  const deckA = createConfiguredAudioElement()
  const deckB = createConfiguredAudioElement()

  const getActiveDeckId = (): DeckId => activeDeckId

  const getActiveAudio = (): HTMLAudioElement => {
    return activeDeckId === 'A' ? deckA : deckB
  }

  const getStandbyAudio = (): HTMLAudioElement => {
    return activeDeckId === 'A' ? deckB : deckA
  }

  const preloadStandby = (url: string, rate: number): void => {
    const standby = getStandbyAudio()
    if (!url) return
    if (standby.src !== url) {
      standby.src = url
      standby.playbackRate = rate
      standby.preload = 'auto'
      standby.load()
    }
  }

  const swapAndPlay = (): HTMLAudioElement => {
    const prev = getActiveAudio()
    activeDeckId = activeDeckId === 'A' ? 'B' : 'A'
    const next = getActiveAudio()

    try {
      prev.pause()
      prev.removeAttribute('src')
      prev.load()
      prev.onended = null
      prev.onerror = null
      prev.ontimeupdate = null
      prev.onloadedmetadata = null
    } catch {
      // ignore
    }

    return next
  }

  const pauseAll = (): void => {
    try {
      deckA.pause()
    } catch {
      // ignore
    }
    try {
      deckB.pause()
    } catch {
      // ignore
    }
  }

  const resetAll = (): void => {
    pauseAll()
    try {
      deckA.removeAttribute('src')
      deckA.load()
    } catch {
      // ignore
    }
    try {
      deckB.removeAttribute('src')
      deckB.load()
    } catch {
      // ignore
    }
    deckA.onended = null
    deckA.onerror = null
    deckA.ontimeupdate = null
    deckA.onloadedmetadata = null
    deckB.onended = null
    deckB.onerror = null
    deckB.ontimeupdate = null
    deckB.onloadedmetadata = null
  }

  const setPlaybackRate = (rate: number): void => {
    deckA.playbackRate = rate
    deckB.playbackRate = rate
  }

  return {
    getActiveDeckId,
    getActiveAudio,
    getStandbyAudio,
    preloadStandby,
    swapAndPlay,
    pauseAll,
    resetAll,
    setPlaybackRate,
  }
}
