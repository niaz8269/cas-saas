import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, FileText, Upload } from "lucide-react"
import { useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  downloadDocument,
  listDocumentTypes,
  listStudentDocuments,
  uploadDocument,
} from "@/features/admissions/api"
import { ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-cas-red-50 text-cas-red",
}

const MAX_BYTES = 25 * 1024 * 1024

export default function StudentDocuments({ studentId, canUpload }: { studentId: string; canUpload: boolean }) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [typeId, setTypeId] = useState("")
  const [error, setError] = useState<string | null>(null)

  const docs = useQuery({ queryKey: ["student-documents", studentId], queryFn: () => listStudentDocuments(studentId) })
  const types = useQuery({ queryKey: ["document-types"], queryFn: listDocumentTypes, enabled: canUpload })

  const upload = useMutation({
    mutationFn: (file: File) =>
      uploadDocument(
        { documentable_type: "student", documentable_id: Number(studentId), document_type_id: Number(typeId), file_name: file.name, mime: file.type, size: file.size },
        file,
      ),
    onSuccess: () => {
      setError(null)
      setTypeId("")
      if (fileRef.current) fileRef.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["student-documents", studentId] })
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Upload failed."),
  })

  const download = useMutation({
    mutationFn: (id: number) => downloadDocument(id),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
    onError: () => setError("Could not generate the download link."),
  })

  const onFile = (file: File | undefined) => {
    if (!file || !typeId) return
    if (file.size > MAX_BYTES) { setError("Files may not exceed 25 MB."); return }
    upload.mutate(file)
  }

  const documents = docs.data?.data ?? []

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Documents</p>

      {error && <p role="alert" className="mt-2 rounded-md bg-cas-red-50 px-3 py-2 text-sm text-destructive">{error}</p>}

      {canUpload && (
        <div className="mt-2 space-y-2">
          <Select value={typeId} onValueChange={setTypeId}>
            <SelectTrigger className="bg-background" aria-label="Document type"><SelectValue placeholder="Choose a document type" /></SelectTrigger>
            <SelectContent>
              {types.data?.data.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="secondary" className="w-full" disabled={!typeId || upload.isPending} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> {upload.isPending ? "Uploading…" : "Upload document"}
          </Button>
        </div>
      )}

      {docs.isPending && <Skeleton className="mt-3 h-10 w-full" />}

      {!docs.isPending && documents.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">No documents on file.</p>
      )}

      <ul className="mt-2 space-y-1.5">
        {documents.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate">{d.type?.name ?? d.file_name}</span>
                <span className="block text-xs text-muted-foreground">{d.file_name}</span>
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className={cn("border-transparent capitalize", STATUS_BADGE[d.status])}>{d.status}</Badge>
              <button type="button" aria-label={`Download ${d.file_name}`} onClick={() => download.mutate(d.id)} className="text-muted-foreground hover:text-foreground">
                <Download className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
