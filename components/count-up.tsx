"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Counts a number up (e.g. "55+") when it scrolls into view.
 * Values that are not plain numbers (e.g. "24/7") are shown as-is.
 */
export function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const match = /^(\d+)([^\d/]*)$/.exec(value.trim())
  const target = match ? Number(match[1]) : null
  const suffix = match ? match[2] : ""
  const ref = useRef<HTMLSpanElement | null>(null)
  const [current, setCurrent] = useState(target === null ? 0 : 0)

  useEffect(() => {
    if (target === null) return
    const el = ref.current
    if (!el) return
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (reduce || typeof IntersectionObserver === "undefined") {
      setCurrent(target)
      return
    }
    let frame = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return
        observer.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - t, 3)
          setCurrent(Math.round(target * eased))
          if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [target, duration])

  if (target === null) return <>{value}</>

  return (
    <>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden="true">
        {current}
        {suffix}
      </span>
    </>
  )
}
