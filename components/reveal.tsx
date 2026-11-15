"use client"

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react"

type RevealProps = {
  /** HTML tag to render (default "div"). Use "article", "li", "section"... to keep markup the same. */
  as?: ElementType
  children: ReactNode
  className?: string
  /** Delay in ms — use it to stagger cards in a grid. */
  delay?: number
  direction?: "up" | "down" | "left" | "right" | "zoom"
}

/**
 * Fades + slides its content in the first time it scrolls into view.
 * Only animates opacity/transform, so the design itself stays exactly the same.
 */
export function Reveal({ as: Tag = "div", children, className = "", delay = 0, direction = "up" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      data-reveal={direction}
      className={`gmh-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
