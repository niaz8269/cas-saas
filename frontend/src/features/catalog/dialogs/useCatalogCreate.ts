import { useMutation, useQueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api"

/**
 * Shared create-mutation wiring for the catalog add-dialogs: invalidates
 * the section query on success, funnels API errors into the form.
 */
export function useCatalogCreate<TPayload>(options: {
  mutationFn: (payload: TPayload) => Promise<unknown>
  invalidateKey: readonly unknown[]
  onSuccess: () => void
  onFieldError: (field: string, message: string) => void
  onRootError: (message: string) => void
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: options.invalidateKey })
      options.onSuccess()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 422) {
        for (const [field, messages] of Object.entries(error.errors)) {
          options.onFieldError(field, messages[0])
        }
        return
      }
      options.onRootError(error instanceof ApiError ? error.message : "Something went wrong.")
    },
  })
}
