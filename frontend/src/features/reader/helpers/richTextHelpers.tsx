import React from 'react'

export interface RichTextStyle {
  bold?: boolean
  italic?: boolean
  mark?: boolean
  code?: boolean
  strike?: boolean
  kbd?: boolean
  sup?: boolean
  sub?: boolean
}

export interface RichTextRun {
  text: string
  styles: RichTextStyle
}

export const INLINE_RICH_PATTERN =
  /(\*\*(?:[^*]+?)\*\*|__(?:[^_]+?)__|<b>.*?<\/b>|<strong>.*?<\/strong>|==(?:[^=]+?)==|<mark>.*?<\/mark>|~~(?:[^~]+?)~~|<del>.*?<\/del>|<s>.*?<\/s>|`[^`]+?`|<code>.*?<\/code>|<kbd>.*?<\/kbd>|\*(?:[^*\s][^*]*?)\*|_(?:[^_\s][^_]*?)_|<i>.*?<\/i>|<em>.*?<\/em>|\^(?:[^^]+?)\^|<sup>.*?<\/sup>|~(?:[^~\s][^~]*?)~|<sub>.*?<\/sub>)/g

export function parseSingleTokenToRun(token: string): RichTextRun {
  if (!token) return { text: '', styles: {} }

  if (
    (token.startsWith('**') && token.endsWith('**') && token.length >= 4) ||
    (token.startsWith('__') && token.endsWith('__') && token.length >= 4)
  ) {
    return { text: token.slice(2, -2), styles: { bold: true } }
  }
  if (token.startsWith('<b>') && token.endsWith('</b>')) {
    return { text: token.slice(3, -4), styles: { bold: true } }
  }
  if (token.startsWith('<strong>') && token.endsWith('</strong>')) {
    return { text: token.slice(8, -9), styles: { bold: true } }
  }

  if (token.startsWith('==') && token.endsWith('==') && token.length >= 4) {
    return { text: token.slice(2, -2), styles: { mark: true } }
  }
  if (token.startsWith('<mark>') && token.endsWith('</mark>')) {
    return { text: token.slice(6, -7), styles: { mark: true } }
  }

  if (token.startsWith('~~') && token.endsWith('~~') && token.length >= 4) {
    return { text: token.slice(2, -2), styles: { strike: true } }
  }
  if (token.startsWith('<del>') && token.endsWith('</del>')) {
    return { text: token.slice(5, -6), styles: { strike: true } }
  }
  if (token.startsWith('<s>') && token.endsWith('</s>')) {
    return { text: token.slice(3, -4), styles: { strike: true } }
  }

  if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
    return { text: token.slice(1, -1), styles: { code: true } }
  }
  if (token.startsWith('<code>') && token.endsWith('</code>')) {
    return { text: token.slice(6, -7), styles: { code: true } }
  }

  if (token.startsWith('<kbd>') && token.endsWith('</kbd>')) {
    return { text: token.slice(5, -6), styles: { kbd: true } }
  }

  if (
    (token.startsWith('*') && token.endsWith('*') && token.length >= 2) ||
    (token.startsWith('_') && token.endsWith('_') && token.length >= 2)
  ) {
    return { text: token.slice(1, -1), styles: { italic: true } }
  }
  if (token.startsWith('<i>') && token.endsWith('</i>')) {
    return { text: token.slice(3, -4), styles: { italic: true } }
  }
  if (token.startsWith('<em>') && token.endsWith('</em>')) {
    return { text: token.slice(4, -5), styles: { italic: true } }
  }

  if (token.startsWith('^') && token.endsWith('^') && token.length >= 2) {
    return { text: token.slice(1, -1), styles: { sup: true } }
  }
  if (token.startsWith('<sup>') && token.endsWith('</sup>')) {
    return { text: token.slice(5, -6), styles: { sup: true } }
  }

  if (token.startsWith('~') && token.endsWith('~') && token.length >= 2) {
    return { text: token.slice(1, -1), styles: { sub: true } }
  }
  if (token.startsWith('<sub>') && token.endsWith('</sub>')) {
    return { text: token.slice(5, -6), styles: { sub: true } }
  }

  return { text: token, styles: {} }
}

export function parseRichTextRuns(rawText: string): RichTextRun[] {
  if (!rawText) return []
  const parts = rawText.split(INLINE_RICH_PATTERN)
  if (parts.length === 1) {
    return [{ text: rawText, styles: {} }]
  }

  const runs: RichTextRun[] = []
  for (const part of parts) {
    if (!part) continue
    const run = parseSingleTokenToRun(part)
    if (run.text) {
      runs.push(run)
    }
  }
  return runs
}

export function getRunsPlainText(runs: RichTextRun[]): string {
  let res = ''
  for (let i = 0; i < runs.length; i++) {
    res += runs[i].text
  }
  return res
}

export function sliceRichRuns(runs: RichTextRun[], start: number, end: number): RichTextRun[] {
  if (start >= end) return []
  const sliced: RichTextRun[] = []
  let cursor = 0

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]
    const runLen = run.text.length
    const runStart = cursor
    const runEnd = cursor + runLen
    cursor = runEnd

    if (runEnd <= start || runStart >= end) {
      continue
    }

    const sliceFrom = Math.max(0, start - runStart)
    const sliceTo = Math.min(runLen, end - runStart)
    const subText = run.text.slice(sliceFrom, sliceTo)
    if (subText) {
      sliced.push({ text: subText, styles: run.styles })
    }
  }

  return sliced
}

export function wrapWithRichStyles(
  node: React.ReactNode,
  styles: RichTextStyle,
  key: string
): React.ReactNode {
  let current = node
  if (styles.bold) {
    current = (
      <strong key={`${key}-b`} className="font-bold tracking-tight text-inherit">
        {current}
      </strong>
    )
  }
  if (styles.italic) {
    current = (
      <em key={`${key}-i`} className="italic opacity-90 text-inherit font-serif">
        {current}
      </em>
    )
  }
  if (styles.mark) {
    current = (
      <mark
        key={`${key}-m`}
        className="bg-amber-400/30 dark:bg-amber-400/25 px-1 py-0.5 rounded text-inherit font-medium border-b border-amber-500/40"
      >
        {current}
      </mark>
    )
  }
  if (styles.code) {
    current = (
      <code
        key={`${key}-c`}
        className="font-mono text-[0.88em] px-1.5 py-0.5 mx-0.5 rounded-md bg-current/10 border border-current/10 text-pink-600 dark:text-pink-400"
      >
        {current}
      </code>
    )
  }
  if (styles.strike) {
    current = (
      <del key={`${key}-s`} className="line-through opacity-60 text-inherit">
        {current}
      </del>
    )
  }
  if (styles.kbd) {
    current = (
      <kbd
        key={`${key}-k`}
        className="font-mono text-[0.82em] px-1.5 py-0.5 mx-0.5 rounded-md bg-current/10 border border-current/20 shadow-2xs"
      >
        {current}
      </kbd>
    )
  }
  if (styles.sup) {
    current = (
      <sup key={`${key}-sup`} className="text-[0.75em] top-[-0.3em] relative">
        {current}
      </sup>
    )
  }
  if (styles.sub) {
    current = (
      <sub key={`${key}-sub`} className="text-[0.75em] bottom-[-0.2em] relative">
        {current}
      </sub>
    )
  }
  return current
}

export function renderRunWithKeyword(
  text: string,
  styles: RichTextRun['styles'],
  keyPrefix: string,
  keyword?: string
): React.ReactNode {
  if (!keyword || !text.includes(keyword)) {
    return wrapWithRichStyles(text, styles, keyPrefix)
  }
  const parts = text.split(keyword)
  const nodes: React.ReactNode[] = []
  parts.forEach((p, idx) => {
    if (idx > 0) {
      nodes.push(
        <mark key={`${keyPrefix}-kw-${idx}`} className="bg-amber-300 text-slate-950 font-bold px-0.5 rounded">
          {wrapWithRichStyles(keyword, styles, `${keyPrefix}-kwt-${idx}`)}
        </mark>
      )
    }
    if (p) {
      nodes.push(
        <React.Fragment key={`${keyPrefix}-p-${idx}`}>
          {wrapWithRichStyles(p, styles, `${keyPrefix}-pt-${idx}`)}
        </React.Fragment>
      )
    }
  })
  return <React.Fragment key={keyPrefix}>{nodes}</React.Fragment>
}
