export interface ParsedTableData {
  title?: string
  headers: string[]
  rows: string[][]
}

export interface ParsedPoetryData {
  title?: string
  author?: string
  lines: string[]
}

export interface ParsedBlockquoteData {
  text: string
  author?: string
}

export function parseTableMarker(rawText: string): ParsedTableData | null {
  const trimmed = String(rawText || '').trim()
  let content = ''
  const match = trimmed.match(/^\[\[TABLE:([\s\S]+?)\]\]$/i)
  if (match) {
    content = match[1].trim()
  } else if (trimmed.startsWith('|') && trimmed.includes('\n') && trimmed.includes('|')) {
    content = trimmed
  } else {
    return null
  }

  const rawLines = content.split(/\r?\n|;;|\\\\|<br\s*\/?>/).map((l) => l.trim()).filter(Boolean)
  if (rawLines.length === 0) return null

  let title: string | undefined
  let startIdx = 0

  const firstLine = rawLines[0]
  if (/^title\s*[:=]/i.test(firstLine)) {
    title = firstLine.replace(/^title\s*[:=]\s*/i, '').trim()
    startIdx = 1
  }

  const tableLines: string[][] = []
  for (let i = startIdx; i < rawLines.length; i++) {
    const line = rawLines[i]
    if (/^[|\s\-:—]+$/.test(line) && line.includes('-')) {
      continue
    }
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split(/\||\t/)
      .map((c) => c.trim())
    if (cells.length > 0 && cells.some(Boolean)) {
      tableLines.push(cells)
    }
  }

  if (tableLines.length === 0) return null

  const headers = tableLines[0]
  const rows = tableLines.slice(1)

  return { title, headers, rows }
}

export function parsePoetryMarker(rawText: string): ParsedPoetryData | null {
  const trimmed = String(rawText || '').trim()
  const match = trimmed.match(/^\[\[POETRY:([\s\S]+?)\]\]$/i)
  if (match) {
    const content = match[1].trim()
    const rawLines = content.split(/\r?\n|;;|\\\\|<br\s*\/?>/).map((l) => l.trim()).filter(Boolean)
    if (rawLines.length === 0) return null

    let title: string | undefined
    let author: string | undefined
    const lines: string[] = []

    for (const line of rawLines) {
      if (/^title\s*[:=]/i.test(line)) {
        title = line.replace(/^title\s*[:=]\s*/i, '').trim()
      } else if (/^author\s*[:=]/i.test(line)) {
        author = line.replace(/^author\s*[:=]\s*/i, '').trim()
      } else {
        lines.push(line)
      }
    }
    return { title, author, lines }
  }

  const rawLines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (
    rawLines.length >= 2 &&
    rawLines.length <= 12 &&
    rawLines.every((l) => l.length >= 4 && l.length <= 28 && !l.startsWith('#') && !l.startsWith('|'))
  ) {
    return { lines: rawLines }
  }

  return null
}

export function parseBlockquoteMarker(rawText: string): ParsedBlockquoteData | null {
  const trimmed = String(rawText || '').trim()
  let content = ''

  const match = trimmed.match(/^\[\[BLOCKQUOTE:([\s\S]+?)\]\]$/i)
  if (match) {
    content = match[1].trim()
  } else if (trimmed.startsWith('> ') || trimmed.startsWith('》') || (trimmed.startsWith('“') && trimmed.includes('——'))) {
    content = trimmed.replace(/^>\s*/, '').trim()
  } else {
    return null
  }

  const authorMatch = content.match(/(?:——|—{2,}|―{2,}|--\s*)\s*([^—\n]+)$/)
  if (authorMatch) {
    const author = authorMatch[1].trim()
    const text = content.slice(0, authorMatch.index).trim()
    return { text, author }
  }

  return { text: content }
}
