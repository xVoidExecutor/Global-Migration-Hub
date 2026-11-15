import { Briefcase, Building2, Plane, GraduationCap, Users, FileCheck } from "lucide-react"

const services = [
  {
    icon: Briefcase,
    title: "Skilled Worker Visas",
    description:
      "End-to-end support for skilled worker applications, including eligibility assessment, sponsorship, and document preparation.",
  },
  {
    icon: Building2,
    title: "Employer Sponsorship",
    description:
      "Help businesses obtain sponsor licenses and stay compliant while hiring international talent with confidence.",
  },
  {
    icon: Plane,
    title: "Intra-Company Transfers",
    description:
      "Relocate your key employees across borders smoothly with our specialist intra-company transfer guidance.",
  },
  {
    icon: GraduationCap,
    title: "Graduate & Talent Routes",
    description:
      "Tailored pathways for graduates, researchers, and highly skilled individuals seeking new opportunities abroad.",
  },
  {
    icon: Users,
    title: "Family Dependant Permits",
    description:
      "Bring your loved ones with you. We handle dependant applications so your family stays together.",
  },
  {
    icon: FileCheck,
    title: "Compliance & Renewals",
    description:
      "Ongoing compliance checks, permit renewals, and extension support to keep your status secure.",
  },
]

export function WorkPermitServices() {
  return (
    <section id="services" className="scroll-mt-20 bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-accent">
            What we offer
          </span>
          <h2 className="mt-3 text-balance font-serif text-3xl font-semibold text-foreground sm:text-4xl">
            Our Core Services
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
            Comprehensive immigration solutions designed for professionals and
            employers navigating the complexities of global mobility.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service.title}
              className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <span className="flex size-12 items-center justify-center rounded-lg bg-secondary text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <service.icon className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-serif text-xl font-semibold text-foreground">
                {service.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
