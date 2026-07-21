import { Play, Quote, X } from "lucide-react"
import { useState } from "react"

import worldMap from "@/assets/worldmap-dots.png"

const pravatar = (n: number) => `https://i.pravatar.cc/120?img=${n}`
// Real flag images — Windows can't render regional-indicator flag emoji.
const flag = (code: string) => `https://flagcdn.com/32x24/${code}.png`

// Placeholder video — swap for CAS's own YouTube ID.
const YT_ID = "M7lc1UVf-VE"

type Review = { name: string; country: string; code: string; quote: string; img: number; l: string; t: string }

// Reviewers pinned at their (approx) country position on the dotted map.
const REVIEWS: Review[] = [
  { name: "Bensen Nolan", country: "United States", code: "us", img: 12, l: "23%", t: "27%", quote: "Thank you CAS — you've been a huge help, and it was completely free. I'll be recommending you to everyone I know who wants to study in China." },
  { name: "Diego Fernández", country: "Mexico", code: "mx", img: 51, l: "22%", t: "40%", quote: "They matched me to the perfect MBBS program and handled my whole application. I couldn't have done it alone." },
  { name: "Sofia Rossi", country: "Italy", code: "it", img: 31, l: "53%", t: "24%", quote: "The scholarship guidance alone saved me a fortune. Every message was answered within a day." },
  { name: "Amara Okafor", country: "Nigeria", code: "ng", img: 47, l: "52%", t: "50%", quote: "From choosing my university to my visa, CAS supported me at every step. Truly end to end." },
  { name: "Sara Ahmed", country: "Egypt", code: "eg", img: 45, l: "58%", t: "37%", quote: "I was nervous about studying abroad, but my advisor made everything simple and clear." },
  { name: "Aarav Sharma", country: "India", code: "in", img: 60, l: "72%", t: "40%", quote: "Fast, professional and honest about costs. I'm now studying engineering in China with a scholarship." },
  { name: "Bilal Rahman", country: "Pakistan", code: "pk", img: 14, l: "69%", t: "33%", quote: "They even helped me after I arrived — registration, banking, accommodation. Zero stress." },
  { name: "Mei Lin", country: "Malaysia", code: "my", img: 26, l: "80%", t: "55%", quote: "Genuinely the best service for studying in China. Worth every minute I spent talking to them." },
]

const MONITOR_FACES = [5, 8, 33, 20, 3, 65]

/** Reviews section modelled on the reference: a monitor that opens a video
 *  popup + a dotted world map whose avatars reveal a review card on hover. */
export default function SiteReviews() {
  const [active, setActive] = useState<number | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const r = active === null ? null : REVIEWS[active]

  return (
    <section>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-cas-navy sm:text-3xl">Reviews from our students</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Students from 50+ countries trust CAS with their journey.</p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Monitor — click to play the video */}
        <div className="mx-auto w-full max-w-sm">
          <button
            type="button"
            onClick={() => setVideoOpen(true)}
            aria-label="Play student stories video"
            className="group relative block w-full overflow-hidden rounded-sm border-[6px] border-cas-navy bg-cas-navy shadow-sm"
          >
            <div className="grid grid-cols-3 gap-px">
              {MONITOR_FACES.map((f) => (
                <img key={f} src={pravatar(f)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              ))}
            </div>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-cas-navy shadow transition-transform group-hover:scale-110"><Play className="size-6 fill-current" /></span>
            </span>
          </button>
          <div className="mx-auto h-3 w-16 bg-cas-navy/70" />
          <div className="mx-auto h-1.5 w-40 rounded-sm bg-cas-navy/40" />
        </div>

        {/* Dotted world map with pinned avatars + hover-reveal card */}
        <div className="relative" onMouseLeave={() => setActive(null)}>
          <img src={worldMap} alt="Students across the world" className="pointer-events-none w-full select-none" />

          {REVIEWS.map((rv, i) => (
            <button
              key={rv.name}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-label={`Review from ${rv.name}, ${rv.country}`}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: rv.l, top: rv.t }}
            >
              <img
                src={pravatar(rv.img)}
                alt=""
                loading="lazy"
                className={
                  "rounded-full border-2 object-cover shadow transition-all " +
                  (active === i ? "z-10 size-12 scale-110 border-cas-red ring-2 ring-cas-red/40" : "size-10 border-white hover:scale-110")
                }
              />
            </button>
          ))}

          {/* Review card — hidden until an avatar is hovered/tapped */}
          {r && (
            <div className="absolute top-1/2 left-0 z-20 w-[19rem] max-w-[92%] -translate-y-1/2 rounded-sm border-2 border-cas-red bg-white p-4 shadow-xl">
              <span className="absolute top-1/2 right-0 hidden size-3.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-t-2 border-r-2 border-cas-red bg-white sm:block" />
              <div className="flex items-center gap-3">
                <img src={pravatar(r.img)} alt="" className="size-14 rounded-sm object-cover" />
                <div>
                  <p className="font-semibold text-cas-red-600">{r.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-cas-navy">
                    <img src={flag(r.code)} alt="" width={20} height={15} className="rounded-[1px] border" />
                    {r.country}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
                <Quote className="size-4 shrink-0 text-cas-red" />
                <span>{r.quote}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* YouTube popup */}
      {videoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setVideoOpen(false)}>
          <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              aria-label="Close video"
              className="absolute -top-10 right-0 inline-flex items-center gap-1 text-sm text-white transition-colors hover:text-cas-red"
            >
              <X className="size-6" /> Close
            </button>
            <div className="aspect-video overflow-hidden rounded-sm bg-black shadow-2xl">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube.com/embed/${YT_ID}?autoplay=1&rel=0`}
                title="CAS — Study in China"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
