import { useQuery } from "@tanstack/react-query"

import { getSitePrograms, getSiteScholarships, getSiteUniversities } from "@/features/site/api"

function useTotal(key: string, fn: () => Promise<{ meta?: { total?: number } }>) {
  const { data } = useQuery({ queryKey: ["catalog-total", key], queryFn: fn, staleTime: 5 * 60_000 })

  return data?.meta?.total
}

/** Live catalog counts, so numbers shown on the public site never go stale. */
export function useCatalogTotals() {
  return {
    universities: useTotal("universities", () => getSiteUniversities({ perPage: 1 })),
    programs: useTotal("programs", () => getSitePrograms()),
    scholarships: useTotal("scholarships", () => getSiteScholarships()),
  }
}

export const formatTotal = (n?: number) => (n === undefined ? "—" : n.toLocaleString("en-US"))
