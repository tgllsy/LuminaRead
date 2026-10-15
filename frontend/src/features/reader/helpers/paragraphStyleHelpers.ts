import type { ParagraphSemanticStyle } from '../types'

export function getParagraphClassName(
  semanticStyle: ParagraphSemanticStyle,
  isRefDivider: boolean,
  isSmallPrintRef: boolean,
  shouldIndent: boolean,
  isDropCap?: boolean
): string {
  if (isRefDivider) {
    return 'font-bold text-sm tracking-wider uppercase opacity-75 pt-4 border-t border-current/15'
  }
  if (isSmallPrintRef) {
    return 'text-justify tracking-normal opacity-85'
  }
  if (isDropCap) {
    return 'indent-0 reader-drop-cap text-justify tracking-wide'
  }
  switch (semanticStyle) {
    case 'heading_1':
      return 'indent-0 font-bold text-[1.4em] sm:text-[1.48em] leading-snug tracking-tight pt-5 pb-2 border-b-2 border-current/15 mb-3 text-slate-900 dark:text-slate-50'
    case 'heading_2':
      return 'indent-0 font-bold text-[1.24em] sm:text-[1.3em] leading-snug tracking-tight pt-4 pb-1.5 pl-3.5 border-l-4 border-blue-600 dark:border-blue-400 mb-2'
    case 'heading_3':
      return 'indent-0 font-semibold text-[1.14em] sm:text-[1.18em] leading-snug tracking-tight pt-3.5 pb-1 pl-3 border-l-3 border-indigo-500/80 dark:border-indigo-400/80 mb-1.5'
    case 'subheading':
      return 'indent-0 font-semibold text-[1.08em] tracking-tight pt-3 pb-1 pl-3 border-l-2.5 border-current/40 mb-1'
    case 'caption':
      return 'indent-0 text-center text-[0.86em] opacity-80 font-medium py-1.5 px-3 my-1.5 mx-auto max-w-xl bg-current/[0.025] rounded-lg'
    case 'attribution':
      return 'indent-0 text-right italic opacity-75 pr-3 text-[0.9em] my-1 font-serif'
    case 'blockquote':
      return 'indent-0 pl-4 py-2.5 my-2.5 border-l-4 border-amber-500/70 dark:border-amber-400/60 bg-amber-500/[0.04] dark:bg-amber-400/[0.03] rounded-r-xl italic text-justify shadow-2xs'
    case 'list_item':
      return 'indent-0 pl-6 text-justify tracking-wide py-0.5'
    case 'code_block':
      return 'indent-0 font-mono text-[0.88em] py-1'
    case 'meta_line':
      return 'indent-0 font-mono text-[0.84em] opacity-75 py-0.5'
    default:
      return `${shouldIndent ? 'reader-para-indent' : 'indent-0'} text-justify tracking-wide`
  }
}
