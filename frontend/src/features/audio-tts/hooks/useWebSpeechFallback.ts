import { useRef, useCallback } from 'react'
import { splitParagraphSentences, cleanTtsSpokenText } from '../helpers'

export function useWebSpeechFallback(ttsRate: number, selectedVoice = '') {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const isCancelledRef = useRef(false)

  const speakParagraphViaWebSpeechFallback = useCallback(
    (
      text: string,
      sessionId: number,
      getActiveSession: () => number,
      onSentenceProgress: (sent: string, pct: number) => void,
      onComplete: () => void
    ) => {
      isCancelledRef.current = false
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        onComplete()
        return
      }
      const sentences = splitParagraphSentences(cleanTtsSpokenText(text))
      if (sentences.length === 0) {
        onComplete()
        return
      }
      const sysVoices = window.speechSynthesis.getVoices?.() || []
      const hasCjk = /[\u4e00-\u9fff]/.test(text)
      const isMale = /male|男|yunjian|yunxi|yunyang|yunxia|brian|andrew|lidan|lingfeizhe/i.test(selectedVoice)
      const matchedSysVoice =
        sysVoices.find((v) => {
          const langMatch = hasCjk ? v.lang.startsWith('zh') : v.lang.startsWith('en')
          if (!langMatch) return false
          const n = v.name.toLowerCase()
          return isMale
            ? n.includes('yunxi') || n.includes('yunjian') || n.includes('kangkang') || n.includes('male') || n.includes('boy')
            : n.includes('xiaoxiao') || n.includes('huihui') || n.includes('yaoyao') || n.includes('female') || n.includes('natural')
        }) ||
        sysVoices.find((v) => (hasCjk ? v.lang.startsWith('zh') : v.lang.startsWith('en')) &&
          (v.name.includes('Natural') || v.name.includes('Xiaoxiao') || v.name.includes('Yunxi') || v.name.includes('Google'))) ||
        sysVoices.find((v) => (hasCjk ? v.lang.startsWith('zh') : v.lang.startsWith('en')))

      let sIdx = 0
      const speakNextSentence = () => {
        if (isCancelledRef.current || sessionId !== getActiveSession()) {
          utteranceRef.current = null
          return
        }
        if (sIdx >= sentences.length) {
          utteranceRef.current = null
          if (!isCancelledRef.current && sessionId === getActiveSession()) {
            onComplete()
          }
          return
        }
        const sent = sentences[sIdx]
        onSentenceProgress(sent, Math.round((sIdx / sentences.length) * 100))
        try {
          const utter = new SpeechSynthesisUtterance(sent)
          utteranceRef.current = utter
          utter.lang = hasCjk ? 'zh-CN' : 'en-US'
          if (matchedSysVoice) utter.voice = matchedSysVoice
          utter.rate = ttsRate
          let finished = false
          const maxWaitMs = Math.max(2500, Math.round((sent.length * 260) / Math.max(0.5, ttsRate)))
          const watchdog = setTimeout(() => {
            if (finished || isCancelledRef.current || sessionId !== getActiveSession()) return
            finished = true
            try { window.speechSynthesis.cancel() } catch { /* ignore */ }
            sIdx += 1
            speakNextSentence()
          }, maxWaitMs)
          utter.onend = () => {
            if (finished) return
            finished = true
            clearTimeout(watchdog)
            if (isCancelledRef.current || sessionId !== getActiveSession()) return
            sIdx += 1
            speakNextSentence()
          }
          utter.onerror = (e) => {
            if (finished) return
            finished = true
            clearTimeout(watchdog)
            if (isCancelledRef.current || sessionId !== getActiveSession()) return
            if (e.error === 'canceled' || e.error === 'interrupted') return
            sIdx += 1
            speakNextSentence()
          }
          window.speechSynthesis.speak(utter)
        } catch {
          if (!isCancelledRef.current) onComplete()
        }
      }
      try { window.speechSynthesis.cancel() } catch { /* ignore */ }
      speakNextSentence()
    },
    [ttsRate, selectedVoice]
  )

  const cancelFallback = useCallback(() => {
    isCancelledRef.current = true
    utteranceRef.current = null
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel() } catch { /* ignore */ }
    }
  }, [])

  return { utteranceRef, speakParagraphViaWebSpeechFallback, cancelFallback }
}
