export interface PaginationInput {
  reqId: number
  paragraphs: string[]
  fontSize: number
  lineHeight: number
  pageWidth: number
  firstLineIndent?: boolean
  bilingualMode?: boolean
  windowWidth: number
  windowHeight: number
  isSingleCol?: boolean
  pdfMode?: string
}

export interface PageSliceItem {
  pIdx: number
  sliceStart?: number
  sliceEnd?: number
  isContinuation?: boolean
}

export interface PageSpread {
  left: PageSliceItem[]
  right: PageSliceItem[]
  leftPageNum: number
  rightPageNum: number
  totalPages: number
}

export interface PaginationOutput {
  reqId: number
  spreads: PageSpread[]
}

export type ParagraphSemanticStyle =
  | 'normal'
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'subheading'
  | 'caption'
  | 'attribution'
  | 'blockquote'
  | 'list_item'
  | 'code_block'
  | 'divider'
  | 'meta_line'

export interface PageLayoutMetrics {
  dualCardWidth: number
  singleColWidthPx: number
  charsPerLine: number
  lineHeightPx: number
  paraGapPx: number
  colBodyHeightPx: number
}
