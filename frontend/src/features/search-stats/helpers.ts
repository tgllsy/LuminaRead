import { HEATMAP_LEVEL_STYLES } from './constants'

/**
 * 获取阅读热力图格子对应的颜色样式类
 */
export function getHeatmapLevelColor(level: number): string {
  return HEATMAP_LEVEL_STYLES[level] ?? HEATMAP_LEVEL_STYLES[0]
}

/**
 * 格式化热力图格子的提示文本
 */
export function formatHeatmapTooltip(date: string, minutes: number, words: number): string {
  return `${date}：阅读 ${minutes} 分钟（约 ${words} 字）`
}

/**
 * 格式化书库字数（万字）
 */
export function formatLibraryWords(words: number): string {
  return `${(words / 10000).toFixed(1)} 万字`
}

/**
 * 截取月日短日期展示（如 "2026-10-10" -> "10-10"）
 */
export function formatDateShort(dateStr: string): string {
  return dateStr.slice(5)
}

/**
 * 触发浏览器端下载 Markdown 笔记文件
 */
export function downloadMarkdownFile(markdown: string, filename: string = '读书笔记.md'): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
