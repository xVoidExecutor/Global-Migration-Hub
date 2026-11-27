import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import { clean, fetchBytes } from "../pdf-builder"
import type { Application } from "../types"

/**
 * TEMPLATE: Application for a Work Permit Visa (Form 1401).
 *
 * The blank form is the PDF at /public/templates/visa-form-1401-template.pdf. This file
 * only writes the applicant's details onto it (same layout, same boxes, same marks).
 * To move a value, change its coordinates below (x / bottom are in PDF points, measured
 * from the top-left of the page).
 */

export const FORM_TEMPLATE_PATH = "/templates/visa-form-1401-template.pdf"

const PAGE_HEIGHTS = [850.56, 841.92, 841.92, 841.92]
const PHOTO = { x: 487, bottom: 176.5, w: 72.6, h: 90 }

type Fit = { maxX?: number }
type Spot = { page: number; x: number; bottom: number; size: number; maxX: number }

const S = (page: number, x: number, bottom: number, size = 10, maxX = 562): Spot => ({ page, x, bottom, size, maxX })

// ---- Page 1 --------------------------------------------------------------------------
const P_PASSPORT_NO = S(0, 409, 197.4)
const P_COUNTRY = S(0, 409, 218.2)
const P_NATIONALITY = S(0, 409, 238.7)
const P_ISSUE = [S(0, 408.6, 268.3, 9.5), S(0, 432.4, 268.3, 9.5), S(0, 456.2, 268.3, 9.5)]
const P_EXPIRY = [S(0, 408.6, 289.6, 9.5), S(0, 432.4, 289.6, 9.5), S(0, 456.2, 289.6, 9.5)]
const P_AUTHORITY = S(0, 335.8, 327.1)
const P_FAMILY = S(0, 49, 433.4, 10, 396)
const P_GIVEN = S(0, 49, 469.6, 10, 396)
const P_DOB = [S(0, 109.8, 647.3, 9.5), S(0, 130.2, 647.3, 9.5), S(0, 154.1, 647.3, 9.5)]
const P_POB_CITY = S(0, 100, 691.2, 10, 396)
const P_POB_COUNTRY = S(0, 100, 715.0, 10, 396)
const P_ID_NO = S(0, 403, 823.0)
const P_ID_COUNTRY = S(0, 403, 844.3)

// tick-box centres (x, distance from the top of the page)
const TICK_SEX: Record<string, [number, number]> = {
  male: [100.5, 602.3],
  female: [167.0, 602.3],
  unspecified: [282.6, 602.3],
}
const TICK_RELATIONSHIP: Record<string, [number, number]> = {
  married: [100.1, 752.4],
  engaged: [100.1, 767.5],
  defacto: [100.1, 782.6],
  separated: [172.8, 752.4],
  divorced: [172.8, 767.5],
  widowed: [172.8, 782.6],
  never: [280.5, 743.0],
}

// ---- Page 2 --------------------------------------------------------------------------
const P_ADDR1 = S(1, 335, 94.3, 9, 545)
const P_ADDR2 = S(1, 335, 111.5, 9, 545)
const P_ADDR3 = S(1, 335, 128.0, 9, 476)
const P_POSTCODE = S(1, 518.7, 128.8, 9, 560)
const P_MOBILE = S(1, 388.1, 331.8, 10, 560)
const P_EMAIL = S(1, 391, 461.4, 9, 570)
const TICK_EMAIL_YES: [number, number] = [353.5, 409.5]

// ---- Page 4 --------------------------------------------------------------------------
const P_SIGN_DATE_1 = [S(3, 105.3, 344.8, 9.5), S(3, 125.6, 344.8, 9.5), S(3, 148.3, 344.8, 9.5)]
const P_SIGN_DATE_2 = [S(3, 386.8, 409.2, 9.5), S(3, 408.7, 409.2, 9.5), S(3, 431.5, 409.2, 9.5)]

// ---- helpers -------------------------------------------------------------------------

const DEMONYM_TO_COUNTRY: Record<string, string> = {
  BANGLADESHI: "BANGLADESH",
  INDIAN: "INDIA",
  PAKISTANI: "PAKISTAN",
  NEPALESE: "NEPAL",
  NEPALI: "NEPAL",
  "SRI LANKAN": "SRI LANKA",
  FILIPINO: "PHILIPPINES",
  EGYPTIAN: "EGYPT",
  INDONESIAN: "INDONESIA",
  VIETNAMESE: "VIETNAM",
  THAI: "THAILAND",
  CHINESE: "CHINA",
  TURKISH: "TURKEY",
  NIGERIAN: "NIGERIA",
  KENYAN: "KENYA",
  GHANAIAN: "GHANA",
  AMERICAN: "UNITED STATES",
  BRITISH: "UNITED KINGDOM",
}

function upper(value: unknown) {
  return clean(value).toUpperCase()
}

/** Returns [day, month, year] as zero-padded strings, or null when the value is not a date. */
function dateParts(value?: string | Date | null): [string, string, string] | null {
  if (!value) return null
  if (typeof value === "string") {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return [iso[3], iso[2], iso[1]]
  }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return [String(d.getDate()).padStart(2, "0"), String(d.getMonth() + 1).padStart(2, "0"), String(d.getFullYear())]
}

function splitName(fullName: string, family?: string, given?: string): { family: string; given: string } {
  if (family?.trim() || given?.trim()) {
    return { family: upper(family) || "N/A", given: upper(given) || "N/A" }
  }
  const words = upper(fullName).split(" ").filter(Boolean)
  if (words.length === 0) return { family: "N/A", given: "N/A" }
  if (words.length === 1) return { family: words[0], given: "N/A" }
  return { family: words[words.length - 1], given: words.slice(0, -1).join(" ") }
}

/** Reads an image (png / jpg / gif / webp), crops it to the photo box and returns JPEG bytes. */
async function photoToJpeg(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const bitmap = await createImageBitmap(new Blob([bytes as BlobPart]))
    const targetRatio = PHOTO.w / PHOTO.h
    let sw = bitmap.width
    let sh = bitmap.height
    if (sw / sh > targetRatio) sw = sh * targetRatio
    else sh = sw / targetRatio
    const sx = (bitmap.width - sw) / 2
    const sy = (bitmap.height - sh) * 0.3 // keep a little more headroom than footroom
    const outW = 600
    const outH = Math.round(outW / targetRatio)
    const canvas = document.createElement("canvas")
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, outW, outH)
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outW, outH)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null
  } catch {
    return null
  }
}

// ---- main drawing function (pure: bytes in, bytes out) ------------------------------------

export async function fillApplicationForm(
  templateBytes: Uint8Array,
  app: Application,
  photoJpeg?: Uint8Array | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(templateBytes)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pages = pdf.getPages()
  const ink = rgb(0, 0, 0)

  const text = (spot: Spot, value: string, fit: Fit = {}) => {
    const page: PDFPage = pages[spot.page]
    if (!page) return
    const s = clean(value)
    if (!s) return
    let size = spot.size
    const maxWidth = (fit.maxX ?? spot.maxX) - spot.x
    while (size > 6 && (bold as PDFFont).widthOfTextAtSize(s, size) > maxWidth) size -= 0.25
    const baseline = PAGE_HEIGHTS[spot.page] - spot.bottom + (spot.size >= 9.5 ? 2.3 : 2.0)
    page.drawText(s, { x: spot.x, y: baseline, size, font: bold, color: ink })
  }

  const parts = (spots: Spot[], value: [string, string, string] | null) => {
    if (!value) return
    spots.forEach((spot, i) => text(spot, value[i]))
  }

  const tick = (pageIndex: number, [cx, top]: [number, number]) => {
    const page = pages[pageIndex]
    const y = PAGE_HEIGHTS[pageIndex] - top
    const s = 7
    const opts = { thickness: 1.6, color: ink }
    page.drawLine({ start: { x: cx - s * 0.5, y }, end: { x: cx - s * 0.1, y: y - s * 0.45 }, ...opts })
    page.drawLine({ start: { x: cx - s * 0.1, y: y - s * 0.45 }, end: { x: cx + s * 0.6, y: y + s * 0.55 }, ...opts })
  }

  const fd = app.formDetails ?? {}
  const nationality = upper(fd.nationality || app.nationality)
  const fullName = fd.fullName || app.fullName
  const passportNumber = fd.passportNumber || app.passportNumber
  const dateOfBirth = fd.dateOfBirth || app.dateOfBirth
  const nationalId = fd.nationalId || app.nationalId
  const countryOfPassport = upper(fd.countryOfPassport) || DEMONYM_TO_COUNTRY[nationality] || nationality

  // Page 1 - Part A
  const names = splitName(fullName, fd.familyName, fd.givenNames)
  text(P_FAMILY, names.family)
  text(P_GIVEN, names.given, {})
  parts(P_DOB, dateParts(dateOfBirth))
  text(P_POB_CITY, upper(fd.placeOfBirthCity))
  text(P_POB_COUNTRY, upper(fd.placeOfBirthCountry) || countryOfPassport)

  text(P_PASSPORT_NO, upper(passportNumber))
  text(P_COUNTRY, countryOfPassport)
  text(P_NATIONALITY, nationality)
  parts(P_ISSUE, dateParts(fd.passportIssueDate))
  parts(P_EXPIRY, dateParts(fd.passportExpiryDate))
  text(P_AUTHORITY, upper(fd.issuingAuthority))

  text(P_ID_NO, upper(nationalId))
  text(P_ID_COUNTRY, upper(fd.idCountry) || countryOfPassport)

  if (fd.sex && TICK_SEX[fd.sex]) tick(0, TICK_SEX[fd.sex])
  if (fd.relationship && TICK_RELATIONSHIP[fd.relationship]) tick(0, TICK_RELATIONSHIP[fd.relationship])

  // Photo
  const photoBytes = photoJpeg ?? null
  if (photoBytes) {
    const img = await pdf.embedJpg(photoBytes)
    pages[0].drawImage(img, {
      x: PHOTO.x,
      y: PAGE_HEIGHTS[0] - PHOTO.bottom,
      width: PHOTO.w,
      height: PHOTO.h,
    })
  }

  // Page 2 - addresses, phone, email
  text(P_ADDR1, upper(fd.addressLine1))
  text(P_ADDR2, upper(fd.addressLine2))
  text(P_ADDR3, upper(fd.addressLine3))
  text(P_POSTCODE, upper(fd.postcode))
  text(P_MOBILE, clean(app.phone))
  const email = clean(app.email)
  if (email) {
    text(P_EMAIL, email)
    tick(1, TICK_EMAIL_YES)
  }

  // Page 4 - signature dates (today)
  const today = dateParts(new Date())
  parts(P_SIGN_DATE_1, today)
  parts(P_SIGN_DATE_2, today)

  pdf.setTitle(`Application for a Work Permit Visa 1401 - ${clean(fullName)}`)
  return pdf.save()
}

export async function buildApplicationForm(app: Application): Promise<Uint8Array> {
  const template = await fetchBytes(FORM_TEMPLATE_PATH)
  if (!template) {
    throw new Error(
      "The form template was not found. Add public/templates/visa-form-1401-template.pdf to the project and redeploy.",
    )
  }
  const photoUrl = app.formDetails?.photoUrl || app.photoUrl
  let photo: Uint8Array | null = null
  if (photoUrl) {
    const raw = await fetchBytes(photoUrl)
    if (raw) photo = await photoToJpeg(raw)
  }
  return fillApplicationForm(template, app, photo)
}
