import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { getApplyAvailability, type Degree, type Funding, type ProgramFacets } from "@/features/portal/api"
import type { WizardProgram } from "@/features/portal/api"
import type { PortalKind } from "@/stores/portalAuth"

const PAGE_SIZE = 25
const NO_FACETS: ProgramFacets = { universities: [], cities: [], languages: [] }

export interface ProgramSearch {
  programs: WizardProgram[]
  /** All programs that match, not just the ones loaded so far. */
  total: number
  facets: ProgramFacets
  /** What the search was changed to when the typed spelling found nothing. */
  suggestion: { original: string; query: string } | null
  /** True while the first page of a search is loading. */
  loading: boolean
  loadingMore: boolean
  failed: boolean
  hasMore: boolean
  loadMore: () => void
  retry: () => void
  search: string
  university: string
  city: string
  language: string
  setSearch: (v: string) => void
  setUniversity: (v: string) => void
  setCity: (v: string) => void
  setLanguage: (v: string) => void
  filtering: boolean
  clear: () => void
}

/**
 * The programs of one degree + funding choice, as the applicant searches and filters them. The catalog holds tens
 * of thousands of programs, so the server does the searching and sends them 25 at a time; "show more" asks for the
 * next page. Typing waits a moment before asking, so each key press does not send a request.
 */
export function useProgramSearch({ kind, degree, funding, enabled, universitySlug }: {
  kind: PortalKind
  degree: Degree | ""
  funding: Funding | ""
  enabled: boolean
  /** When the application is for one university only. */
  universitySlug?: string | null
}): ProgramSearch {
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [university, setUniversity] = useState("")
  const [city, setCity] = useState("")
  const [language, setLanguage] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)

    return () => clearTimeout(t)
  }, [search])

  // A different degree or funding starts a fresh search.
  useEffect(() => {
    setSearch(""); setDebounced(""); setUniversity(""); setCity(""); setLanguage("")
  }, [degree, funding])

  const query = useInfiniteQuery({
    queryKey: [kind, "availability", degree, funding, universitySlug ?? null, debounced, university, city, language],
    queryFn: ({ pageParam }) => getApplyAvailability(kind, degree as Degree, funding as Funding, {
      q: debounced, university_id: university, city, language, university: universitySlug ?? undefined, page: pageParam, per_page: PAGE_SIZE,
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta && last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
    enabled: enabled && !!degree && !!funding,
    placeholderData: keepPreviousData,
  })

  const pages = query.data?.pages ?? []
  const programs = pages.flatMap((p) => p.data)
  const first = pages[0]
  const filtering = !!(search || university || city || language)

  return {
    programs,
    total: first?.meta?.total ?? programs.length,
    facets: first?.facets ?? NO_FACETS,
    suggestion: first?.suggestion ?? null,
    loading: query.isFetching && !query.isFetchingNextPage,
    loadingMore: query.isFetchingNextPage,
    failed: query.isError,
    hasMore: !!query.hasNextPage,
    loadMore: () => { void query.fetchNextPage() },
    retry: () => { void query.refetch() },
    search, university, city, language,
    setSearch, setUniversity, setCity, setLanguage,
    filtering,
    clear: () => { setSearch(""); setDebounced(""); setUniversity(""); setCity(""); setLanguage("") },
  }
}
