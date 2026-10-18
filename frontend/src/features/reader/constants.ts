import type { ReaderTypography, HighlightItem } from './types'

export const TYPOGRAPHY_STORAGE_KEY = 'luminaread_typography_v1'
export const SIDEBAR_PIN_STORAGE_KEY = 'luminaread_sidebar_pinned_v1'
export const SIDEBAR_DOCK_SIDE_KEY = 'luminaread_sidebar_dock_side_v1'
export const COPILOT_LAYOUT_KEY = 'luminaread_copilot_layout_v1'

export const DEFAULT_TYPOGRAPHY: ReaderTypography = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 19,
  lineHeight: 1.65,
  layoutMode: 'single',
  pageWidth: 880,
  bilingualMode: false,
  brightness: 100,
  firstLineIndent: true,
  bgTexture: 'plain',
  continuousScroll: true,
  pageTurnAnimation: 'curl',
  eInkMode: false,
  wpmReadingSpeed: 400,
  dropCap: false,
}

export const THEME_STYLES: Record<
  ReaderTypography['theme'],
  { outer: string; page: string; header: string; subtext: string }
> = {
  light: {
    outer: 'bg-slate-100 text-slate-900',
    page: 'bg-white text-slate-900 border-slate-200 shadow-sm',
    header: 'bg-white/90 border-slate-200 text-slate-900',
    subtext: 'text-slate-500',
  },
  sepia_green: {
    outer: 'bg-[#cde2c0] text-[#1b2e1b]',
    page: 'bg-[#dcecd2] text-[#1b2e1b] border-[#b7d3a8] shadow-sm',
    header: 'bg-[#dcecd2]/95 border-[#b7d3a8] text-[#1b2e1b]',
    subtext: 'text-[#436143]',
  },
  parchment: {
    outer: 'bg-[#eadec9] text-[#382b1e]',
    page: 'bg-[#f6efe2] text-[#382b1e] border-[#decbb1] shadow-sm',
    header: 'bg-[#f6efe2]/95 border-[#decbb1] text-[#382b1e]',
    subtext: 'text-[#755e48]',
  },
  dark: {
    outer: 'bg-slate-950 text-slate-100',
    page: 'bg-slate-900 text-slate-100 border-slate-800 shadow-xl',
    header: 'bg-slate-900/95 border-slate-800 text-slate-100',
    subtext: 'text-slate-400',
  },
  eink: {
    outer: 'bg-white text-black eink-mode',
    page: 'bg-white text-black border border-black/25 shadow-none eink-mode',
    header: 'bg-white border-b border-black/15 text-black eink-mode',
    subtext: 'text-black font-medium',
  },
}

export const BG_TEXTURE_STYLES: Record<
  NonNullable<ReaderTypography['bgTexture']>,
  { outer: string; page: string; header: string; subtext: string } | null
> = {
  plain: null,
  paper: {
    outer: 'bg-[#eae6dc] text-[#2c2620]',
    page: 'bg-[#f5f4f0] text-[#2c2620] border-[#dedad0] shadow-sm',
    header: 'bg-[#f5f4f0]/95 border-[#dedad0] text-[#2c2620]',
    subtext: 'text-[#6e665c]',
  },
  grain: {
    outer: 'bg-white text-black eink-mode',
    page: 'bg-white text-black border border-black/25 shadow-none eink-mode',
    header: 'bg-white border-b border-black/15 text-black eink-mode',
    subtext: 'text-black font-medium',
  },
  dune: {
    outer: 'bg-gradient-to-b from-[#efe3d6] via-[#e8d1be] to-[#dcc0a8] text-[#3a2a1d]',
    page: 'bg-gradient-to-b from-[#f9f2ec] via-[#f2dfd0] to-[#e5cbb4] text-[#3a2a1d] border-[#dec6b0] shadow-sm',
    header: 'bg-[#f7ede4]/95 border-[#dec6b0] text-[#3a2a1d]',
    subtext: 'text-[#755b46]',
  },
  moonlight: {
    outer: 'bg-gradient-to-br from-[#b0cee6] via-[#c2dced] to-[#e2f0f9] text-[#1a2e40]',
    page: 'bg-gradient-to-br from-[#d5e8f6] via-[#e2f0f9] to-[#eef6fc] text-[#1a2e40] border-[#b9d4e8] shadow-sm',
    header: 'bg-[#dcecf8]/95 border-[#b9d4e8] text-[#1a2e40]',
    subtext: 'text-[#486884]',
  },
}

export function getEffectiveThemeStyle(typography: Pick<ReaderTypography, 'theme' | 'bgTexture'>) {
  if (typography.theme === 'eink') {
    return THEME_STYLES.eink
  }
  if (typography.bgTexture && typography.bgTexture !== 'plain') {
    const texStyle = BG_TEXTURE_STYLES[typography.bgTexture]
    if (texStyle) return texStyle
  }
  return THEME_STYLES[typography.theme] || THEME_STYLES.light
}

export const HIGHLIGHT_CLASSES: Record<
  HighlightItem['color'],
  Record<HighlightItem['style_type'], string>
> = {
  yellow: {
    marker: 'bg-amber-200/85 text-slate-950 dark:bg-amber-400/25 dark:text-amber-200 rounded px-1 py-0.5',
    wavy: 'underline decoration-wavy decoration-amber-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
    underline: 'underline decoration-amber-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
  },
  blue: {
    marker: 'bg-blue-200/85 text-slate-950 dark:bg-blue-400/25 dark:text-blue-200 rounded px-1 py-0.5',
    wavy: 'underline decoration-wavy decoration-blue-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
    underline: 'underline decoration-blue-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
  },
  pink: {
    marker: 'bg-rose-200/85 text-slate-950 dark:bg-rose-400/25 dark:text-rose-200 rounded px-1 py-0.5',
    wavy: 'underline decoration-wavy decoration-rose-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
    underline: 'underline decoration-rose-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
  },
  green: {
    marker: 'bg-emerald-200/85 text-slate-950 dark:bg-emerald-400/25 dark:text-emerald-200 rounded px-1 py-0.5',
    wavy: 'underline decoration-wavy decoration-emerald-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
    underline: 'underline decoration-emerald-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
  },
  purple: {
    marker: 'bg-purple-200/85 text-slate-950 dark:bg-purple-400/25 dark:text-purple-200 rounded px-1 py-0.5',
    wavy: 'underline decoration-wavy decoration-purple-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
    underline: 'underline decoration-purple-500 decoration-2 underline-offset-4 rounded-xs px-0.5',
  },
}

export const FONT_FAMILY_MAP: Record<ReaderTypography['fontFamily'], string> = {
  kaiti:
    '"LXGW WenKai Screen", "LXGW WenKai GB Screen", "LXGW WenKai", "STKaiti", "华文楷体", "KaiTi", "楷体", "Kaiti SC", "DFKai-SB", "FZKai-Z03S", "AR PL UKai CN", cursive, serif',
  serif:
    '"Noto Serif SC", "Source Han Serif SC", "思源宋体", "Songti SC", "宋体-简", "STSong", "华文宋体", "SimSun", "宋体", "NSimSun", Georgia, "Times New Roman", serif',
  sans:
    '"Noto Sans SC", "Source Han Sans SC", "思源黑体", "PingFang SC", "苹方-简", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", "WenQuanYi Micro Hei", system-ui, -apple-system, sans-serif',
  fangsong:
    '"FangSong", "仿宋", "STFangsong", "华文仿宋", "FangSong_GB2312", "仿宋_GB2312", "FZFangSong-Z02S", "Songti SC", "SimSun", "宋体", serif',
  'system-sans':
    'system-ui, -apple-system, "PingFang SC", "苹方-简", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  'kaiti-classic':
    '"STKaiti", "华文楷体", "KaiTi", "楷体", "STXingkai", "华文行楷", "Kaiti SC", "BiauKai", "DFKai-SB", "FZKai-Z03S", cursive, serif',
  mono:
    '"JetBrains Mono Variable", "JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "Noto Sans SC", monospace',
}

export const FONT_CLASS_MAP: Record<ReaderTypography['fontFamily'], string> = {
  kaiti: 'reader-font-kaiti',
  serif: 'reader-font-serif',
  sans: 'reader-font-sans',
  fangsong: 'reader-font-fangsong',
  'system-sans': 'reader-font-system-sans',
  'kaiti-classic': 'reader-font-kaiti-classic',
  mono: 'reader-font-mono',
}

export const CIRCLED_NUMS = [
  '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
  '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳',
]

export const PAREN_NUMS = [
  '⑴', '⑵', '⑶', '⑷', '⑸', '⑹', '⑺', '⑻', '⑼', '⑽',
  '⑾', '⑿', '⒀', '⒁', '⒂', '⒃', '⒄', '⒅', '⒆', '⒇',
]
