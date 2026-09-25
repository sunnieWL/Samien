import { useState } from 'react'
import './SamienMascot.css'

export type SamienMascotVariant = 'welcome' | 'scanning' | 'success' | 'conflict'
export type SamienMascotSize = 'sm' | 'md' | 'lg'

export interface SamienMascotProps {
  variant: SamienMascotVariant
  size?: SamienMascotSize
  className?: string
}

/** The surrounding status text supplies the accessible description. */
export function SamienMascot({ variant, size = 'md', className }: SamienMascotProps) {
  const source = `/mascot/${variant}.png`
  const [loadedSource, setLoadedSource] = useState<string | null>(null)
  const [unavailableSource, setUnavailableSource] = useState<string | null>(null)

  // Missing optional assets should never leave a broken-image marker behind.
  if (unavailableSource === source) return null

  return (
    <span
      className={[
        'samien-mascot',
        `samien-mascot--${size}`,
        `samien-mascot--${variant}`,
        loadedSource === source ? 'samien-mascot--loaded' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <img
        key={source}
        src={source}
        alt=""
        width="184"
        height="184"
        draggable={false}
        onLoad={() => setLoadedSource(source)}
        onError={() => setUnavailableSource(source)}
      />
    </span>
  )
}
