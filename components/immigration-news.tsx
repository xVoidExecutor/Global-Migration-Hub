import { ArrowUpRight } from "lucide-react"
import { Reveal } from "@/components/reveal"

const articles = [
  {
    category: "Policy Update",
    date: "June 28, 2026",
    title: "New skilled worker salary thresholds take effect this quarter",
    excerpt:
      "Employers should review updated minimum salary requirements before submitting sponsorship applications for the upcoming intake.",
  },
  {
    category: "Processing Times",
    date: "June 15, 2026",
    title: "Priority visa services expanded to eight additional countries",
    excerpt:
      "Applicants in newly added regions can now access expedited decision timelines for select work and family visa categories.",
  },
  {
    category: "Guidance",
    date: "June 02, 2026",
    title: "What the digital ID rollout means for permit holders",
    excerpt:
      "A practical guide to transitioning from physical documents to digital immigration status and what you need to prepare.",
  },
]

export function ImmigrationNews() {
  return (
    <section id="news" className="scroll-mt-20 bg-secondary py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <span className="text-sm font-semibold uppercase tracking-wider text-accent">
              Stay informed
            </span>
            <h2 className="mt-3 text-balance font-serif text-3xl font-semibold text-foreground sm:text-4xl">
              Immigration News
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground">
              The latest policy changes, processing updates, and expert guidance to
              keep your application on track.
            </p>
          </div>
          <a
            href="#news"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            View all updates
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {articles.map((article, i) => (
            <Reveal
              as="article"
              key={article.title}
              delay={i * 130}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-sm bg-secondary px-2.5 py-1 font-medium text-primary">
                  {article.category}
                </span>
                <time className="text-muted-foreground">{article.date}</time>
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold leading-snug text-foreground">
                {article.title}
              </h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
              <a
                href="#news"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Read more
                <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
