/**
 * Finds countries from what a person types, forgiving of spelling mistakes, accents, missing letters,
 * swapped letters and the other names people use ("Holland", "Burma", "UAE", "Korea").
 * Works on the list the server sends, so it never invents a country.
 */

export interface CountryItem {
  /** What the form stores (an id or a name). */
  value: string
  /** What the person sees. */
  label: string
}

/** Other names people type, by the label we show. Only used when that country is in the list. */
const ALIASES: Record<string, string[]> = {
  "United States": ["usa", "us", "u s a", "u s", "america", "united states of america", "the states"],
  "United Kingdom": ["uk", "u k", "great britain", "britain", "england", "scotland", "wales", "northern ireland", "gb"],
  "United Arab Emirates": ["uae", "emirates", "dubai", "abu dhabi"],
  Netherlands: ["holland", "the netherlands"],
  Myanmar: ["burma"],
  "Ivory Coast": ["cote d ivoire", "cote divoire"],
  Czechia: ["czech republic", "czech"],
  Eswatini: ["swaziland"],
  "North Macedonia": ["macedonia"],
  Turkey: ["turkiye"],
  "South Korea": ["korea", "republic of korea", "rok"],
  "North Korea": ["dprk", "korea north", "democratic peoples republic of korea"],
  Russia: ["russian federation"],
  Iran: ["persia", "islamic republic of iran"],
  Syria: ["syrian arab republic"],
  Vietnam: ["viet nam"],
  Laos: ["lao", "lao pdr"],
  Brunei: ["brunei darussalam"],
  "Cape Verde": ["cabo verde"],
  "DR Congo": ["drc", "congo kinshasa", "democratic republic of the congo", "zaire"],
  Congo: ["congo brazzaville", "republic of the congo"],
  "Republic of The Gambia": ["gambia", "the gambia"],
  "Timor-Leste": ["east timor"],
  "Holy See": ["vatican", "vatican city"],
  Palestine: ["state of palestine", "gaza", "west bank"],
  China: ["prc", "peoples republic of china", "mainland china"],
  "People's Republic of China": ["china", "prc", "mainland china"],
  Taiwan: ["republic of china", "roc", "chinese taipei"],
  "Hong Kong": ["hk", "hong kong sar"],
  Macao: ["macau"],
  Micronesia: ["federated states of micronesia"],
  "Sao Tome and Principe": ["sao tome"],
  "Saint Kitts and Nevis": ["st kitts", "saint kitts"],
  "Saint Lucia": ["st lucia"],
  "Saint Vincent and the Grenadines": ["st vincent", "saint vincent"],
  "Trinidad and Tobago": ["trinidad", "tobago"],
  "Bosnia and Herzegovina": ["bosnia"],
  "Antigua and Barbuda": ["antigua"],
  "Papua New Guinea": ["png"],
  Reunion: ["la reunion"],
  "Virgin Islands, British": ["british virgin islands", "bvi"],
  "Virgin Islands, U.S.": ["us virgin islands", "usvi", "american virgin islands"],
  "Falkland Islands": ["malvinas", "falklands"],
  Bahamas: ["the bahamas"],
  "Western Sahara": ["sahrawi"],
}

/** Lower case, no accents, "&" as "and", punctuation as spaces. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/** Edit distance where swapping two neighbouring letters counts as one mistake ("Pakitsan" is 1 away from "Pakistan"). */
export function distance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) => [i, ...Array<number>(cols - 1).fill(0)])
  for (let j = 0; j < cols; j++) d[0][j] = j

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }

  return d[a.length][b.length]
}

/** How many mistakes a word of this length may contain and still count as a match. */
const allowed = (length: number) => (length <= 3 ? 0 : length <= 5 ? 1 : length <= 9 ? 2 : 3)

interface Scored {
  item: CountryItem
  score: number
  exact: boolean
}

function scoreOne(query: string, target: string): { score: number; exact: boolean } | null {
  if (target === query) return { score: 100, exact: true }
  if (target.startsWith(query)) return { score: 90 - Math.min(10, target.length - query.length) / 2, exact: true }

  const words = target.split(" ")
  if (words.some((w) => w === query)) return { score: 88, exact: true }
  if (words.some((w) => w.startsWith(query))) return { score: 80, exact: true }
  if (query.length >= 3 && target.includes(query)) return { score: 70, exact: true }

  // Mistakes: compare with the whole name, each word, and the start of each of them as long as what was typed.
  if (query.length < 3) return null
  const limit = allowed(query.length)
  let best = Infinity
  for (const candidate of [target, ...words]) {
    best = Math.min(best, distance(query, candidate))
    // Still typing: "pakitsa" should find "pakistan".
    if (candidate.length > query.length) best = Math.min(best, distance(query, candidate.slice(0, query.length)))
  }
  if (best <= limit) return { score: 60 - best * 12, exact: false }

  return null
}

/**
 * The countries that match `query`, best first. An empty query returns the whole list in its own order.
 * `close` is true when nothing matched what was typed exactly and these are the nearest spellings.
 */
export function searchCountries(items: CountryItem[], query: string, limit = 8): { results: CountryItem[]; close: boolean } {
  const q = normalize(query)
  if (q === "") return { results: items, close: false }

  const scored: Scored[] = []
  for (const item of items) {
    const label = normalize(item.label)
    let best = scoreOne(q, label)
    for (const alias of ALIASES[item.label] ?? []) {
      const s = scoreOne(q, normalize(alias))
      if (s && (!best || s.score > best.score)) best = s
    }
    if (best) scored.push({ item, ...best })
  }

  // Equal scores: fewer words first ("India" before "British Indian Ocean Territory"), then the name whose length is
  // nearest to what was typed, then alphabetical.
  const words = (label: string) => normalize(label).split(" ").length
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      words(a.item.label) - words(b.item.label) ||
      Math.abs(a.item.label.length - q.length) - Math.abs(b.item.label.length - q.length) ||
      a.item.label.localeCompare(b.item.label),
  )
  const exact = scored.filter((s) => s.exact)
  const chosen = exact.length > 0 ? exact : scored

  return { results: chosen.slice(0, limit).map((s) => s.item), close: exact.length === 0 && chosen.length > 0 }
}
