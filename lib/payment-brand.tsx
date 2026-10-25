import type { ReactNode } from "react"
import { Landmark, Wallet } from "lucide-react"
import type { PaymentMethod } from "@/lib/payments"

/**
 * Visual theme for a payment method, keyed off its name. This only changes
 * colors/icon shown on our own manual-payment form (choose method -> copy
 * number -> submit Transaction ID). It never recreates a provider's actual
 * app screens (PIN entry, OTP, etc.) — see payment-section.tsx.
 */
export interface PaymentBrand {
  /** Tailwind gradient classes for headers/buttons. */
  gradient: string
  /** Solid brand color, used for small accents (dots, borders). */
  solid: string
  /** Text color class usable on a white/light background. */
  text: string
  /** Light tint background, used for the method-picker button. */
  tint: string
  icon: ReactNode
}

const BKASH: PaymentBrand = {
  gradient: "bg-gradient-to-br from-[#E2136E] to-[#A80E52]",
  solid: "bg-[#E2136E]",
  text: "text-[#E2136E]",
  tint: "bg-[#E2136E]/10",
  icon: (
    <span className="flex size-full items-center justify-center font-serif text-[1.05em] font-bold italic text-white">
      b
    </span>
  ),
}

const NAGAD: PaymentBrand = {
  gradient: "bg-gradient-to-br from-[#EE6F27] to-[#D4480C]",
  solid: "bg-[#EE6F27]",
  text: "text-[#EE6F27]",
  tint: "bg-[#EE6F27]/10",
  icon: (
    <span className="flex size-full items-center justify-center text-[0.95em] font-extrabold text-white">N</span>
  ),
}

const ROCKET: PaymentBrand = {
  gradient: "bg-gradient-to-br from-[#8C3494] to-[#5B1F63]",
  solid: "bg-[#8C3494]",
  text: "text-[#8C3494]",
  tint: "bg-[#8C3494]/10",
  icon: (
    <span className="flex size-full items-center justify-center text-[0.95em] font-extrabold text-white">R</span>
  ),
}

const UPAY: PaymentBrand = {
  gradient: "bg-gradient-to-br from-[#00A99D] to-[#007A72]",
  solid: "bg-[#00A99D]",
  text: "text-[#00A99D]",
  tint: "bg-[#00A99D]/10",
  icon: (
    <span className="flex size-full items-center justify-center text-[0.95em] font-extrabold text-white">U</span>
  ),
}

const BANK: PaymentBrand = {
  gradient: "bg-gradient-to-br from-slate-700 to-slate-900",
  solid: "bg-slate-700",
  text: "text-slate-700",
  tint: "bg-slate-500/10",
  icon: <Landmark className="size-[0.55em] text-white" />,
}

const DEFAULT: PaymentBrand = {
  gradient: "bg-gradient-to-br from-primary to-primary/70",
  solid: "bg-primary",
  text: "text-primary",
  tint: "bg-primary/10",
  icon: <Wallet className="size-[0.55em] text-primary-foreground" />,
}

export function getPaymentBrand(method: Pick<PaymentMethod, "name" | "type">): PaymentBrand {
  const n = method.name.toLowerCase()
  if (n.includes("bkash")) return BKASH
  if (n.includes("nagad")) return NAGAD
  if (n.includes("rocket")) return ROCKET
  if (n.includes("upay")) return UPAY
  if (method.type === "bank") return BANK
  return DEFAULT
}
