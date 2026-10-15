import { useState, useMemo } from 'react'

export function useTtsPlaybackState() {
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const [ttsPaused, setTtsPaused] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [paraProgress, setParaProgress] = useState(0)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [durationSec, setDurationSec] = useState(0)
  const [activeSentenceSnippet, setActiveSentenceSnippet] = useState('')

  return useMemo(
    () => ({
      ttsPlaying,
      setTtsPlaying,
      ttsPaused,
      setTtsPaused,
      ttsLoading,
      setTtsLoading,
      paraProgress,
      setParaProgress,
      currentTimeSec,
      setCurrentTimeSec,
      durationSec,
      setDurationSec,
      activeSentenceSnippet,
      setActiveSentenceSnippet,
    }),
    [ttsPlaying, ttsPaused, ttsLoading, paraProgress, currentTimeSec, durationSec, activeSentenceSnippet]
  )
}
