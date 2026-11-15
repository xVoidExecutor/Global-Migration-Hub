import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Global Migration Hub logo — drawn entirely in code (SVG), so it stays razor-sharp at any size,
 * has a truly transparent background and needs no image file.
 *
 * Emblem: a globe (navy) with a gold "M" and a gold orbit-arrow circling it, inside a thin gold ring.
 */
export function BrandMark({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "")
  const bg = `gmh-bg-${uid}`
  const gold = `gmh-gold-${uid}`
  const clip = `gmh-clip-${uid}`

  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={bg} x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0f4fa8" />
          <stop offset="1" stopColor="#001a4d" />
        </linearGradient>
        <linearGradient id={gold} x1="14" y1="14" x2="52" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.55" stopColor="#e3b04b" />
          <stop offset="1" stopColor="#b87d1c" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
      </defs>

      {/* globe + gold ring */}
      <circle cx="32" cy="32" r="29.5" fill={`url(#${bg})`} stroke={`url(#${gold})`} strokeWidth="1.6" />
      <g clipPath={`url(#${clip})`} fill="none" stroke="#9cc4ff" strokeOpacity="0.28" strokeWidth="0.9">
        <ellipse cx="32" cy="32" rx="11" ry="26" />
        <line x1="32" y1="6" x2="32" y2="58" />
        <line x1="6" y1="32" x2="58" y2="32" />
        <path d="M6 22 Q32 28 58 22" />
        <path d="M6 42 Q32 48 58 42" />
      </g>

      {/* "M" monogram */}
      <path
        d="M20 39 V23 L32 34 L44 23 V39"
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* orbit swoosh + arrow head (migration / movement) */}
      <path
        d="M9 36 C 15 56, 44 58, 54 28"
        fill="none"
        stroke={`url(#${gold})`}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M55.9 22.3 L57.97 30.42 L49.43 27.58 Z" fill={`url(#${gold})`} />
    </svg>
  )
}

const SIZES = {
  // enquire modal, footer, admin panels
  sm: {
    gap: "gap-2.5",
    mark: "size-9",
    title: "text-base",
    tag: "text-[9px] tracking-[0.18em]",
  },
  // site header / tracking page header
  md: {
    gap: "gap-3",
    mark: "size-11 sm:size-12",
    title: "text-xl sm:text-2xl",
    tag: "text-[9px] tracking-[0.14em] sm:text-[11px] sm:tracking-[0.22em]",
  },
} as const

/**
 * Emblem + wordmark.
 * tone="light" → white text (for dark / blue backgrounds), tone="dark" → navy text (for light backgrounds).
 */
export function BrandLogo({
  tone = "light",
  size = "md",
  tagline = true,
  className,
}: {
  tone?: "light" | "dark"
  size?: keyof typeof SIZES
  tagline?: boolean
  className?: string
}) {
  const s = SIZES[size]
  const light = tone === "light"

  return (
    <span className={cn("flex min-w-0 items-center", s.gap, className)}>
      <BrandMark className={s.mark} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            "whitespace-nowrap font-bold tracking-tight",
            s.title,
            light ? "text-white" : "text-[#002664]",
          )}
        >
          Global Migration <span className={light ? "text-[#f0c35c]" : "text-[#b8821f]"}>Hub</span>
        </span>
        {tagline && (
          <span
            className={cn(
              "whitespace-nowrap font-medium uppercase",
              s.tag,
              light ? "text-white/80" : "text-[#6b7280]",
            )}
          >
            Visa &amp; Immigration Consultancy
          </span>
        )}
      </span>
    </span>
  )
}
