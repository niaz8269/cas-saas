// Light, varied placeholder tints: photo-ready image areas that read light and colourful,
// instead of heavy dark blocks. Shared by the public university cards and the exclusive cards.
const TONES = [
  "from-sky-100 to-blue-50",
  "from-amber-100 to-orange-50",
  "from-emerald-100 to-teal-50",
  "from-rose-100 to-pink-50",
  "from-indigo-100 to-sky-50",
  "from-violet-100 to-fuchsia-50",
]

export function toneFor(seed: number | string): string {
  const n = typeof seed === "number" ? seed : Number(String(seed).match(/(\d+)/)?.[1] ?? String(seed).length)

  return TONES[Math.abs(n) % TONES.length]
}
