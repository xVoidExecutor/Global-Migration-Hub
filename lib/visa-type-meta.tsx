import { Briefcase, GraduationCap, Plane, Building2, HeartPulse, Users, ArrowLeftRight, Award, Landmark, Sprout, Rocket, Star, Compass, Moon, Trophy } from "lucide-react"
import type { CustomSelectOption } from "@/components/custom-select"

// The `value` fields below MUST stay exactly as-is — they match lib/countries.ts
// VISA_TYPES and are used throughout the app (document requirements, admin filters).
// Only `label` and `subtitle` control what the user actually sees.
export const VISA_TYPE_OPTIONS: CustomSelectOption[] = [
  {
    value: "Global Work Permit Visa",
    label: "Global Work Permit Visa",
    subtitle: "For skilled workers & job offers",
    icon: Briefcase,
  },
  {
    value: "International Student Visa",
    label: "International Student Visa",
    subtitle: "For university & college admission",
    icon: GraduationCap,
  },
  {
    value: "Tourist & Visitor Visa",
    label: "Tourist & Visitor Visa",
    subtitle: "For short-term travel & visits",
    icon: Plane,
  },
  {
    value: "Business & Trade Visa",
    label: "Business & Trade Visa",
    subtitle: "For trade, meetings & investment",
    icon: Building2,
  },
  {
    value: "Medical Treatment Visa",
    label: "Medical Treatment Visa",
    subtitle: "For treatment & medical appointments",
    icon: HeartPulse,
  },
  {
    value: "Family Reunion Visa",
    label: "Family Reunion Visa",
    subtitle: "For joining a spouse or family member",
    icon: Users,
  },
  {
    value: "Airport Transit Visa",
    label: "Airport Transit Visa",
    subtitle: "For layovers & connecting flights",
    icon: ArrowLeftRight,
  },
  {
    value: "Permanent Residency (PR) Visa",
    label: "Permanent Residency (PR) Visa",
    subtitle: "For long-term settlement",
    icon: Award,
  },
  {
    value: "Diplomatic & Official Visa",
    label: "Diplomatic & Official Visa",
    subtitle: "For official government travel",
    icon: Landmark,
  },
  {
    value: "Skilled Migration Visa",
    label: "Skilled Migration Visa",
    subtitle: "Points-based visa for in-demand professionals",
    icon: Star,
  },
  {
    value: "Employer Sponsored Visa",
    label: "Employer Sponsored Visa",
    subtitle: "Sponsored directly by an approved employer",
    icon: Briefcase,
  },
  {
    value: "Seasonal & Agricultural Worker Visa",
    label: "Seasonal & Agricultural Worker Visa",
    subtitle: "For farm, harvest & seasonal industry work",
    icon: Sprout,
  },
  {
    value: "Working Holiday Visa",
    label: "Working Holiday Visa",
    subtitle: "Travel and work for up to a year",
    icon: Compass,
  },
  {
    value: "Post-Study Work Visa",
    label: "Post-Study Work Visa",
    subtitle: "Stay and work after you graduate",
    icon: GraduationCap,
  },
  {
    value: "Investor & Entrepreneur Visa",
    label: "Investor & Entrepreneur Visa",
    subtitle: "For starting or investing in a business",
    icon: Rocket,
  },
  {
    value: "Dependent & Parent Visa",
    label: "Dependent & Parent Visa",
    subtitle: "For children, parents & other dependants",
    icon: Users,
  },
  {
    value: "Hajj & Umrah Pilgrimage Visa",
    label: "Hajj & Umrah Pilgrimage Visa",
    subtitle: "For religious pilgrimage travel",
    icon: Moon,
  },
  {
    value: "Sports & Cultural Exchange Visa",
    label: "Sports & Cultural Exchange Visa",
    subtitle: "For athletes, artists & exchange programs",
    icon: Trophy,
  },
]
