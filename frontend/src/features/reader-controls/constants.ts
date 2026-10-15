import type { ReaderTypography, HighlightItem } from '../../types'
import type {
  FontItem,
  ThemeColorOption,
  BgTextureOption,
  HighlightColorItem,
  HighlightStyleItem,
} from './types'

export const FONTS: readonly FontItem[] = [
  {
    id: 'kaiti',
    label: '霞鹜文楷 · 温润书卷',
    shortLabel: '霞鹜文楷',
    className: 'reader-font-kaiti',
  },
  {
    id: 'serif',
    label: '思源宋体 · 经典衬线',
    shortLabel: '思源宋体',
    className: 'reader-font-serif',
  },
  {
    id: 'sans',
    label: '思源黑体 · 现代无衬线',
    shortLabel: '思源黑体',
    className: 'reader-font-sans',
  },
  {
    id: 'fangsong',
    label: '文鼎仿宋 · 骨力端雅',
    shortLabel: '经典仿宋',
    className: 'reader-font-fangsong',
  },
  {
    id: 'system-sans',
    label: '系统黑体 · 苹方/微黑',
    shortLabel: '系统黑体',
    className: 'reader-font-system-sans',
  },
  {
    id: 'kaiti-classic',
    label: '华文行楷 · 书斋笔韵',
    shortLabel: '华文楷体',
    className: 'reader-font-kaiti-classic',
  },
  {
    id: 'mono',
    label: 'JetBrains · 技术等宽',
    shortLabel: '等宽代码',
    className: 'reader-font-mono',
  },
] as const

export const FONT_SIZE_BOUNDS = {
  min: 14,
  max: 28,
  step: 1,
} as const

export const PAGE_WIDTH_BOUNDS = {
  min: 640,
  max: 1120,
  step: 80,
} as const

export const LINE_HEIGHT_BOUNDS = {
  min: 1.15,
  max: 2.2,
  step: 0.05,
  stepLarge: 0.1,
} as const

export const BRIGHTNESS_BOUNDS = {
  min: 55,
  max: 100,
  step: 1,
} as const

export const THEME_COLOR_OPTIONS: readonly ThemeColorOption[] = [
  {
    theme: 'light',
    bgTexture: 'plain',
    label: '纯白主题',
    bgClass: 'bg-white',
    borderActive: 'border-2 border-[#1b88ee] shadow-xs',
    borderNormal: 'border border-slate-200/90 hover:border-slate-300',
  },
  {
    theme: 'parchment',
    bgTexture: 'plain',
    label: '暖黄羊皮纸主题',
    bgClass: 'bg-[#f3ead8]',
    borderActive: 'border-2 border-[#1b88ee] shadow-xs',
    borderNormal: 'border border-[#e6dac3]',
  },
  {
    theme: 'sepia_green',
    bgTexture: 'plain',
    label: '护眼豆沙绿主题',
    bgClass: 'bg-[#d6ebd2]',
    borderActive: 'border-2 border-[#1b88ee] shadow-xs',
    borderNormal: 'border border-[#c1dfc0]',
  },
  {
    theme: 'dark',
    bgTexture: 'plain',
    label: '深邃暗夜主题',
    bgClass: 'bg-[#0a0b0d]',
    borderActive: 'border-2 border-[#1b88ee] shadow-xs',
    borderNormal: 'border border-slate-800',
    showMoonIcon: true,
  },
] as const

export const BG_TEXTURE_OPTIONS: readonly BgTextureOption[] = [
  {
    theme: 'light',
    bgTexture: 'plain',
    title: '纯净白纸',
    bgClass: 'bg-white',
    borderActive: 'border-2 border-[#1b88ee]',
    borderNormal: 'border border-slate-200/90',
  },
  {
    theme: 'light',
    bgTexture: 'paper',
    title: '宣纸肌理',
    bgClass: 'bg-[#f5f4f0]',
    borderActive: 'border-2 border-[#1b88ee]',
    borderNormal: 'border border-slate-200/80',
  },
  {
    theme: 'eink',
    bgTexture: 'grain',
    title: 'E-Ink 墨水屏零残影模式',
    bgClass: 'bg-[#f1f3f5]',
    borderActive: 'border-2 border-[#1b88ee] font-bold text-[#1b88ee]',
    borderNormal: 'border border-slate-200/80',
    badgeText: 'E-Ink',
  },
  {
    theme: 'parchment',
    bgTexture: 'dune',
    title: '暖阳沙丘',
    bgClass: 'bg-gradient-to-b from-[#f9f2ec] via-[#f2dfd0] to-[#e5cbb4]',
    borderActive: 'border-2 border-[#1b88ee]',
    borderNormal: 'border border-[#e5d2c0]',
  },
  {
    theme: 'light',
    bgTexture: 'moonlight',
    title: '静谧月夜',
    bgClass: 'bg-gradient-to-br from-[#b0cee6] via-[#c2dced] to-[#e2f0f9]',
    borderActive: 'border-2 border-[#1b88ee]',
    borderNormal: 'border border-[#b9d4e8]',
  },
] as const

export const HIGHLIGHT_COLORS: readonly HighlightColorItem[] = [
  { id: 'yellow', label: '暖阳黄', dot: 'bg-amber-400' },
  { id: 'blue', label: '晴空蓝', dot: 'bg-[#1b88ee]' },
  { id: 'pink', label: '樱花粉', dot: 'bg-rose-400' },
  { id: 'green', label: '竹林绿', dot: 'bg-emerald-500' },
  { id: 'purple', label: '丁香紫', dot: 'bg-purple-500' },
] as const

export const HIGHLIGHT_STYLES: readonly HighlightStyleItem[] = [
  { id: 'marker', label: '马克笔' },
  { id: 'wavy', label: '波浪线' },
  { id: 'underline', label: '下划线' },
] as const
