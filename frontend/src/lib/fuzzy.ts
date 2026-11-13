/** Edit distance where swapping two neighbouring letters counts as one mistake ("hrabin" -> "harbin"). */
function distance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }

  return d[a.length][b.length]
}

/** How many mistakes a typed word may contain: none for very short words, more for longer ones. */
function allowedMistakes(word: string): number {
  if (word.length <= 3) return 0
  if (word.length <= 7) return 1

  return 2
}

/** True when the typed word is found in the text, exactly, as a start of a word, or with a small typing mistake. */
function wordMatches(word: string, text: string, tokens: string[]): boolean {
  if (text.includes(word)) return true
  const allowed = allowedMistakes(word)
  if (allowed === 0) return false

  // A word still being typed with a slip ("herb" for "harbin") is compared with the start of each word.
  return tokens.some((t) => distance(word, t) <= allowed || (t.length > word.length && distance(word, t.slice(0, word.length)) <= allowed))
}

/** Every typed word must be found in the text, forgiving small spelling mistakes. An empty search matches everything. */
export function fuzzyIncludes(search: string, text: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const haystack = text.toLowerCase()
  const tokens = haystack.split(/[^\p{L}\p{N}]+/u).filter(Boolean)

  return words.every((w) => wordMatches(w, haystack, tokens))
}
