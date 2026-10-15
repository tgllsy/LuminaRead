import type { ReaderTypography } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'

export function useReaderTypographyState(isDesktop: boolean) {
  const typography = useTypographyStore((s) => s.typography)
  const setTypography = useTypographyStore((s) => s.setTypography)

  const effectiveLayoutMode: ReaderTypography['layoutMode'] = isDesktop
    ? typography.layoutMode
    : 'single'

  return { typography, setTypography, effectiveLayoutMode }
}
