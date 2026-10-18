import React, { useMemo } from 'react'
import { useTtsStore } from '../../../stores/ttsStore'

interface KtvSentenceHighlightProps {
  sentenceText: string
  fallbackContent?: React.ReactNode
}

/**
 * KTV 式逐字跟随渲染组件：
 * 细粒度订阅当前朗读句子的播放进度，呈现从左向右毫秒级流光点亮、焦点字微缩放跃动的卡拉OK跟随体验。
 */
export const KtvSentenceHighlight: React.FC<KtvSentenceHighlightProps> = ({
  sentenceText,
  fallbackContent,
}) => {
  // 仅在当前组件内部细粒度订阅高频进度，彻底杜绝外层非活跃段落的级联渲染
  const sentenceProgress = useTtsStore((s) => s.sentenceProgress)

  const chars = useMemo(() => Array.from(sentenceText || ''), [sentenceText])

  if (chars.length === 0) {
    return fallbackContent ? <>{fallbackContent}</> : null
  }

  const total = chars.length
  // 计算当前发音所在的字符下标 (0 ~ total)
  const cutIndex = Math.max(0, Math.min(total, Math.floor(sentenceProgress * total)))

  return (
    <span
      className="reader-tts-active-sentence reader-ktv-sentence-wrapper"
      data-tts-sentence-active="true"
      data-tts-ktv-active="true"
    >
      {chars.map((ch, idx) => {
        let charClass = 'reader-ktv-char-unplayed'
        let isCurrent = false

        if (idx < cutIndex) {
          charClass = 'reader-ktv-char-played'
        } else if (idx === cutIndex) {
          charClass = 'reader-ktv-char-current'
          isCurrent = true
        }

        return (
          <span
            key={idx}
            className={`reader-ktv-char ${charClass}`}
            data-ktv-current={isCurrent ? 'true' : undefined}
          >
            {ch}
          </span>
        )
      })}
    </span>
  )
}
