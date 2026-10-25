export type ManualStatus = "auto" | "0" | "1" | "2" | "3" | "rejected"

// Which identifier is used (together with Date of Birth) to look up an application on
// the public /track page. Set/changed ONLY from the admin panel — applicants never
// choose this themselves.
export type TrackingMethod = "passport" | "nationalId"

export const TRACKING_METHOD_LABELS: Record<TrackingMethod, string> = {
  passport: "Passport Number",
  nationalId: "National ID Number",
}

/** Returns the effective tracking method for an application, defaulting to "passport". */
export function getTrackingMethod(app: Pick<Application, "trackingMethod">): TrackingMethod {
  return app.trackingMethod === "nationalId" ? "nationalId" : "passport"
}

export const STAGE_LABELS = ["Submitted", "Processing", "Document Verified", "Visa Approved"] as const

export const DEFAULT_DOCUMENT_GROUPS = [
  "Passport",
  "Job Offer Letter",
  "Police Clearance Certificate",
  "Offer Letter / Admission Letter",
  "Hotel Booking / Invitation Letter",
  "Trade License / Invitation Letter",
  "Medical Invitation / Appointment",
  "Relationship Proof",
  "Supporting Document",
  "Other Document",
]

export type ApplyingMethod = "self" | "agency"

export interface AppDocument {
  id: string
  name: string
  groupName: string
  dataUrl?: string
  addedBy: "applicant" | "admin"
  addedAt: string
}

export interface Application {
  id: string
  // Step 1: Personal & Contact Information
  fullName: string
  passportNumber: string
  passportType: string
  dateOfBirth: string
  nationalId: string
  // Which of passportNumber / nationalId is used (together with Date of Birth) to match
  // this applicant on /track. Optional so existing/older records and the public apply
  // form (which never sets this) keep working — getTrackingMethod() treats a missing
  // value as "passport".
  trackingMethod?: TrackingMethod
  // A secret, unguessable token that grants direct access to this applicant's
  // /track profile via a shareable link — no passport/NID/DOB needed when the
  // link itself is used. Generated/revoked only from the admin panel. Passport,
  // National ID and Date of Birth still work as the normal fallback lookup
  // (per trackingMethod above) for anyone searching without the link.
  trackingLinkToken?: string
  nationality: string
  email: string
  phone: string
  // Step 2: Destination & Visa Selection
  destinationCountry: string
  visaType: string
  applyingMethod: ApplyingMethod
  // Step 3 — Case B: Through an Agency
  agencyCountry: string
  agencyName: string
  agencyReferenceNo: string
  // Step 3 — Case A: Self-apply, visa-type-specific free-text details
  // (e.g. universityName, purposeOfVisit, companyName, hospitalName,
  // sponsorRelationship, expectedSalary — only the relevant keys are set)
  visaDetails: Record<string, string>
  travelDate: string
  // Employer / company the applicant is going to work for (Work Permit Visa).
  // The applicant provides the name at submission; the logo is never uploaded
  // by the applicant — admin manually attaches it (and may correct the name)
  // after verifying the employer.
  employerName?: string
  employerLogoUrl?: string
  // Legacy field, kept for backward compatibility with older records / admin UI
  photoUrl: string
  submittedAt: string
  manualStatus: ManualStatus
  statusNote: string
  internalNotes: string
  documents: AppDocument[]
}

export type NewApplicationInput = Omit<
  Application,
  "id" | "submittedAt" | "manualStatus" | "statusNote" | "internalNotes"
>

export function effectiveStage(app: Application): number | "rejected" {
  if (app.manualStatus === "rejected") return "rejected"
  if (app.manualStatus !== "auto") return Number(app.manualStatus)

  const submitted = new Date(app.submittedAt).getTime()
  const daysElapsed = Math.max(0, (Date.now() - submitted) / (1000 * 60 * 60 * 24))
  const stage = Math.min(3, Math.floor(daysElapsed / 2))
  return stage
}

export function stageLabel(app: Application): string {
  const stage = effectiveStage(app)
  if (stage === "rejected") return "Rejected"
  return STAGE_LABELS[stage]
}

// --- Admin "profile viewed" notifications -----------------------------------
// Logged (server-side, in Redis) every time a visitor successfully opens their
// status on the public /track page, so the admin dashboard bell can show it.
export interface VisitNotification {
  id: string
  applicationId: string
  applicantName: string
  passportNumber: string
  destinationCountry: string
  viewedAt: string
}

export const MAX_VISIT_NOTIFICATIONS = 50

