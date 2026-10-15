import { create } from 'zustand'
import type { TtsAudioStatus, TtsCheckpoint } from '../features/audio-tts'
import { loadGlobalTtsCheckpoint, isSameTtsAudioStatus } from '../features/audio-tts'

interface TtsStoreState {
  audioStatus: TtsAudioStatus
  checkpoint: TtsCheckpoint | null
  activePara: number | null
  focusedPara: { chapterIndex: number; paragraphIndex: number } | null
  resumeTtsNonce: number
  toggleTtsPlayPauseNonce: number
  openTtsModalNonce: number
  listeningCapsuleDismissed: boolean
  activeSentence: string
  resumeTargetBookId: string | null
  resumeRequestTimestamp: number

  // Actions
  setAudioStatus: (status: TtsAudioStatus | ((prev: TtsAudioStatus) => TtsAudioStatus)) => void
  setCheckpoint: (checkpoint: TtsCheckpoint | null) => void
  setActivePara: (paraIdx: number | null) => void
  setActiveSentence: (sentence: string) => void
  setFocusedPara: (target: { chapterIndex: number; paragraphIndex: number } | null) => void
  triggerResumeTts: (targetBookId?: string) => void
  clearResumeRequest: () => void
  triggerTogglePlayPause: () => void
  triggerOpenTtsModal: () => void
  setListeningCapsuleDismissed: (dismissed: boolean) => void
}

export const useTtsStore = create<TtsStoreState>((set) => ({
  audioStatus: {
    active: false,
    playing: false,
    paused: false,
    loading: false,
    ambientActive: false,
  },
  checkpoint: typeof window !== 'undefined' ? loadGlobalTtsCheckpoint() : null,
  activePara: null,
  focusedPara: null,
  resumeTtsNonce: 0,
  toggleTtsPlayPauseNonce: 0,
  openTtsModalNonce: 0,
  listeningCapsuleDismissed: false,
  activeSentence: '',
  resumeTargetBookId: null,
  resumeRequestTimestamp: 0,

  setAudioStatus: (update) =>
    set((state) => {
      const next = typeof update === 'function' ? update(state.audioStatus) : update
      if (isSameTtsAudioStatus(state.audioStatus, next)) {
        return state
      }
      return { audioStatus: next }
    }),

  setCheckpoint: (checkpoint) => set({ checkpoint }),
  setActivePara: (activePara) => set({ activePara }),
  setActiveSentence: (activeSentence) => set({ activeSentence }),
  setFocusedPara: (focusedPara) => set({ focusedPara }),
  triggerResumeTts: (targetBookId?: string) =>
    set((s) => ({
      resumeTtsNonce: s.resumeTtsNonce + 1,
      resumeTargetBookId: targetBookId || null,
      resumeRequestTimestamp: Date.now(),
    })),
  clearResumeRequest: () => set({ resumeTargetBookId: null, resumeRequestTimestamp: 0 }),
  triggerTogglePlayPause: () => set((s) => ({ toggleTtsPlayPauseNonce: s.toggleTtsPlayPauseNonce + 1 })),
  triggerOpenTtsModal: () => set((s) => ({ openTtsModalNonce: s.openTtsModalNonce + 1 })),
  setListeningCapsuleDismissed: (listeningCapsuleDismissed) => set({ listeningCapsuleDismissed }),
}))
