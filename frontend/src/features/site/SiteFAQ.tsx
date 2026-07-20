import { ArrowRight, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

import { SitePageHeader } from "@/features/site/components"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

type QA = { q: string; a: string }
type Category = { title: string; items: QA[] }

const CATEGORIES: Category[] = [
  {
    title: "Studying in China",
    items: [
      { q: "Why study in China?", a: "China offers Ministry of Education–listed universities, a growing range of English-taught degrees, affordable tuition and living costs, and generous scholarships — with globally recognised qualifications." },
      { q: "Can I study in English?", a: "Yes. Many universities offer full degrees taught entirely in English, especially in medicine, engineering and business. Chinese-taught programs and language foundation options are also available." },
      { q: "Do I need to speak Chinese?", a: "Not for English-taught programs. For Chinese-taught programs you may need an HSK qualification; we can advise on a foundation year or language program if needed." },
      { q: "Are the degrees recognised internationally?", a: "CAS works with Ministry of Education–listed universities whose degrees are widely recognised. Recognition specifics vary by country and profession, so ask your advisor about your target country." },
    ],
  },
  {
    title: "Choosing a university & program",
    items: [
      { q: "How do I choose the right university and program?", a: "Start with a free study plan — tell us your goal, budget and preferences and a CAS advisor sends you a personalised shortlist. You can also browse and filter universities, programs and scholarships on this site." },
      { q: "What programs can I apply for?", a: "Bachelor's, master's and doctoral degrees plus non-degree and Chinese-language programs — across fields including medicine (MBBS), engineering, business, computer science and more." },
      { q: "What does “MoE-listed” mean?", a: "It means the Ministry of Education has approved the university to enrol international students. CAS focuses on MoE-listed universities, which you can identify by the badge on each university page." },
    ],
  },
  {
    title: "Scholarships",
    items: [
      { q: "What scholarships are available?", a: "Government (CSC), provincial and university scholarships — both full (tuition, accommodation and a stipend) and partial. Availability varies by university, program and intake." },
      { q: "Am I eligible for a scholarship?", a: "Eligibility depends on your grades, level, nationality and the specific award. Your CAS advisor matches you to the scholarships you have the best chance of winning." },
      { q: "Does CAS help with scholarship applications?", a: "Yes — we help you identify suitable scholarships, prepare the documents and submit on time alongside your university application." },
    ],
  },
  {
    title: "Applying with CAS",
    items: [
      { q: "How does the application process work?", a: "Study plan → shortlist → prepare your documents → CAS submits your application → you receive an offer → visa support → arrival support. One team handles the whole journey." },
      { q: "What documents will I need?", a: "Typically your passport, academic transcripts and certificates, passport photos and, depending on the program, a language certificate and medical or police checks. Your advisor gives you an exact checklist." },
      { q: "How long does it take?", a: "It varies by university and intake — often a few weeks to a couple of months from application to offer. Applying early in the intake window gives you the most options." },
      { q: "Is the consultation really free?", a: "Yes. Your initial consultation and study plan are free with no obligation. Any paid services are quoted clearly up front — see our pricing page." },
    ],
  },
  {
    title: "Visa & arrival",
    items: [
      { q: "How do I get a student visa?", a: "After you're admitted, the university issues an admission letter and a JW202 form; you then apply for a student (X) visa at a Chinese embassy or consulate. CAS guides you through each step." },
      { q: "Does CAS support me after I arrive?", a: "Yes — airport pickup, help with university registration, accommodation and settling in are part of our end-to-end support." },
    ],
  },
  {
    title: "Fees & payments",
    items: [
      { q: "How much does it cost to study in China?", a: "It depends on the university, city and program — tuition plus living costs. Tell us your plan and we'll give you a clear, personalised estimate." },
      { q: "What does CAS charge?", a: "Your consultation and study plan are free. Where a service has a fee, you'll see an itemised quote before you commit — there are no hidden charges." },
    ],
  },
]

function faqJsonLd(cats: Category[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cats.flatMap((c) => c.items).map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }
}

export default function SiteFAQ() {
  useSeo({
    title: "FAQ — Studying in China with CAS",
    description: "Answers to common questions about studying in China with CAS: choosing a university and program, scholarships, applying, student visas, arrival support and fees.",
    canonicalPath: "/site/faq",
    jsonLd: faqJsonLd(CATEGORIES),
  })

  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow="Help centre"
        title="Frequently asked questions"
        subtitle="Everything you need to know about studying in China with CAS — from choosing a university to visas, scholarships and fees."
      />

      {CATEGORIES.map((cat) => (
        <section key={cat.title}>
          <h2 className="mb-3 text-lg font-semibold text-cas-navy">{cat.title}</h2>
          <div className="divide-y overflow-hidden rounded-sm border bg-card shadow-sm">
            {cat.items.map((item, i) => {
              const id = `${cat.title}-${i}`
              const isOpen = open === id

              return (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium text-ink sm:text-base">{item.q}</span>
                    <ChevronDown className={cn("size-5 shrink-0 text-cas-navy transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</p>}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Still have questions?</h2>
          <p className="mt-1 text-sm text-white/80">Get a free study plan and a CAS advisor will answer everything for your situation.</p>
        </div>
        <Link to="/site/study-plan" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-gold px-6 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">
          Get a free study plan <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}
