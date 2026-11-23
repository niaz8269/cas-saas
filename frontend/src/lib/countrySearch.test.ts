import { distance, normalize, searchCountries, type CountryItem } from "@/lib/countrySearch"

const NAMES = [
  "Afghanistan", "Australia", "Austria", "Bangladesh", "Brazil", "Burkina Faso", "Canada", "China", "Congo", "DR Congo", "Côte d'Ivoire", "Czechia", "Egypt", "France",
  "Germany", "Guinea", "Guinea-Bissau", "India", "Indonesia", "Iran", "Ivory Coast", "Japan", "Kyrgyzstan", "Malaysia", "Myanmar", "Netherlands", "Niger", "Nigeria",
  "North Korea", "Pakistan", "Philippines", "Qatar", "Russia", "Saint Lucia", "Saudi Arabia", "South Africa", "South Korea", "Sri Lanka", "Switzerland", "Taiwan",
  "Thailand", "Turkey", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Vietnam", "Zimbabwe",
]
const ITEMS: CountryItem[] = NAMES.map((n, i) => ({ value: String(i + 1), label: n }))
const top = (q: string) => searchCountries(ITEMS, q).results.map((r) => r.label)

it("normalizes accents, case, ampersands and punctuation", () => {
  expect(normalize("  Côte d'Ivoire ")).toBe("cote d ivoire")
  expect(normalize("Bosnia & Herzegovina")).toBe("bosnia and herzegovina")
})

it("counts a swapped pair of letters as one mistake", () => {
  expect(distance("pakitsan", "pakistan")).toBe(1)
  expect(distance("india", "india")).toBe(0)
  expect(distance("kitten", "sitting")).toBe(3)
})

it("finds a country from a misspelling", () => {
  expect(top("Pakitsan")[0]).toBe("Pakistan")
  expect(top("pakistn")[0]).toBe("Pakistan")
  expect(top("Phillipines")[0]).toBe("Philippines")
  expect(top("Indai")[0]).toBe("India")
  expect(top("Bangaldesh")[0]).toBe("Bangladesh")
  expect(top("Austrlia")[0]).toBe("Australia")
  expect(top("Kyrgystan")[0]).toBe("Kyrgyzstan")
  expect(top("Zimbabwee")[0]).toBe("Zimbabwe")
  expect(top("Swtzerland")[0]).toBe("Switzerland")
  expect(top("Vietnm")[0]).toBe("Vietnam")
})

it("says when only the nearest spellings are shown", () => {
  expect(searchCountries(ITEMS, "Pakitsan").close).toBe(true)
  expect(searchCountries(ITEMS, "Pak").close).toBe(false)
})

it("finds a country while it is still being typed", () => {
  expect(top("pak")).toEqual(["Pakistan"])
  expect(top("unit")).toEqual(expect.arrayContaining(["United Arab Emirates", "United Kingdom", "United States"]))
  expect(top("sri")[0]).toBe("Sri Lanka")
  expect(top("lanka")).toContain("Sri Lanka")
})

it("understands the other names people use", () => {
  expect(top("UAE")[0]).toBe("United Arab Emirates")
  expect(top("USA")[0]).toBe("United States")
  expect(top("UK")[0]).toBe("United Kingdom")
  expect(top("Holland")[0]).toBe("Netherlands")
  expect(top("Burma")[0]).toBe("Myanmar")
  expect(top("Czech Republic")[0]).toBe("Czechia")
  expect(top("Korea")).toEqual(expect.arrayContaining(["South Korea", "North Korea"]))
  expect(top("Persia")[0]).toBe("Iran")
})

it("ignores accents and finds an accented name from plain letters", () => {
  expect(top("cote d ivoire")).toContain("Côte d'Ivoire")
  expect(top("cote d ivoire")).toContain("Ivory Coast")
})

it("returns the whole list for an empty search and nothing for nonsense", () => {
  expect(searchCountries(ITEMS, "").results).toHaveLength(NAMES.length)
  expect(searchCountries(ITEMS, "zzzzqx").results).toEqual([])
})

it("keeps an exact start above a loose guess", () => {
  expect(top("niger")).toEqual(["Niger", "Nigeria"])
  expect(top("guinea")[0]).toBe("Guinea")
})
