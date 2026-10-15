export type ReaderFontFamily =
  | 'serif'
  | 'kaiti'
  | 'sans'
  | 'fangsong'
  | 'system-sans'
  | 'kaiti-classic'
  | 'mono'

export interface ReaderTypography {
  theme: 'light' | 'sepia_green' | 'parchment' | 'dark' | 'eink'
  fontFamily: ReaderFontFamily
  fontSize: number
  lineHeight: number
  layoutMode: 'dual' | 'single'
  pageWidth: number
  bilingualMode: boolean
  brightness?: number
  firstLineIndent?: boolean
  continuousScroll?: boolean
  bgTexture?: 'plain' | 'paper' | 'grain' | 'dune' | 'moonlight'
  pageTurnAnimation?: 'instant' | 'slide' | 'curl'
  wpmReadingSpeed?: number
  eInkMode?: boolean
  dropCap?: boolean
  chineseVariant?: 'original' | 'simplified' | 'traditional'
}


