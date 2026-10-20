import { useTtsStore } from '../../stores/ttsStore'

export function useAppTtsSlice() {
  const audioStatus = useTtsStore((s) => s.audioStatus)
  const checkpoint = useTtsStore((s) => s.checkpoint)
  const resumeTtsNonce = useTtsStore((s) => s.resumeTtsNonce)
  const toggleTtsPlayPauseNonce = useTtsStore((s) => s.toggleTtsPlayPauseNonce)
  const openTtsModalNonce = useTtsStore((s) => s.openTtsModalNonce)
  const listeningCapsuleDismissed = useTtsStore((s) => s.listeningCapsuleDismissed)
  const setAudioStatus = useTtsStore((s) => s.setAudioStatus)
  const setCheckpoint = useTtsStore((s) => s.setCheckpoint)
  const triggerResumeTts = useTtsStore((s) => s.triggerResumeTts)
  const triggerTogglePlayPause = useTtsStore((s) => s.triggerTogglePlayPause)
  const triggerOpenTtsModal = useTtsStore((s) => s.triggerOpenTtsModal)
  const setListeningCapsuleDismissed = useTtsStore((s) => s.setListeningCapsuleDismissed)

  return {
    audioStatus,
    checkpoint,
    resumeTtsNonce,
    toggleTtsPlayPauseNonce,
    openTtsModalNonce,
    listeningCapsuleDismissed,
    setAudioStatus,
    setCheckpoint,
    triggerResumeTts,
    triggerTogglePlayPause,
    triggerOpenTtsModal,
    setListeningCapsuleDismissed,
  }
}
