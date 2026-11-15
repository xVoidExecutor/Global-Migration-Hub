"use client"

import { Suspense, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BrandMark } from "@/components/brand-logo"
import {
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Building2,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocumentUpload } from "@/components/document-upload"
import { CustomSelect } from "@/components/custom-select"
import { VISA_TYPE_OPTIONS } from "@/lib/visa-type-meta"
import {
  ALL_COUNTRIES,
  COUNTRY_CODES,
  formatCountry,
  PASSPORT_TYPES,
  VISIT_PURPOSES,
} from "@/lib/countries"
import { AGENCY_COUNTRIES, getAgenciesForCountry } from "@/lib/agencies"
import type { AppDocument, ApplyingMethod, NewApplicationInput } from "@/lib/admin/types"

const MAX_FILE_BYTES = 4 * 1024 * 1024 // 4 MB

async function uploadApplicantFile(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/upload", { method: "POST", body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || `Upload failed (${res.status})`)
  }
  const data = (await res.json()) as { url: string }
  return data.url
}

type Step = 1 | 2 | 3

type UploadKey =
  | "jobOfferLetter"
  | "policeClearance"
  | "offerLetter"
  | "hotelBooking"
  | "tradeLicense"
  | "medicalInvitation"
  | "relationshipProof"
  | "supportingDocument"

const UPLOAD_GROUP_NAMES: Record<UploadKey, string> = {
  jobOfferLetter: "Job Offer Letter",
  policeClearance: "Police Clearance Certificate",
  offerLetter: "Offer Letter / Admission Letter",
  hotelBooking: "Hotel Booking / Invitation Letter",
  tradeLicense: "Trade License / Invitation Letter",
  medicalInvitation: "Medical Invitation / Appointment",
  relationshipProof: "Relationship Proof",
  supportingDocument: "Supporting Document",
}

function fieldClass() {
  return "mt-1.5 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
}

type SubmittedInfo = {
  fullName: string
  visaType: string
  destinationCountry: string
  passportNumber: string
  dateOfBirth: string
  email: string
  applyingMethod: string
  agencyReferenceNo: string
}

function ApplyPageContent() {
  const searchParams = useSearchParams()
  const prefillCountry = searchParams.get("country") ?? ""

  const [step, setStep] = useState<Step>(1)
  const [submitted, setSubmitted] = useState<SubmittedInfo | null>(null)
  const [error, setError] = useState("")

  // ---- Step 1: Personal & Contact Information ----
  const [fullName, setFullName] = useState("")
  const [passportNumber, setPassportNumber] = useState("")
  const [passportType, setPassportType] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [nationalId, setNationalId] = useState("")
  const [nationality, setNationality] = useState("")
  const [email, setEmail] = useState("")
  const [phoneCode, setPhoneCode] = useState("+880")
  const [phone, setPhone] = useState("")

  // ---- Step 2: Destination & Visa Selection ----
  const [destinationCountry, setDestinationCountry] = useState(prefillCountry)
  const [visaType, setVisaType] = useState("")
  const [applyingMethod, setApplyingMethod] = useState<ApplyingMethod | "">("")

  // ---- Step 3: Case B — Agency ----
  const [agencyCountry, setAgencyCountry] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [agencyReferenceNo, setAgencyReferenceNo] = useState("")

  // ---- Step 3: Case A — self-apply dynamic text fields ----
  const [universityName, setUniversityName] = useState("")
  const [purposeOfVisit, setPurposeOfVisit] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [workCompanyName, setWorkCompanyName] = useState("")
  const [hospitalName, setHospitalName] = useState("")
  const [sponsorRelationship, setSponsorRelationship] = useState("")
  const [expectedSalary, setExpectedSalary] = useState("")
  const [travelDate, setTravelDate] = useState("")

  // ---- Step 3: file uploads ----
  const [uploads, setUploads] = useState<Partial<Record<UploadKey, { name: string; url: string }>>>({})
  const [uploadingKeys, setUploadingKeys] = useState<Partial<Record<UploadKey, boolean>>>({})
  const [uploadErrors, setUploadErrors] = useState<Partial<Record<UploadKey, string>>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleFileSelected(key: UploadKey, file: File | null) {
    if (!file) return
    setUploadErrors((e) => ({ ...e, [key]: undefined }))
    if (file.size > MAX_FILE_BYTES) {
      setUploadErrors((e) => ({ ...e, [key]: "File is too large. Please use a file under 4 MB." }))
      return
    }
    setUploadingKeys((u) => ({ ...u, [key]: true }))
    try {
      const url = await uploadApplicantFile(file)
      setUploads((u) => ({ ...u, [key]: { name: file.name, url } }))
    } catch {
      setUploadErrors((e) => ({ ...e, [key]: "Upload failed. Please try again." }))
    } finally {
      setUploadingKeys((u) => ({ ...u, [key]: false }))
    }
  }

  function handleStep1Submit(e: FormEvent) {
    e.preventDefault()
    if (
      !fullName.trim() ||
      !passportNumber.trim() ||
      !passportType ||
      !dateOfBirth ||
      !nationality.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      setError("Please fill in all required fields.")
      return
    }
    setError("")
    setStep(2)
  }

  function handleStep2Submit(e: FormEvent) {
    e.preventDefault()
    if (!destinationCountry || !visaType || !applyingMethod) {
      setError("Please select destination country, visa type, and how you are applying.")
      return
    }
    setError("")
    setStep(3)
  }

  const agencyOptions = agencyCountry ? getAgenciesForCountry(agencyCountry) : []
  const selectedAgency = agencyOptions.find((a) => a.name === agencyName)

  async function handleFinalSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")

    let documents: AppDocument[] = []
    const now = new Date().toISOString()

    if (applyingMethod === "agency") {
      if (!agencyCountry || !agencyName || !agencyReferenceNo.trim()) {
        setError("Please fill in the agency country, agency name, and reference number.")
        return
      }
    } else {
      // self-apply — validate based on visa type
      if (visaType === "Work Permit Visa") {
        if (!workCompanyName.trim() || !uploads.jobOfferLetter || !uploads.policeClearance) {
          setError("Please provide the company name and upload the Job Offer Letter and Police Clearance Certificate.")
          return
        }
      } else if (visaType === "Student / Study Visa") {
        if (!universityName.trim() || !uploads.offerLetter) {
          setError("Please provide the university name and upload the Offer/Admission Letter.")
          return
        }
      } else if (visaType === "Tourist / Visit Visa") {
        if (!purposeOfVisit || !uploads.hotelBooking) {
          setError("Please select a purpose of visit and upload the Hotel Booking / Invitation Letter.")
          return
        }
      } else if (visaType === "Business Visa") {
        if (!companyName.trim() || !uploads.tradeLicense) {
          setError("Please provide the company name and upload the Trade License / Invitation Letter.")
          return
        }
      } else if (visaType === "Medical Visa") {
        if (!hospitalName.trim() || !uploads.medicalInvitation) {
          setError("Please provide the hospital name and upload the Medical Invitation / Appointment.")
          return
        }
      } else if (visaType === "Family / Spouse Visa") {
        if (!sponsorRelationship.trim() || !uploads.relationshipProof) {
          setError("Please provide the sponsor's name/relationship and upload the Relationship Proof.")
          return
        }
      }

      documents = (Object.keys(uploads) as UploadKey[])
        .filter((key) => uploads[key])
        .map((key) => ({
          id: `doc_${key}_${Date.now()}`,
          name: uploads[key]!.name,
          groupName: UPLOAD_GROUP_NAMES[key],
          dataUrl: uploads[key]!.url,
          addedBy: "applicant" as const,
          addedAt: now,
        }))
    }

    const visaDetails: Record<string, string> = {}
    if (universityName.trim()) visaDetails.universityName = universityName.trim()
    if (purposeOfVisit) visaDetails.purposeOfVisit = purposeOfVisit
    if (companyName.trim()) visaDetails.companyName = companyName.trim()
    if (hospitalName.trim()) visaDetails.hospitalName = hospitalName.trim()
    if (sponsorRelationship.trim()) visaDetails.sponsorRelationship = sponsorRelationship.trim()
    if (expectedSalary.trim()) visaDetails.expectedSalary = expectedSalary.trim()
    if (applyingMethod === "agency" && selectedAgency) {
      visaDetails.agencyPrimaryContact = selectedAgency.primaryPerson
      visaDetails.agencySecondaryContact = selectedAgency.secondaryPerson
    }

    const payload: NewApplicationInput = {
      fullName: fullName.trim(),
      passportNumber: passportNumber.trim(),
      passportType,
      dateOfBirth,
      nationalId: nationalId.trim(),
      nationality: nationality.trim(),
      email: email.trim(),
      phone: `${phoneCode} ${phone.trim()}`,
      destinationCountry,
      visaType,
      applyingMethod: applyingMethod as ApplyingMethod,
      agencyCountry: applyingMethod === "agency" ? agencyCountry : "",
      agencyName: applyingMethod === "agency" ? agencyName : "",
      agencyReferenceNo: applyingMethod === "agency" ? agencyReferenceNo.trim() : "",
      visaDetails,
      travelDate,
      employerName: visaType === "Work Permit Visa" ? workCompanyName.trim() : "",
      employerLogoUrl: "",
      photoUrl: "",
      documents,
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSubmitted({
          fullName: payload.fullName,
          visaType: payload.visaType,
          destinationCountry: payload.destinationCountry,
          passportNumber: payload.passportNumber,
          dateOfBirth: payload.dateOfBirth,
          email: payload.email,
          applyingMethod: payload.applyingMethod,
          agencyReferenceNo: payload.agencyReferenceNo,
        })
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error || "Something went wrong while submitting your application. Please try again.")
      }
    } catch {
      setError("Something went wrong while submitting your application. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Global Migration Hub home">
            <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary">
              <img src="/icon.png" alt="Global Migration Hub" className="size-full object-cover" />
            </span>
            <span className="font-serif text-lg font-semibold leading-tight text-foreground">
              Global Migration Hub
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Cancel
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-6 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-16 rounded-full ${
                step === s ? "bg-primary" : step > s ? "bg-primary/40" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <div>
              <h1 className="font-serif text-2xl font-semibold text-foreground">Personal &amp; Contact Information</h1>
              <p className="mt-1 text-sm text-muted-foreground">Step 1 of 3 — Tell us about yourself.</p>

              <form onSubmit={handleStep1Submit} className="mt-6 space-y-4" noValidate>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full legal name"
                    className={fieldClass()}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="passportNumber" className="block text-sm font-medium text-foreground">
                      Passport Number <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="passportNumber"
                      value={passportNumber}
                      onChange={(e) => setPassportNumber(e.target.value)}
                      placeholder="e.g. A1234567"
                      className={fieldClass()}
                    />
                  </div>
                  <div>
                    <label htmlFor="passportType" className="block text-sm font-medium text-foreground">
                      Passport Type <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="passportType"
                      value={passportType}
                      onChange={(e) => setPassportType(e.target.value)}
                      className={fieldClass()}
                    >
                      <option value="">Select passport type</option>
                      {PASSPORT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground">
                      Date of Birth <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className={fieldClass()}
                    />
                  </div>
                  <div>
                    <label htmlFor="nationalId" className="block text-sm font-medium text-foreground">
                      National ID Card <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      id="nationalId"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="e.g. 199XXXXXXXXXX"
                      className={fieldClass()}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-foreground">
                      Nationality <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="nationality"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      placeholder="e.g. Bangladeshi"
                      className={fieldClass()}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                      Email Address <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={fieldClass()}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground">
                    Phone Number <span className="text-destructive">*</span>
                  </label>
                  <div className="mt-1.5 flex gap-2">
                    <select
                      aria-label="Country code"
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      className="w-24 shrink-0 rounded-lg border border-input bg-background px-2 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.name} value={c.dial}>
                          {c.dial}
                        </option>
                      ))}
                    </select>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="1XXX-XXXXXX"
                      className="w-full min-w-0 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </div>

                {error && (
                  <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4" aria-hidden="true" /> {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="h-12 w-full text-base">
                  Continue
                </Button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
              <h1 className="font-serif text-2xl font-semibold text-foreground">Destination &amp; Visa Selection</h1>
              <p className="mt-1 text-sm text-muted-foreground">Step 2 of 3 — Where are you headed?</p>

              <form onSubmit={handleStep2Submit} className="mt-6 space-y-4" noValidate>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="destinationCountry" className="block text-sm font-medium text-foreground">
                      Destination Country <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="destinationCountry"
                      value={destinationCountry}
                      onChange={(e) => setDestinationCountry(e.target.value)}
                      className={fieldClass()}
                    >
                      <option value="">Select a country</option>
                      {ALL_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {formatCountry(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="visaType" className="block text-sm font-medium text-foreground">
                      Visa Type <span className="text-destructive">*</span>
                    </label>
                    <div className="mt-1.5">
                      <CustomSelect
                        id="visaType"
                        value={visaType}
                        onChange={setVisaType}
                        options={VISA_TYPE_OPTIONS}
                        placeholder="Select a visa type"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-sm font-medium text-foreground">
                    How are you applying? <span className="text-destructive">*</span>
                  </span>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setApplyingMethod("self")}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                        applyingMethod === "self" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"
                      }`}
                    >
                      <UserRound className="size-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">I am applying myself</span>
                        <span className="block text-xs text-muted-foreground">Upload your own documents</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyingMethod("agency")}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
                        applyingMethod === "agency" ? "border-primary bg-primary/5" : "border-input hover:bg-muted"
                      }`}
                    >
                      <Building2 className="size-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold text-foreground">Through an Agency</span>
                        <span className="block text-xs text-muted-foreground">Applying via a registered agency</span>
                      </span>
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4" aria-hidden="true" /> {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="h-12 w-full text-base">
                  Continue
                </Button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back
              </button>
              <h1 className="font-serif text-2xl font-semibold text-foreground">Application Details &amp; Verification</h1>
              <p className="mt-1 text-sm text-muted-foreground">Step 3 of 3 — Almost done.</p>

              <form onSubmit={handleFinalSubmit} className="mt-6 space-y-4" noValidate>
                {applyingMethod === "agency" ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="agencyCountry" className="block text-sm font-medium text-foreground">
                          Agency Country <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="agencyCountry"
                          value={agencyCountry}
                          onChange={(e) => {
                            setAgencyCountry(e.target.value)
                            setAgencyName("")
                          }}
                          className={fieldClass()}
                        >
                          <option value="">Select a partner country</option>
                          {AGENCY_COUNTRIES.map((c) => (
                            <option key={c} value={c}>
                              {formatCountry(c)}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Only our verified partner countries are listed here.
                        </p>
                      </div>
                      <div>
                        <label htmlFor="agencyName" className="block text-sm font-medium text-foreground">
                          Agency Name <span className="text-destructive">*</span>
                        </label>
                        <select
                          id="agencyName"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          disabled={!agencyCountry}
                          className={fieldClass()}
                        >
                          <option value="">{agencyCountry ? "Select an agency" : "Select a country first"}</option>
                          {agencyOptions.map((a) => (
                            <option key={a.name} value={a.name}>
                              {a.recommended ? "⭐ " : ""}
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {selectedAgency && (
                      <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground">{selectedAgency.name} — Key Personnel</p>
                        <p className="mt-1">
                          <span className="font-medium text-foreground">Primary:</span> {selectedAgency.primaryPerson}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Secondary:</span>{" "}
                          {selectedAgency.secondaryPerson}
                        </p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="agencyReferenceNo" className="block text-sm font-medium text-foreground">
                        Agency Reference Number <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="agencyReferenceNo"
                        value={agencyReferenceNo}
                        onChange={(e) => setAgencyReferenceNo(e.target.value)}
                        placeholder="Enter the reference number given by your agency"
                        className={fieldClass()}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Collect this manually from your agency — it is not auto-generated.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="travelDate2" className="block text-sm font-medium text-foreground">
                        Planned Travel Date <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <input
                        id="travelDate2"
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className={fieldClass()}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {visaType === "Work Permit Visa" && (
                      <>
                        <div>
                          <label htmlFor="workCompanyName" className="block text-sm font-medium text-foreground">
                            Company Name <span className="text-destructive">*</span>
                          </label>
                          <input
                            id="workCompanyName"
                            value={workCompanyName}
                            onChange={(e) => setWorkCompanyName(e.target.value)}
                            placeholder="Enter the name of the company you're going to work for"
                            className={fieldClass()}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                          <DocumentUpload
                            id="jobOfferLetter"
                            label="Job Offer Letter"
                            required
                            fileName={uploads.jobOfferLetter?.name}
                            uploading={uploadingKeys.jobOfferLetter}
                            error={uploadErrors.jobOfferLetter}
                            fileUrl={uploads.jobOfferLetter?.url}
                            onFileSelected={(f) => handleFileSelected("jobOfferLetter", f)}
                          />
                          <DocumentUpload
                            id="policeClearance"
                            label="Police Clearance Certificate"
                            required
                            fileName={uploads.policeClearance?.name}
                            uploading={uploadingKeys.policeClearance}
                            error={uploadErrors.policeClearance}
                            fileUrl={uploads.policeClearance?.url}
                            onFileSelected={(f) => handleFileSelected("policeClearance", f)}
                          />
                        </div>
                        <div>
                          <label htmlFor="expectedSalary" className="block text-sm font-medium text-foreground">
                            Expected Monthly Salary <span className="text-muted-foreground">(optional)</span>
                          </label>
                          <input
                            id="expectedSalary"
                            value={expectedSalary}
                            onChange={(e) => setExpectedSalary(e.target.value)}
                            placeholder="e.g. 1200 USD"
                            className={fieldClass()}
                          />
                        </div>
                      </>
                    )}

                    {visaType === "Student / Study Visa" && (
                      <DocumentUpload
                        id="offerLetter"
                        label="Offer / Admission Letter"
                        required
                        fileName={uploads.offerLetter?.name}
                        uploading={uploadingKeys.offerLetter}
                        error={uploadErrors.offerLetter}
                        fileUrl={uploads.offerLetter?.url}
                        onFileSelected={(f) => handleFileSelected("offerLetter", f)}
                      />
                    )}

                    {visaType === "Tourist / Visit Visa" && (
                      <DocumentUpload
                        id="hotelBooking"
                        label="Hotel Booking / Invitation Letter"
                        required
                        fileName={uploads.hotelBooking?.name}
                        uploading={uploadingKeys.hotelBooking}
                        error={uploadErrors.hotelBooking}
                        fileUrl={uploads.hotelBooking?.url}
                        onFileSelected={(f) => handleFileSelected("hotelBooking", f)}
                      />
                    )}

                    {visaType === "Business Visa" && (
                      <DocumentUpload
                        id="tradeLicense"
                        label="Trade License / Invitation Letter"
                        required
                        fileName={uploads.tradeLicense?.name}
                        uploading={uploadingKeys.tradeLicense}
                        error={uploadErrors.tradeLicense}
                        fileUrl={uploads.tradeLicense?.url}
                        onFileSelected={(f) => handleFileSelected("tradeLicense", f)}
                      />
                    )}

                    {visaType === "Medical Visa" && (
                      <DocumentUpload
                        id="medicalInvitation"
                        label="Medical Invitation / Appointment"
                        required
                        fileName={uploads.medicalInvitation?.name}
                        uploading={uploadingKeys.medicalInvitation}
                        error={uploadErrors.medicalInvitation}
                        fileUrl={uploads.medicalInvitation?.url}
                        onFileSelected={(f) => handleFileSelected("medicalInvitation", f)}
                      />
                    )}

                    {visaType === "Family / Spouse Visa" && (
                      <DocumentUpload
                        id="relationshipProof"
                        label="Relationship Proof"
                        required
                        fileName={uploads.relationshipProof?.name}
                        uploading={uploadingKeys.relationshipProof}
                        error={uploadErrors.relationshipProof}
                        fileUrl={uploads.relationshipProof?.url}
                        onFileSelected={(f) => handleFileSelected("relationshipProof", f)}
                      />
                    )}

                    {(visaType === "Transit Visa" ||
                      visaType === "Permanent Residency" ||
                      visaType === "Diplomatic Visa") && (
                    <DocumentUpload
                      id="supportingDocument"
                      label="Supporting Document"
                      fileName={uploads.supportingDocument?.name}
                      uploading={uploadingKeys.supportingDocument}
                      error={uploadErrors.supportingDocument}
                      fileUrl={uploads.supportingDocument?.url}
                      onFileSelected={(f) => handleFileSelected("supportingDocument", f)}
                    />
                    )}

                    <div>
                      <label htmlFor="travelDate" className="block text-sm font-medium text-foreground">
                        Planned Travel Date <span className="text-muted-foreground">(optional)</span>
                      </label>
                      <input
                        id="travelDate"
                        type="date"
                        value={travelDate}
                        onChange={(e) => setTravelDate(e.target.value)}
                        className={fieldClass()}
                      />
                    </div>
                  </>
                )}

                {error && (
                  <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="size-4" aria-hidden="true" /> {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="h-12 w-full gap-2 text-base" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {submitting ? "Submitting…" : "Submit Application"}
                </Button>

                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  Bank-grade encryption. Your details are only used to process your application.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      {submitted && <SuccessModal data={submitted} />}
    </main>
  )
}

function SuccessModal({ data }: { data: SubmittedInfo }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm animate-in fade-in-0 duration-300" />
      <div className="relative z-10 w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-8 text-center shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-foreground">🎉 Application Submitted Successfully!</h2>

        <p className="mt-4 text-sm text-muted-foreground">
          Dear <span className="font-semibold text-foreground">{data.fullName}</span>, your application for{" "}
          <span className="font-semibold text-foreground">{data.visaType}</span> to{" "}
          <span className="font-semibold text-foreground">{data.destinationCountry}</span> has been successfully
          received.
        </p>

        <div className="mt-4 rounded-xl bg-secondary/60 p-4 text-left text-sm">
          <p className="font-semibold text-foreground">How to Track:</p>
          <p className="mt-1 text-muted-foreground">You can track your visa status using your:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>
              Passport Number (<span className="font-medium text-foreground">{data.passportNumber}</span>)
            </li>
          </ol>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Our verification specialists will review your submitted data within 24 to 48 hours. A confirmation email
          has been sent to <span className="font-medium text-foreground">{data.email}</span>.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="h-11 flex-1 rounded-full">
            <Link href="/">Close</Link>
          </Button>
          <Button asChild className="h-11 flex-1 rounded-full">
            <Link href="/">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ApplyPage() {
  return (
    <Suspense fallback={null}>
      <ApplyPageContent />
    </Suspense>
  )
}
