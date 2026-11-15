// Auto-generated agency reference numbers, e.g. GMH-260715-A7K2QX
// (GMH + date + 6 random characters; no 0/O/1/I so it is easy to read aloud).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function randomCode(length: number): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  let out = ""
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

export function generateReferenceNo(existing: Set<string> = new Set()): string {
  const d = new Date()
  const yy = String(d.getUTCFullYear()).slice(-2)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  for (let i = 0; i < 25; i++) {
    const ref = `GMH-${yy}${mm}${dd}-${randomCode(6)}`
    if (!existing.has(ref)) return ref
  }
  return `GMH-${yy}${mm}${dd}-${Date.now().toString(36).toUpperCase()}`
}
