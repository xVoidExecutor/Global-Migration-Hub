"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, Save, Trash2, Wallet, X } from "lucide-react"
import { AdminTopNav } from "@/components/admin/admin-top-nav"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { isLoggedIn } from "@/lib/admin/auth"
import { ALL_COUNTRIES, formatCountry } from "@/lib/countries"
import {
  ANY_COUNTRY,
  PAYMENT_METHOD_TYPE_LABELS,
  type PaymentMethod,
  type PaymentMethodType,
  type PaymentStatus,
  type PaymentSubmission,
} from "@/lib/payments"

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"

const STATUS_BADGE: Record<PaymentStatus, string> = {
  pending: "bg-tip-yellow text-tip-yellow-foreground",
  verified: "bg-tip-green text-tip-green-foreground",
  rejected: "bg-destructive/10 text-destructive",
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<"requests" | "methods">("requests")

  useEffect(() => {
    isLoggedIn().then((ok) => {
      if (!ok) {
        router.replace("/admin/login")
        return
      }
      setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-secondary/30 pb-16">
      <AdminTopNav />

      <div className="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6">
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
          <div className="hidden lg:block">
            <AdminSidebar active="payments" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wallet className="size-5" />
              </span>
              <div>
                <h1 className="font-serif text-xl font-bold text-foreground">Payments</h1>
                <p className="text-sm text-muted-foreground">
                  Verify applicant payments and manage payment numbers.
                </p>
              </div>
            </div>

            <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1">
              {([
                ["requests", "Payment requests"],
                ["methods", "Payment methods"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "requests" ? <RequestsTab /> : <MethodsTab />}
          </div>
        </div>
      </div>
    </main>
  )
}

/* ----------------------------- Payment requests ---------------------------- */

function RequestsTab() {
  const [items, setItems] = useState<PaymentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | PaymentStatus>("pending")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/payments", { cache: "no-store" })
      if (res.ok) setItems((await res.json()) as PaymentSubmission[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const shown = useMemo(
    () => (filter === "all" ? items : items.filter((p) => p.status === filter)),
    [items, filter],
  )
  const pendingCount = items.filter((p) => p.status === "pending").length

  async function review(id: string, status: PaymentStatus) {
    setBusyId(id)
    try {
      await fetch(`/api/admin/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote: notes[id] }),
      })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this payment record? Its Transaction ID can then be submitted again.")) return
    setBusyId(id)
    try {
      await fetch(`/api/admin/payments/${id}`, { method: "DELETE" })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading payments…</p>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "verified", "rejected", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
              filter === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {key}
            {key === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No payments here.
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{p.applicantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.methodName} · {formatCountry(p.country)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${STATUS_BADGE[p.status]}`}>
                  {p.status}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Transaction ID</dt>
                  <dd className="break-all font-mono text-sm font-semibold text-foreground">{p.transactionId}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Paid to</dt>
                  <dd className="break-all font-medium text-foreground">{p.accountNumber}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-medium text-foreground">{p.amount || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sender</dt>
                  <dd className="break-all font-medium text-foreground">{p.senderNumber || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="font-medium text-foreground">{new Date(p.submittedAt).toLocaleString()}</dd>
                </div>
              </dl>

              <input
                value={notes[p.id] ?? p.adminNote ?? ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                placeholder="Note for the applicant (optional)"
                maxLength={500}
                className={`${inputClass} mt-3`}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id || p.status === "verified"}
                  onClick={() => review(p.id, "verified")}
                  className="flex items-center gap-1.5 rounded-lg bg-tip-green px-3.5 py-2 text-xs font-semibold text-tip-green-foreground disabled:opacity-50"
                >
                  <Check className="size-4" /> Verify
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id || p.status === "rejected"}
                  onClick={() => review(p.id, "rejected")}
                  className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3.5 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
                >
                  <X className="size-4" /> Reject
                </button>
                {p.status !== "pending" && (
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => review(p.id, "pending")}
                    className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    Reset to pending
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => remove(p.id)}
                  aria-label="Delete payment"
                  className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ----------------------------- Payment methods ----------------------------- */

function MethodsTab() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [newCountry, setNewCountry] = useState("Bangladesh")

  useEffect(() => {
    fetch("/api/admin/payment-methods", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PaymentMethod[]) => setMethods(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => {
    const map = new Map<string, PaymentMethod[]>()
    for (const m of methods) {
      if (!map.has(m.country)) map.set(m.country, [])
      map.get(m.country)!.push(m)
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a === ANY_COUNTRY ? 1 : b === ANY_COUNTRY ? -1 : a.localeCompare(b),
    )
  }, [methods])

  function update(id: string, patch: Partial<PaymentMethod>) {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
    setDirty(true)
    setMessage(null)
  }

  function remove(id: string) {
    setMethods((prev) => prev.filter((m) => m.id !== id))
    setDirty(true)
    setMessage(null)
  }

  function add(country: string) {
    const method: PaymentMethod = {
      id: `pm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      country,
      name: "",
      type: "mobile",
      accountNumber: "",
      accountName: "",
      instructions: "",
      enabled: true,
    }
    setMethods((prev) => [...prev, method])
    setDirty(true)
    setMessage(null)
  }

  async function save() {
    if (methods.some((m) => !m.name.trim())) {
      setMessage({ type: "error", text: "Every payment method needs a name." })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/payment-methods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setMessage({ type: "error", text: (body as { error?: string } | null)?.error ?? "Could not save." })
        return
      }
      setMethods(body as PaymentMethod[])
      setDirty(false)
      setMessage({ type: "success", text: "Saved. Changes are live for applicants now." })
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading payment methods…</p>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Applicants only see a method when it is enabled and has an account number. Methods under
          &quot;{ANY_COUNTRY}&quot; are shown to everyone.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={newCountry} onChange={(e) => setNewCountry(e.target.value)} className={`${inputClass} max-w-xs`}>
            <option value={ANY_COUNTRY}>{ANY_COUNTRY}</option>
            {ALL_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {formatCountry(c)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => add(newCountry)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="size-4" /> Add method
          </button>
        </div>
      </div>

      {groups.map(([country, list]) => (
        <section key={country}>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {country === ANY_COUNTRY ? ANY_COUNTRY : formatCountry(country)}
          </h2>
          <ul className="space-y-3">
            {list.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Name</label>
                    <input
                      value={m.name}
                      onChange={(e) => update(m.id, { name: e.target.value })}
                      maxLength={60}
                      placeholder="e.g. bKash"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                    <select
                      value={m.type}
                      onChange={(e) => update(m.id, { type: e.target.value as PaymentMethodType })}
                      className={inputClass}
                    >
                      {(Object.keys(PAYMENT_METHOD_TYPE_LABELS) as PaymentMethodType[]).map((t) => (
                        <option key={t} value={t}>
                          {PAYMENT_METHOD_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">Payment number / account number</label>
                    <input
                      value={m.accountNumber}
                      onChange={(e) => update(m.id, { accountNumber: e.target.value })}
                      maxLength={120}
                      placeholder="Number applicants will pay to"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Account name / bank details (optional)
                    </label>
                    <textarea
                      value={m.accountName}
                      onChange={(e) => update(m.id, { accountName: e.target.value })}
                      maxLength={160}
                      rows={2}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Instructions for the applicant (optional)
                    </label>
                    <textarea
                      value={m.instructions}
                      onChange={(e) => update(m.id, { instructions: e.target.value })}
                      maxLength={500}
                      rows={2}
                      placeholder="e.g. Use Send Money, not Payment."
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={m.enabled}
                      onChange={(e) => update(m.id, { enabled: e.target.checked })}
                      className="size-4"
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    aria-label={`Remove ${m.name || "method"}`}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </button>
        {dirty && !message && <span className="text-xs text-muted-foreground">You have unsaved changes.</span>}
        {message && (
          <span className={`text-xs font-medium ${message.type === "success" ? "text-tip-green-foreground" : "text-destructive"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
