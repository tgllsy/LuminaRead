import type React from 'react'

export function computeDragStyle(
  dragOffset: number,
  animType: string,
  isDragging: boolean
): React.CSSProperties {
  if (animType === 'instant') {
    return { transition: 'none' }
  }

  if (isDragging) {
    if (animType === 'curl') {
      const deg = Math.max(-36, Math.min(36, (dragOffset / 280) * 28))
      const shadowX = Math.min(28, Math.abs(dragOffset) * 0.14)
      return {
        transform: `perspective(1400px) rotateY(${deg}deg)`,
        transformOrigin: dragOffset < 0 ? 'left center' : 'right center',
        boxShadow:
          dragOffset < 0
            ? `-${shadowX}px 0 28px rgba(0, 0, 0, 0.22)`
            : `${shadowX}px 0 28px rgba(0, 0, 0, 0.22)`,
        transition: 'none',
        willChange: 'transform, box-shadow',
      }
    }
    return {
      transform: `translate3d(${dragOffset}px, 0, 0)`,
      transition: 'none',
      willChange: 'transform',
    }
  }

  if (dragOffset !== 0) {
    return {
      transform: 'translate3d(0, 0, 0)',
      transition: 'transform 240ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 240ms ease',
    }
  }

  return {}
}

export function getPageTurnAnimClass(
  animType: string,
  turnDirection: 'prev' | 'next' | null
): string {
  if (!turnDirection || animType === 'instant') return ''
  if (animType === 'curl') {
    return turnDirection === 'next' ? 'page-turn-curl-next' : 'page-turn-curl-prev'
  }
  return turnDirection === 'next' ? 'page-turn-slide-next' : 'page-turn-slide-prev'
}
