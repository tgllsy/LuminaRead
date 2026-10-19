import React, { useMemo } from 'react'
import { useTtsStore } from '../../../stores/ttsStore'
import {
  parseRichTextRuns,
  getRunsPlainText,
  sliceRichRuns,
  type RichTextRun,
} from '../../reader/helpers/richTextHelpers'
import { findSentenceRangeInText } from '../helpers/sentenceIndexer'
import { KtvSentenceHighlight } from '../../reader/components/KtvSentenceHighlight'

interface KaraokeParagraphContentProps {
  paraText: string
  isActive: boolean
  className?: string
}

function renderRuns(runs: RichTextRun[], keyPrefix: string): React.ReactNode {
  return runs.map((run, i) => {
    let content: React.ReactNode = run.text
    if (run.styles.sup) {
      return (
        <sup
          key={`${keyPrefix}-${i}`}
          className="text-[0.7em] text-amber-300 font-semibold px-0.5 align-super select-none"
        >
          {content}
        </sup>
      )
    }
    if (run.styles.sub) {
      return (
        <sub key={`${keyPrefix}-${i}`} className="text-[0.7em] opacity-75 align-sub">
          {content}
        </sub>
      )
    }
    if (run.styles.bold) {
      content = <strong className="font-bold text-white">{content}</strong>
    }
    if (run.styles.italic) {
      content = <em className="italic">{content}</em>
    }
    if (run.styles.code) {
      content = (
        <code className="font-mono text-amber-300 text-[0.88em] px-1 bg-white/10 rounded">
          {content}
        </code>
      )
    }
    if (run.styles.mark) {
      content = <mark className="bg-amber-400/25 px-1 rounded text-inherit">{content}</mark>
    }
    if (run.styles.strike) {
      content = <del className="line-through opacity-60">{content}</del>
    }
    return <React.Fragment key={`${keyPrefix}-${i}`}>{content}</React.Fragment>
  })
}

export const KaraokeParagraphContent: React.FC<KaraokeParagraphContentProps> = ({
  paraText,
  isActive,
  className = '',
}) => {
  const activeSentence = useTtsStore((s) => s.activeSentence)

  const sanitizedText = useMemo(() => {
    let t = (paraText || '').replace(/^>+\s*/, '')
    t = t.replace(/\^\(([^\)]+)\)/g, '^($1)^')
    return t
  }, [paraText])

  const runs = useMemo(() => parseRichTextRuns(sanitizedText), [sanitizedText])
  const plainText = useMemo(() => getRunsPlainText(runs), [runs])

  const ttsRange = useMemo(() => {
    if (!isActive || !activeSentence) return null
    return findSentenceRangeInText(plainText, activeSentence)
  }, [isActive, activeSentence, plainText])

  if (!isActive) {
    return <span className={className}>{renderRuns(runs, 'idle')}</span>
  }

  if (ttsRange) {
    const preRuns = sliceRichRuns(runs, 0, ttsRange.start)
    const activeSentenceText = plainText.slice(ttsRange.start, ttsRange.end)
    const postRuns = sliceRichRuns(runs, ttsRange.end, plainText.length)

    return (
      <span className={className}>
        {preRuns.length > 0 && (
          <span className="text-slate-300/80 transition-opacity">
            {renderRuns(preRuns, 'pre')}
          </span>
        )}
        <KtvSentenceHighlight sentenceText={activeSentenceText} />
        {postRuns.length > 0 && (
          <span className="text-slate-400/80 transition-opacity">
            {renderRuns(postRuns, 'post')}
          </span>
        )}
      </span>
    )
  }

  return (
    <span className={className}>
      <span className="text-white font-medium">{renderRuns(runs, 'active-full')}</span>
    </span>
  )
}
