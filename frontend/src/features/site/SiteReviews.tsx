import { Play, Quote } from "lucide-react"
import { useState } from "react"

const pravatar = (n: number) => `https://i.pravatar.cc/120?img=${n}`
// Real flag images — Windows can't render regional-indicator flag emoji.
const flag = (code: string) => `https://flagcdn.com/32x24/${code}.png`

type Review = { name: string; country: string; code: string; quote: string; img: number; l: string; t: string }

// Reviewers pinned across the right of the map (the card overlaps the left).
const REVIEWS: Review[] = [
  { name: "Bensen Nolan", country: "United States", code: "us", img: 12, l: "62%", t: "30%", quote: "Thank you CAS — you've been a huge help, and it was completely free. I'll be recommending you to everyone I know who wants to study in China." },
  { name: "Diego Fernández", country: "Mexico", code: "mx", img: 51, l: "58%", t: "58%", quote: "They matched me to the perfect MBBS program and handled my whole application. I couldn't have done it alone." },
  { name: "Sofia Rossi", country: "Italy", code: "it", img: 31, l: "70%", t: "18%", quote: "The scholarship guidance alone saved me a fortune. Every message was answered within a day." },
  { name: "Amara Okafor", country: "Nigeria", code: "ng", img: 47, l: "68%", t: "48%", quote: "From choosing my university to my visa, CAS supported me at every step. Truly end to end." },
  { name: "Sara Ahmed", country: "Egypt", code: "eg", img: 45, l: "78%", t: "32%", quote: "I was nervous about studying abroad, but my advisor made everything simple and clear." },
  { name: "Aarav Sharma", country: "India", code: "in", img: 60, l: "85%", t: "54%", quote: "Fast, professional and honest about costs. I'm now studying engineering in China with a scholarship." },
  { name: "Bilal Rahman", country: "Pakistan", code: "pk", img: 14, l: "90%", t: "26%", quote: "They even helped me after I arrived — registration, banking, accommodation. Zero stress." },
  { name: "Mei Lin", country: "Malaysia", code: "my", img: 26, l: "82%", t: "74%", quote: "Genuinely the best service for studying in China. Worth every minute I spent talking to them." },
]

const MONITOR_FACES = [5, 8, 33, 20, 3, 65]

const MAP_DOTS = {
  backgroundImage: "radial-gradient(circle, rgba(20,53,124,0.16) 1.5px, transparent 1.5px)",
  backgroundSize: "22px 22px",
}

/** Reviews section modelled on the reference: a monitor video-call grid + a
 *  world map of student avatars that reveal a review card on hover/focus. */
export default function SiteReviews() {
  const [active, setActive] = useState(0)
  const r = REVIEWS[active]

  return (
    <section>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-cas-navy sm:text-3xl">Reviews from our students</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Students from 50+ countries trust CAS with their journey.</p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Monitor with a video-call grid */}
        <div className="mx-auto w-full max-w-sm">
          <div className="relative overflow-hidden rounded-sm border-[6px] border-cas-navy bg-cas-navy shadow-sm">
            <div className="grid grid-cols-3 gap-px">
              {MONITOR_FACES.map((f) => (
                <img key={f} src={pravatar(f)} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              ))}
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/85 text-cas-navy shadow"><Play className="size-5 fill-current" /></span>
            </div>
          </div>
          <div className="mx-auto h-3 w-16 bg-cas-navy/70" />
          <div className="mx-auto h-1.5 w-40 rounded-sm bg-cas-navy/40" />
        </div>

        {/* World map with pinned avatars + hover review card */}
        <div className="relative min-h-[320px]">
          <div className="pointer-events-none absolute inset-0" style={MAP_DOTS} />

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
                  "size-11 rounded-full border-2 object-cover shadow transition-all " +
                  (active === i ? "z-10 scale-110 border-cas-orange ring-2 ring-cas-orange/40" : "border-white hover:scale-105")
                }
              />
            </button>
          ))}

          {/* Review card (updates on hover/tap) */}
          <div className="relative z-20 mt-4 max-w-md rounded-sm border-2 border-cas-orange bg-white p-4 shadow-sm sm:absolute sm:top-1/2 sm:left-0 sm:mt-0 sm:-translate-y-1/2">
            {/* Orange pointer toward the map (desktop) */}
            <span className="absolute top-1/2 right-0 hidden size-3.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-t-2 border-r-2 border-cas-orange bg-white sm:block" />
            <div className="flex items-center gap-3">
              <img src={pravatar(r.img)} alt="" className="size-14 rounded-sm object-cover" />
              <div>
                <p className="font-semibold text-cas-orange-600">{r.name}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-cas-navy">
                  <img src={flag(r.code)} alt="" width={20} height={15} className="rounded-[1px] border" />
                  {r.country}
                </p>
              </div>
            </div>
            <p className="mt-3 flex gap-2 text-sm text-muted-foreground">
              <Quote className="size-4 shrink-0 text-cas-orange" />
              <span>{r.quote}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
