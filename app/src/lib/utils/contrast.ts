function toLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

// hex (with or without #, 3 or 6 digits) → linearised sRGB triple
export function hexToLinearRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    : h
  return [
    toLinear(parseInt(full.slice(0, 2), 16)),
    toLinear(parseInt(full.slice(2, 4), 16)),
    toLinear(parseInt(full.slice(4, 6), 16)),
  ]
}

// relative luminance per WCAG 2.1 §1.4.3
export function getLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// contrast ratio — always in [1, 21]
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hexToLinearRgb(hex1))
  const l2 = getLuminance(hexToLinearRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export type ContrastLevel = 'fail' | 'aa-large' | 'aa'

export interface ContrastRating {
  level: ContrastLevel
  label: string
  detail: string
  // true only when ratio >= 4.5 (AA for normal-sized text)
  pass: boolean
}

// WCAG AA thresholds: 3:1 large text/UI elements, 4.5:1 normal text
export function getContrastRating(ratio: number): ContrastRating {
  if (ratio >= 4.5) return { level: 'aa',       label: 'AA Pass',  detail: 'Passes for all text',        pass: true  }
  if (ratio >= 3)   return { level: 'aa-large', label: 'AA Large', detail: 'Passes for large text only', pass: false }
  return              { level: 'fail',     label: 'Fail',     detail: 'Does not meet WCAG AA',     pass: false }
}
