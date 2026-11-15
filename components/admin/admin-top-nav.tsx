"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, Eye, HelpCircle, LogOut, Menu, Settings } from "lucide-react"
import { AdminDrawer } from "@/components/admin/admin-drawer"
import { logout } from "@/lib/admin/auth"
import type { VisitNotification } from "@/lib/admin/types"

const POLL_INTERVAL_MS = 20_000

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function AdminTopNav({ adminName = "Admin User" }: { adminName?: string }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<VisitNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as { notifications: VisitNotification[]; unreadCount: number }
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch {
      // Silent — the bell just won't update this cycle.
    }
  }

  useEffect(() => {
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  async function handleBellClick() {
    const next = !notifOpen
    setNotifOpen(next)
    setMenuOpen(false)
    if (next && unreadCount > 0) {
      setUnreadCount(0)
      try {
        await fetch("/api/admin/notifications", { method: "POST" })
      } catch {
        // Non-critical — worst case the badge reappears next poll.
      }
    }
  }

  const initials = adminName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition hover:bg-muted"
          >
            <Menu className="size-5" />
          </button>
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-md shadow-primary/20 ring-1 ring-primary/20">
            <img src="/icon.png" alt="Global Migration Hub" className="size-full object-cover" />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="truncate font-serif text-sm font-bold uppercase tracking-wider text-foreground sm:text-base">
              <span className="sm:hidden">Migration Hub</span>
              <span className="hidden sm:inline">Global Migration Hub</span>
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              Control Panel
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Admin">
          <Link href="/admin/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Applications
          </Link>
          <Link href="/admin/documents" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Documents
          </Link>
          <a href="#" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            <Settings className="size-4" /> Settings
          </a>
          <a href="#" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
            <HelpCircle className="size-4" /> Help
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={handleBellClick}
              aria-label="Notifications"
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Bell className={`size-4.5 ${unreadCount > 0 ? "animate-[gmh-bell-shake_1.8s_ease-in-out_infinite]" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex size-4 items-center justify-center">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
                  <span className="relative flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 max-w-[85vw] animate-in overflow-hidden rounded-xl border border-border bg-popover shadow-lg fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Profile Views</p>
                  <p className="text-xs text-muted-foreground">Applicants currently checking their status</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted-foreground">No activity yet.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {notifications.map((n) => (
                        <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Eye className="size-3.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="break-words text-sm text-foreground">
                              <span className="font-medium">{n.applicantName}</span> viewed their status page
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {n.destinationCountry ? `${n.destinationCountry} · ` : ""}
                              {timeAgo(n.viewedAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v)
                setNotifOpen(false)
              }}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-muted"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-tip-peach text-xs font-semibold text-tip-peach-foreground">
                {initials}
              </span>
              <span className="hidden text-sm font-medium text-foreground sm:inline">{adminName}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
                <button
                  type="button"
                  onClick={async () => {
                    await logout()
                    router.replace("/admin/login")
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive hover:bg-muted"
                >
                  <LogOut className="size-4" /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
    <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} adminName={adminName} />
    </>
  )
}
