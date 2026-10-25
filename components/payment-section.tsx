"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Check, CheckCircle2, Copy, Loader2, Wallet } from "lucide-react"
import { formatCountry } from "@/lib/countries"
import { ANY_COUNTRY, type PaymentMethod, type PaymentSubmission } from "@/lib/payments"
import { getPaymentBrand } from "@/lib/payment-brand"
import type { Application } from "@/lib/admin/types"

export interface PaymentCredentials {
  passport?: string
  nationalId?: string
  dob: string
}

const STATUS_STYLES = {
  pending: { label: "Pending verification", className: "bg-tip-yellow text-tip-yellow-foreground" },
  verified: { label: "Verified", className: "bg-tip-green text-tip-green-foreground" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
} as const

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-primary"

/**
 * Payment section for the applicant profile (/track).
 * Flow: pick country -> pick payment method -> number is shown -> applicant pays manually
 * -> enters the Transaction ID -> admin verifies it from the admin panel.
 */
export function PaymentSection({ app, credentials }: { app: Application; credentials: PaymentCredentials }) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loadingMethods, setLoadingMethods] = useState(true)
  const [payments, setPayments] = useState<PaymentSubmission[]>([])
  const [country, setCountry] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState("")
  const [senderNumber, setSenderNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const { passport, nationalId, dob } = credentials
  const feeEnabled = app.serviceFeeEnabled ?? false
  const feeLabel = app.serviceFeeLabel?.trim() || "Service Fee"
  const feeAmount = app.serviceFeeAmount?.trim() ?? ""

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (passport) params.set("passport", passport)
    else if (nationalId) params.set("nationalId", nationalId)
    params.set("dob", dob)
    return params.toString()
  }, [passport, nationalId, dob])

  useEffect(() => {
    let cancelled = false
    fetch("/api/payment-methods", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PaymentMethod[]) => {
        if (!cancelled) setMethods(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingMethods(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments?${query}`, { cache: "no-store" })
      if (res.ok) setPayments((await res.json()) as PaymentSubmission[])
    } catch {
      // ignore — the list simply stays empty
    }
  }, [query])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  const countries = useMemo(() => {
    const set = new Set<string>()
    for (const m of methods) {
      if (m.country.toLowerCase() !== ANY_COUNTRY.toLowerCase()) set.add(m.country)
    }
    return Array.from(set).sort()
  }, [methods])

  // Default the country to the applicant's nationality when we have methods for it.
  useEffect(() => {
    if (country || countries.length === 0) return
    const nationality = (app.nationality ?? "").trim().toLowerCase()
    const match = countries.find((c) => c.toLowerCase() === nationality)
    setCountry(match ?? countries[0])
  }, [country, countries, app.nationality])

  const visible = useMemo(
    () =>
      methods.filter((m) => {
        const c = m.country.toLowerCase()
        return c === ANY_COUNTRY.toLowerCase() || c === country.toLowerCase()
      }),
    [methods, country],
  )

  const selected = visible.find((m) => m.id === selectedId) ?? null
  const brand = selected ? getPaymentBrand(selected) : null
  const [justSubmitted, setJustSubmitted] = useState(false)

  async function copyNumber(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — the number is still visible to copy by hand
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passport,
          nationalId,
          dob,
          methodId: selected.id,
          transactionId,
          senderNumber,
          amount,
        }),
      })
      const body = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setFeedback({ type: "error", text: body?.error ?? "Could not submit your payment. Please try again." })
        return
      }
      setFeedback({ type: "success", text: "Payment submitted. We will verify your transaction shortly." })
      setTransactionId("")
      setSenderNumber("")
      setAmount("")
      setJustSubmitted(true)
      setTimeout(() => {
        setJustSubmitted(false)
        setSelectedId(null)
      }, 1600)
      await loadPayments()
    } catch {
      setFeedback({ type: "error", text: "Something went wrong. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  // Payment is only shown when the admin has turned it on for this specific application.
  if (!feeEnabled) return null

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payment</h3>
          <p className="text-xs text-muted-foreground">Pay manually, then submit your Transaction ID to verify.</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">{feeLabel} Required</p>
        {feeAmount && <p className="mt-0.5 text-xl font-semibold text-foreground">{feeAmount}</p>}
      </div>

      {loadingMethods ? (
        <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading payment options…
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Payment options are not available yet. Please contact your consultant.
        </p>
      ) : (
        <div className="space-y-5">
          {countries.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="pay-country">
                Your country
              </label>
              <select
                id="pay-country"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value)
                  setSelectedId(null)
                  setFeedback(null)
                }}
                className={inputClass}
              >
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {formatCountry(c)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Choose a payment method</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {visible.map((m) => {
                const b = getPaymentBrand(m)
                const isSelected = selectedId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id)
                      setFeedback(null)
                      if (feeAmount) setAmount(feeAmount)
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                      isSelected
                        ? `scale-[1.02] border-transparent ${b.tint} shadow-sm ring-1 ring-black/5`
                        : "border-border bg-background text-foreground hover:-translate-y-0.5 hover:border-border hover:shadow-sm"
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-[1.1rem] leading-none shadow-sm ${b.gradient}`}
                    >
                      {b.icon}
                    </span>
                    <span className={isSelected ? b.text : "text-foreground"}>{m.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {selected && brand && (
            <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300 overflow-hidden rounded-2xl border border-border shadow-sm">
              {justSubmitted ? (
                <div className={`flex flex-col items-center gap-3 px-6 py-10 text-center text-white ${brand.gradient}`}>
                  <span className="flex size-14 animate-in zoom-in-50 items-center justify-center rounded-full bg-white/20 duration-500">
                    <CheckCircle2 className="size-8" />
                  </span>
                  <p className="text-base font-semibold">Submitted for verification</p>
                  <p className="text-xs text-white/85">We will confirm your {selected.name} payment shortly.</p>
                </div>
              ) : (
                <>
                  {/* Brand header — mirrors the method's color so applicants instantly recognize
                      which wallet they chose. This is our own form, not the provider's app. */}
                  <div className={`flex items-center gap-3 px-4 py-3.5 text-white ${brand.gradient}`}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-[1.2rem] leading-none shadow-inner">
                      {brand.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{selected.name}</p>
                      <p className="text-[11px] text-white/80">Send payment manually to this number</p>
                    </div>
                  </div>

                  <div className="space-y-4 bg-card p-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Send money to</p>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <p className="break-all font-mono text-lg font-semibold text-foreground">
                          {selected.accountNumber}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyNumber(selected.accountNumber)}
                          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            copied
                              ? "border-tip-green/40 bg-tip-green text-tip-green-foreground"
                              : "border-border bg-background text-foreground hover:bg-secondary"
                          }`}
                        >
                          {copied ? (
                            <Check className="size-3.5 animate-in zoom-in-50 duration-200" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      {selected.accountName && (
                        <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{selected.accountName}</p>
                      )}
                      {selected.instructions && (
                        <p className="mt-2 whitespace-pre-line text-xs text-foreground/80">{selected.instructions}</p>
                      )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3 border-t border-dashed border-border pt-4">
                      <p className="text-xs text-muted-foreground">
                        After you have paid, enter the Transaction ID from your payment confirmation message.
                      </p>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="pay-trx">
                          Transaction ID <span className="text-destructive">*</span>
                        </label>
                        <input
                          id="pay-trx"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          required
                          maxLength={40}
                          autoComplete="off"
                          placeholder="e.g. 9A7B6C5D4E"
                          className={`${inputClass} font-mono uppercase focus:border-current ${brand.text}`}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="pay-amount">
                            Amount paid
                          </label>
                          <input
                            id="pay-amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            maxLength={20}
                            inputMode="decimal"
                            placeholder="Optional"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground" htmlFor="pay-sender">
                            Your {selected.type === "bank" ? "account" : "wallet"} number
                          </label>
                          <input
                            id="pay-sender"
                            value={senderNumber}
                            onChange={(e) => setSenderNumber(e.target.value)}
                            maxLength={40}
                            placeholder="Optional"
                            className={inputClass}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting || !transactionId.trim()}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${brand.gradient}`}
                      >
                        {submitting && <Loader2 className="size-4 animate-spin" />}
                        Submit for verification
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}

          {feedback && (
            <p
              className={`rounded-xl px-3.5 py-2.5 text-sm ${
                feedback.type === "success"
                  ? "bg-tip-green text-tip-green-foreground"
                  : "bg-destructive/10 text-destructive"
              }`}
              role="status"
            >
              {feedback.text}
            </p>
          )}
        </div>
      )}

      {payments.length > 0 && (
        <div className="mt-6 border-t border-dashed border-border pt-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your payments
          </h4>
          <ul className="space-y-2.5">
            {payments.map((p) => {
              const style = STATUS_STYLES[p.status] ?? STATUS_STYLES.pending
              return (
                <li key={p.id} className="rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{p.methodName}</p>
                      <p className="break-all font-mono text-xs text-muted-foreground">{p.transactionId}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.className}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {new Date(p.submittedAt).toLocaleString()}
                    {p.amount ? ` · ${p.amount}` : ""}
                  </p>
                  {p.adminNote && (
                    <p className="mt-2 whitespace-pre-line rounded-lg bg-secondary/60 px-3 py-2 text-xs text-foreground">
                      {p.adminNote}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
