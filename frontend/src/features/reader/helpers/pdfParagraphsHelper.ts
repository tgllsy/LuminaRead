export function buildPageParagraphsMap(paragraphs: string[]): Map<number, { pIdx: number; text: string }[]> {
  const map = new Map<number, { pIdx: number; text: string }[]>()
  let curPage = 1
  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i].trim()
    const markerMatch = text.match(/^\[\[PDF_PAGE:(\d+)\]\]$/i)
    if (markerMatch) {
      curPage = Number(markerMatch[1])
      continue
    }
    if (text) {
      let list = map.get(curPage)
      if (!list) {
        list = []
        map.set(curPage, list)
      }
      list.push({ pIdx: i, text })
    }
  }
  return map
}
