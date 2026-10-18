import { useEffect, useRef } from 'react'
import { useTtsStore } from '../../../stores/ttsStore'

interface UseTtsReadingFollowOptions {
  activeBookId?: string
  chapterIndex: number
  ttsActivePara: number | null
  activeSentence?: string
  paragraphRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  isContinuousSingleScroll: boolean
  isTtsPlaying?: boolean
  isHidden?: boolean
}

/**
 * 听书沉浸阅读视口跟随 Hook：
 * 当处于单栏平滑滚动阅读模式且正在朗读时，自动将正在播放的段落与 KTV 高亮句子平滑滚动至视口中央黄金阅读区。
 * 同时具备用户主动滚动保护机制（用户手动翻查时暂停吸附 2.5 秒）。
 */
export function useTtsReadingFollow({
  activeBookId,
  chapterIndex,
  ttsActivePara,
  activeSentence: propActiveSentence,
  paragraphRefs,
  isContinuousSingleScroll,
  isTtsPlaying: propIsTtsPlaying,
  isHidden = false,
}: UseTtsReadingFollowOptions) {
  const storeActiveSentence = useTtsStore((s) => s.activeSentence)
  const storeIsPlaying = useTtsStore((s) => s.audioStatus.playing)
  const activeSentence = propActiveSentence ?? storeActiveSentence
  const isTtsPlaying = propIsTtsPlaying ?? storeIsPlaying
  const lastUserScrollTimeRef = useRef(0)

  // 监听用户主动滚动，避免跟用户抢夺视口控制权
  useEffect(() => {
    if (isHidden || !isTtsPlaying) return

    const onUserScroll = () => {
      lastUserScrollTimeRef.current = Date.now()
    }

    window.addEventListener('wheel', onUserScroll, { passive: true })
    window.addEventListener('touchmove', onUserScroll, { passive: true })
    return () => {
      window.removeEventListener('wheel', onUserScroll)
      window.removeEventListener('touchmove', onUserScroll)
    }
  }, [isHidden, isTtsPlaying])

  // 当朗读段落或活跃句子变化时，平滑跟随对齐
  useEffect(() => {
    if (isHidden || !isContinuousSingleScroll || !isTtsPlaying || ttsActivePara === null) return

    // 用户在 2.5 秒内刚刚手动滚动过，暂时不自动吸附
    if (Date.now() - lastUserScrollTimeRef.current < 2500) return

    const timer = setTimeout(() => {
      const activeEl = document.querySelector<HTMLElement>('[data-tts-sentence-active="true"]')
      const targetEl = activeEl || paragraphRefs.current[ttsActivePara]
      if (!targetEl) return

      const rect = targetEl.getBoundingClientRect()
      const vh = window.innerHeight
      const isOutOfComfortZone = rect.top < 80 || rect.bottom > vh - 100

      if (isOutOfComfortZone) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 120)

    return () => clearTimeout(timer)
  }, [activeBookId, chapterIndex, ttsActivePara, activeSentence, isContinuousSingleScroll, isTtsPlaying, isHidden, paragraphRefs])
}
