import { cn } from '@/lib/utils'

/**
 * Inline SVG brand mark — no PNG dependency, perfect at any size.
 * The cedar tree + red rounded-square is the Cedar Boost identity.
 */

// Each size: [containerClass, svgRx (border-radius as % of 100)]
const sizes = {
  sm:     'h-8 w-8',
  md:     'h-10 w-10',
  lg:     'h-20 w-20 sm:h-24 sm:w-24',
  xl:     'h-28 w-28 sm:h-32 sm:w-32',
  splash: 'h-28 w-28 sm:h-36 sm:w-36',
} as const

export type BrandLogoSize = keyof typeof sizes

// Glow only on splash
const glowClass: Partial<Record<BrandLogoSize, string>> = {
  splash: 'drop-shadow-[0_0_40px_rgba(214,20,20,0.55)]',
  xl:     'drop-shadow-[0_0_24px_rgba(214,20,20,0.35)]',
}

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: BrandLogoSize
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Cedar Boost"
      className={cn(
        sizes[size],
        'select-none shrink-0',
        glowClass[size],
        className,
      )}
    >
      {/* ── Background: rich red rounded square ── */}
      <defs>
        <linearGradient id="cb-bg" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#E01414"/>
          <stop offset="100%" stopColor="#A00000"/>
        </linearGradient>
        <radialGradient id="cb-shine" cx="38%" cy="28%" r="55%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </radialGradient>
      </defs>

      <rect width="100" height="100" rx="22" fill="url(#cb-bg)"/>
      <rect width="100" height="100" rx="22" fill="url(#cb-shine)"/>

      {/* ── Cedar tree: 3 overlapping tiers + trunk ── */}
      {/* Top tier */}
      <polygon points="50,19 43,35 57,35" fill="#ffffff"/>
      {/* Middle tier */}
      <polygon points="50,28 37,48 63,48" fill="#ffffff"/>
      {/* Bottom tier */}
      <polygon points="50,38 29,63 71,63" fill="#ffffff"/>
      {/* Trunk */}
      <rect x="46" y="63" width="8" height="13" rx="2" fill="#ffffff"/>

      {/* Boost spark — bottom right, subtle */}
      <path
        d="M77 68 L73 78 L77 78 L71 90 L84 74 L79 74 Z"
        fill="#ffffff"
        opacity="0.30"
      />
    </svg>
  )
}

/** Convenience: just the path for masking / clip-path use */
export const CEDAR_ICON_PATH = '/logo-icon.svg'
