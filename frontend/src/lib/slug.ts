/** City URL slug. Must match the server (Laravel Str::slug): apostrophes are dropped, not turned into a dash,
 *  so "Xi'an" is "xian" on both sides. */
export const citySlug = (c: string) =>
  c.toLowerCase().normalize("NFKD").replace(/['’`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
