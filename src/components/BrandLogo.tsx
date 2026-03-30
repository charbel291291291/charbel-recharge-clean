import { cn } from '@/lib/utils'

/** Served from `public/cedarboost-logo.png` */
export const LOGO_PATH = '/cedarboost-logo.png'

const sizes = {
  sm: 'h-8 w-auto max-w-[7rem]',
  md: 'h-10 w-auto max-w-[9rem]',
  lg: 'h-20 sm:h-24 w-auto max-w-[15rem]',
  xl: 'h-28 sm:h-32 w-auto max-w-[18rem]',
  splash: 'h-28 w-28 sm:h-36 sm:w-36 object-contain drop-shadow-[0_8px_32px_rgba(255,0,0,0.25)]',
} as const

export type BrandLogoSize = keyof typeof sizes

export function BrandLogo({
  size = 'md',
  className,
}: {
  size?: BrandLogoSize
  className?: string
}) {
  return (
    <img
      src={LOGO_PATH}
      alt="Cedar Card"
      className={cn(sizes[size], size !== 'splash' && 'object-contain', 'select-none', className)}
      decoding="async"
      draggable={false}
    />
  )
}
