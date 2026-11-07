import { geoCentroid, geoDistance, geoOrthographic, geoPath, geoArea } from "d3-geo"
import { Minus, Plus, RotateCcw, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { feature } from "topojson-client"
import type { Feature, FeatureCollection, Geometry, MultiPolygon } from "geojson"
import type { Topology } from "topojson-specification"

import type { SiteTestimonial } from "@/features/site/api"
import { COUNTRY_BY_ISO2 } from "@/features/site/countryList"
import TestimonialCard, { Avatar } from "@/features/site/TestimonialCard"
import { buildEarthMap, drawEarth, loadEarthTexture, type EarthMap, type EarthTexture } from "@/features/site/earthRenderer"
import { SMALL_COUNTRY_CENTRES } from "@/features/site/testimonialUtils"
import { cn } from "@/lib/utils"

type Lonlat = [number, number]
type World = { land: FeatureCollection | Feature; countries: Feature<Geometry>[] }

const MIN_ZOOM = 0.55
const MAX_ZOOM = 6
const CLUSTER_PX = 46

/** A country's centre; for countries with far-flung islands, the centre of the biggest piece. */
function centreOf(f: Feature<Geometry>): Lonlat {
  if (f.geometry.type === "MultiPolygon") {
    const g = f.geometry as MultiPolygon
    let best = g.coordinates[0]
    let bestArea = -1
    for (const poly of g.coordinates) {
      const a = geoArea({ type: "Polygon", coordinates: poly })
      if (a > bestArea) { best = poly; bestArea = a }
    }

    return geoCentroid({ type: "Polygon", coordinates: best }) as Lonlat
  }

  return geoCentroid(f) as Lonlat
}

interface Group { code: string; country: string; centre: Lonlat; items: SiteTestimonial[] }
interface Pin { key: string; x: number; y: number; groups: Group[]; items: SiteTestimonial[]; label: string }

/**
 * An interactive globe: drag to turn it, scroll or use +/- to zoom. Each student appears as their
 * photo on their country; zoomed out, nearby countries merge into one marker with a count.
 * Hover or click a marker to open the testimonial card(s).
 */
export default function TestimonialGlobe({ items, focus }: { items: SiteTestimonial[]; focus: { code: string; nonce: number } | null }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(480)
  const [world, setWorld] = useState<World | null>(null)
  const [rot, setRot] = useState<Lonlat>([-30, -15])
  const [zoom, setZoom] = useState(1)
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const interacting = useRef(false)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const reduceMotion = useRef(typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  const centres = useRef<Record<string, Lonlat>>({})
  const canvas = useRef<HTMLCanvasElement>(null)
  const [tex, setTex] = useState<EarthTexture | null>(null)
  const mapCache = useRef<{ key: string; map: EarthMap } | null>(null)
  const frame = useRef<{ res: number; image: ImageData } | null>(null)

  // Load the map lazily, so the home page does not pay for it until this section is on screen.
  useEffect(() => {
    let alive = true
    import("world-atlas/countries-110m.json").then((mod) => {
      if (!alive) return
      const topo = (mod.default ?? mod) as unknown as Topology
      const countries = (feature(topo, topo.objects.countries) as unknown as FeatureCollection).features as Feature<Geometry>[]
      const land = feature(topo, topo.objects.land) as unknown as Feature
      const byNum: Record<string, Lonlat> = {}
      for (const f of countries) byNum[String(f.id).padStart(3, "0")] = centreOf(f)
      for (const c of Object.values(COUNTRY_BY_ISO2)) {
        const centre = byNum[c.num] ?? SMALL_COUNTRY_CENTRES[c.iso2]
        if (centre) centres.current[c.iso2] = centre
      }
      setWorld({ land, countries })
    })

    return () => { alive = false }
  }, [])

  // The photograph of the Earth: a lighter file on phones, a sharper one on larger screens.
  const bigTexture = size >= 500
  useEffect(() => {
    let alive = true
    loadEarthTexture(bigTexture ? "/images/earth-4k.webp" : "/images/earth-2k.webp").then((t) => { if (alive && t) setTex(t) })

    return () => { alive = false }
  }, [bigTexture])

  // Follow the container's width.
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([entry]) => setSize(Math.max(280, Math.min(640, Math.round(entry.contentRect.width)))))
    ro.observe(el)

    return () => ro.disconnect()
  }, [])

  // Group testimonials by country.
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const it of items) {
      const code = it.country_code
      if (!code) continue
      const g = map.get(code) ?? { code, country: COUNTRY_BY_ISO2[code]?.name ?? it.country ?? code, centre: [0, 0] as Lonlat, items: [] }
      g.items.push(it)
      map.set(code, g)
    }

    return [...map.values()]
  }, [items])

  // Start facing where the testimonials are.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !world || groups.length === 0) return
    const pts = groups.map((g) => centres.current[g.code]).filter(Boolean)
    if (pts.length === 0) return
    started.current = true
    const lon = pts.reduce((a, p) => a + p[0], 0) / pts.length
    const lat = pts.reduce((a, p) => a + p[1], 0) / pts.length
    setRot([-lon, -Math.max(-40, Math.min(40, lat))])
  }, [world, groups])

  // Slow turn until someone touches the globe.
  useEffect(() => {
    if (reduceMotion.current) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!interacting.current && !openKey) setRot((r) => [r[0] - dt * 0.006, r[1]])
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(raf)
  }, [openKey])

  const radius = (size / 2) * 0.9 * zoom
  const projection = useMemo(
    () => geoOrthographic().scale(radius).translate([size / 2, size / 2]).rotate([rot[0], rot[1]]).clipAngle(90),
    [radius, size, rot],
  )
  const path = useMemo(() => geoPath(projection), [projection])

  // Paint the Earth. Internal resolution is capped so it stays smooth on phones.
  const res = Math.round(Math.min(size * (typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1), 560))
  useEffect(() => {
    const el = canvas.current
    if (!el || !tex) return
    const ctx = el.getContext("2d")
    if (!ctx) return
    const radiusPx = radius * (res / size)
    const lat0 = (-rot[1] * Math.PI) / 180
    const key = `${res}|${radiusPx.toFixed(1)}|${lat0.toFixed(3)}|${tex.h}`
    if (mapCache.current?.key !== key) mapCache.current = { key, map: buildEarthMap(res, radiusPx, lat0, tex.h) }
    if (frame.current?.res !== res) frame.current = { res, image: ctx.createImageData(res, res) }
    drawEarth(mapCache.current.map, tex, -rot[0], frame.current.image)
    ctx.putImageData(frame.current.image, 0, 0)
  }, [tex, rot, radius, res, size])

  const flyTo = useCallback((code: string) => {
    const c = centres.current[code]
    if (!c) return
    interacting.current = true
    const from = rot
    const to: Lonlat = [-c[0], -Math.max(-55, Math.min(55, c[1]))]
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 750)
      const e = 1 - Math.pow(1 - k, 3)
      let dl = to[0] - from[0]
      if (dl > 180) dl -= 360
      if (dl < -180) dl += 360
      setRot([from[0] + dl * e, from[1] + (to[1] - from[1]) * e])
      if (k < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
    setZoom((z) => Math.max(z, 1.5))
    setSelectedCode(code)
    setOpenKey(`c:${code}`)
  }, [rot])

  // Search / list picks a country.
  useEffect(() => {
    if (focus && world) flyTo(focus.code)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, world])

  // Markers: one per country, merged by screen distance when close.
  const pins = useMemo<Pin[]>(() => {
    const center: Lonlat = [-rot[0], -rot[1]]
    const visible = groups
      .map((g) => ({ g, c: centres.current[g.code] }))
      .filter((x): x is { g: Group; c: Lonlat } => !!x.c && geoDistance(x.c, center) < Math.PI / 2 - 0.05)
      .map(({ g, c }) => ({ g: { ...g, centre: c }, p: projection(c) as [number, number] }))
      .filter((x) => x.p && Math.hypot(x.p[0] - size / 2, x.p[1] - size / 2) <= size / 2 - 22)

    const out: { gs: Group[]; x: number; y: number }[] = []
    for (const v of visible) {
      const hit = out.find((o) => Math.hypot(o.x - v.p[0], o.y - v.p[1]) < CLUSTER_PX)
      if (hit) {
        const n = hit.gs.length
        hit.x = (hit.x * n + v.p[0]) / (n + 1)
        hit.y = (hit.y * n + v.p[1]) / (n + 1)
        hit.gs.push(v.g)
      } else {
        out.push({ gs: [v.g], x: v.p[0], y: v.p[1] })
      }
    }

    return out.map((o) => {
      const all = o.gs.flatMap((g) => g.items)
      const label = o.gs.length === 1 ? `${all.length} ${all.length === 1 ? "testimonial" : "testimonials"} from ${o.gs[0].country}` : `${all.length} testimonials from ${o.gs.map((g) => g.country).slice(0, 3).join(", ")}${o.gs.length > 3 ? " and nearby" : ""}`

      return { key: o.gs.length === 1 ? `c:${o.gs[0].code}` : `r:${o.gs.map((g) => g.code).sort().join(",")}`, x: o.x, y: o.y, groups: o.gs, items: all, label }
    })
  }, [groups, projection, rot, size])

  // A country picked from search keeps its card open even while the globe is still turning to it.
  const searched = openKey?.startsWith("c:") ? groups.find((g) => `c:${g.code}` === openKey) : undefined
  const open: Pin | null =
    pins.find((p) => p.key === openKey) ??
    (searched
      ? { key: openKey as string, x: size / 2, y: size / 2, groups: [searched], items: searched.items, label: `${searched.items.length} ${searched.items.length === 1 ? "testimonial" : "testimonials"} from ${searched.country}` }
      : null)
  const highlighted = useMemo(() => new Set(groups.map((g) => COUNTRY_BY_ISO2[g.code]?.num).filter(Boolean)), [groups])

  // Dragging
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,[data-popup]")) return
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
    interacting.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 2) d.moved = true
    d.x = e.clientX
    d.y = e.clientY
    const k = 0.35 / zoom
    // On touch screens a vertical swipe scrolls the page; only sideways swipes turn the globe.
    const tilt = e.pointerType === "touch" ? 0 : dy * k
    setRot((r) => [r[0] + dx * k, Math.max(-85, Math.min(85, r[1] - tilt))])
  }
  const onPointerUp = () => {
    if (drag.current && !drag.current.moved) setOpenKey(null)
    drag.current = null
  }

  // Wheel zoom (needs a non-passive listener to stop the page scrolling).
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      interacting.current = true
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))))
    }
    el.addEventListener("wheel", onWheel, { passive: false })

    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenKey(null) }
    window.addEventListener("keydown", onKey)

    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const zoomBy = (f: number) => { interacting.current = true; setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * f))) }
  const reset = () => { setZoom(1); setOpenKey(null); setSelectedCode(null); interacting.current = false }

  // Popup placement: beside the marker, kept inside the box.
  const popupStyle = open
    ? (() => {
        const w = Math.min(360, size - 24)
        const gap = 34
        const roomRight = size - (open.x + gap)
        const roomLeft = open.x - gap
        // Prefer beside the marker so it stays visible; otherwise below it.
        if (roomRight >= w) return { left: open.x + gap, top: Math.max(8, Math.min(size - 280, open.y - 90)), width: w } as React.CSSProperties
        if (roomLeft >= w) return { left: open.x - gap - w, top: Math.max(8, Math.min(size - 280, open.y - 90)), width: w } as React.CSSProperties

        return { left: Math.max(8, Math.min(size - w - 8, open.x - w / 2)), top: Math.min(size - 120, open.y + 30), width: w } as React.CSSProperties
      })()
    : undefined

  return (
    <div
      ref={box}
      className="relative mx-auto w-full max-w-[640px] select-none"
      style={{ height: size, touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Soft blue glow around the planet */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          left: size / 2 - radius * 1.04, top: size / 2 - radius * 1.04, width: radius * 2.08, height: radius * 2.08,
          background: "radial-gradient(circle, rgba(0,0,0,0) 66%, rgba(96,165,250,0.22) 80%, rgba(96,165,250,0) 100%)",
        }}
      />

      {/* The photograph of the Earth, lit from the upper left */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-full" aria-hidden="true">
        <canvas ref={canvas} width={res} height={res} style={{ width: size, height: size }} />
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Globe showing where our students come from" className="absolute inset-0 cursor-grab active:cursor-grabbing">
        <defs>
          <clipPath id="globe-clip"><circle cx={size / 2} cy={size / 2} r={size / 2} /></clipPath>
          <radialGradient id="globe-ocean" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#2F6BC2" />
            <stop offset="100%" stopColor="#0B2A63" />
          </radialGradient>
        </defs>
        <g clipPath="url(#globe-clip)">
          {/* Until the photograph has loaded: a simple blue ball with green land */}
          {!tex && <circle cx={size / 2} cy={size / 2} r={radius} fill="url(#globe-ocean)" />}
          {!tex && world && <path d={path(world.land) ?? undefined} fill="#5E9A58" stroke="#3E7A3A" strokeWidth={0.4} />}
          {world && world.countries.filter((f) => highlighted.has(String(f.id).padStart(3, "0"))).map((f) => {
            const code = Object.values(COUNTRY_BY_ISO2).find((c) => c.num === String(f.id).padStart(3, "0"))?.iso2
            const isSel = code === selectedCode

            return <path key={String(f.id)} d={path(f) ?? undefined} fill={isSel ? "#FBBF24" : "#FFFFFF"} fillOpacity={isSel ? 0.4 : 0.2} stroke={isSel ? "#FFFFFF" : "#FDE68A"} strokeOpacity={isSel ? 1 : 0.9} strokeWidth={isSel ? 1.8 : 1.1} />
          })}
        </g>
      </svg>

      {/* Markers: real buttons, so they work with the keyboard and screen readers too. */}
      {pins.map((p) => {
        const first = p.items[0]
        const isOpen = openKey === p.key

        return (
          <button
            key={p.key}
            type="button"
            aria-label={p.label}
            aria-expanded={isOpen}
            onClick={() => setOpenKey(isOpen ? null : p.key)}
            onMouseEnter={(e) => { if (window.matchMedia?.("(hover: hover)").matches && !drag.current) { setOpenKey(p.key); e.currentTarget.focus({ preventScroll: true }) } }}
            className={cn("absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform focus-visible:ring-2 focus-visible:ring-cas-navy focus-visible:ring-offset-2 focus-visible:outline-none", isOpen ? "z-20 scale-125" : "hover:scale-110")}
            style={{ left: p.x, top: p.y }}
          >
            <Avatar it={first} className={cn("size-10 border-2", isOpen ? "border-cas-red" : "border-white")} />
            {p.items.length > 1 && (
              <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-cas-red px-1 text-[11px] font-bold text-white ring-2 ring-white">{p.items.length}</span>
            )}
          </button>
        )
      })}

      {open && popupStyle && (
        <div data-popup role="dialog" aria-label={open.label} className="absolute z-30 max-h-[24rem] overflow-y-auto rounded-xl border bg-card p-3 shadow-xl" style={popupStyle}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{open.groups.length === 1 ? open.groups[0].country : `${open.groups.length} countries nearby`}</p>
            <button type="button" aria-label="Close" onClick={() => setOpenKey(null)} className="rounded p-1 text-slate-500 hover:bg-muted"><X className="size-4" /></button>
          </div>
          <div className="space-y-3">
            {open.items.map((it) => <TestimonialCard key={it.id} it={it} compact />)}
          </div>
        </div>
      )}

      <p className="pointer-events-none absolute bottom-0 left-0 text-[10px] text-slate-400">Earth image: NASA Visible Earth</p>

      <div className="absolute right-0 bottom-0 flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm" data-popup>
        <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.3)} className="p-2 hover:bg-muted"><Plus className="size-4" /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)} className="border-y p-2 hover:bg-muted"><Minus className="size-4" /></button>
        <button type="button" aria-label="Reset view" onClick={reset} className="p-2 hover:bg-muted"><RotateCcw className="size-4" /></button>
      </div>
    </div>
  )
}
