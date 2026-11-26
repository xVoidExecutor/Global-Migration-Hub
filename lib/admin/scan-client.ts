"use client"

import type { ScannedIdentity } from "./types"

/** Shrinks a photo to at most 1600px (keeps requests under Vercel's 4.5 MB body limit). */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" })
  } catch {
    return file
  }
}

/** Sends passport / NID photos to /api/admin/scan-documents and returns the details it read. */
export async function scanIdentityDocuments(files: File[]): Promise<ScannedIdentity> {
  const formData = new FormData()
  for (const file of files.slice(0, 5)) formData.append("files", await shrink(file))

  const res = await fetch("/api/admin/scan-documents", { method: "POST", body: formData })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.error || `Scan failed (${res.status})`)
  return body as ScannedIdentity
}
