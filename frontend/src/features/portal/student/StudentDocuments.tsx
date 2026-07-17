import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  getStudentDocuments,
  getStudentDocumentTypes,
  uploadStudentDocument,
} from "@/features/portal/api"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { DOC_BADGE } from "@/features/portal/status"
import { ApiError } from "@/lib/api"

const MAX_BYTES = 25 * 1024 * 1024

export default function StudentDocuments() {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [typeId, setTypeId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  const documents = useQuery({ queryKey: ["student", "documents"], queryFn: getStudentDocuments })
  const types = useQuery({ queryKey: ["student", "document-types"], queryFn: getStudentDocumentTypes })

  const upload = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => uploadStudentDocument(id, file),
    onSuccess: () => {
      setError(null)
      setTypeId("")
      if (fileRef.current) fileRef.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["student", "documents"] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Upload failed. Please try again."),
  })

  const onFile = (file: File | undefined) => {
    if (!file || !typeId) return
    if (file.size > MAX_BYTES) {
      setError("Files may not exceed 25 MB.")

      return
    }
    upload.mutate({ id: Number(typeId), file })
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Documents" subtitle="Upload and review your documents" />

      {/* Upload card */}
      <PortalCard>
        <Label htmlFor="doc-type" className="text-sm">Add a document</Label>
        <div className="mt-2 space-y-2">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger id="doc-type" className="bg-background" aria-label="Document type">
              <SelectValue placeholder="Choose a document type" />
            </SelectTrigger>
            <SelectContent>
              {types.data?.data.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            className="h-11 w-full"
            disabled={!typeId || upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {upload.isPending ? "Uploading…" : "Choose file & upload"}
          </Button>
        </div>
        {error && <p role="alert" className="mt-2 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}
      </PortalCard>

      {/* List */}
      {documents.isPending && <ListSkeleton rows={3} />}
      {documents.isError && <LoadError onRetry={documents.refetch} />}

      {documents.data && documents.data.data.length === 0 && (
        <EmptyState icon={<FileText className="mx-auto size-8" />} title="No documents yet"
          hint="Upload your passport, transcripts and more above." />
      )}

      <div className="space-y-2">
        {documents.data?.data.map((doc) => (
          <PortalCard key={doc.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doc.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {doc.type?.name ?? "Document"}{doc.uploaded_at ? ` · ${new Date(doc.uploaded_at).toLocaleDateString()}` : ""}
              </p>
            </div>
            <StatusBadge status={doc.status} map={DOC_BADGE} />
          </PortalCard>
        ))}
      </div>
    </div>
  )
}
