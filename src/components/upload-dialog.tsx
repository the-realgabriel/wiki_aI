import { useState, useRef, type FormEvent } from "react"
import { Button } from "#components/ui/button"
import { UploadIcon, XIcon, Loader2, FileTextIcon, CheckCircle2Icon } from "lucide-react"
import { getAccessToken } from "#lib/auth"

const API_BASE = import.meta.env.VITE_API_URL ?? ""

type UploadStatus = "idle" | "uploading" | "done" | "error"

export function UploadDialog({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return

    setStatus("uploading")
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    const token = getAccessToken()

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(err.error)
      }

      setStatus("done")
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setStatus("error")
    }
  }

  const fileName = file?.name.toLowerCase() ?? ""
  const isMd = fileName.endsWith(".md")
  const isTxt = fileName.endsWith(".txt")
  const isDocx = fileName.endsWith(".docx")
  const isPdf = fileName.endsWith(".pdf")
  const validFile = isMd || isTxt || isDocx || isPdf

  const formatFileSize = (size: number) =>
    size < 1024
      ? `${size.toFixed(0)} bytes`
      : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer hover:bg-accent transition-colors"
          >
            {file ? (
              <>
                <FileTextIcon className="size-10 text-primary" />
                <div className="text-center">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <UploadIcon className="size-10 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">Click to select a file</p>
                  <p className="text-sm text-muted-foreground">
                    Supported files: .md, .txt, .docx, .pdf
                  </p>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt,text/markdown,text/plain,.docx,.pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!file || !validFile || status === "uploading" || status === "done"}
            className="w-full"
          >
            {status === "uploading" ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : status === "done" ? (
              <>
                <CheckCircle2Icon className="size-4 mr-2" />
                Uploaded!
              </>
            ) : (
              <>
                <UploadIcon className="size-4 mr-2" />
                Upload
              </>
            )}
          </Button>

          {file && !validFile && (
            <p className="text-sm text-destructive text-center">
              Only .md, .txt, .docx, and .pdf files are supported
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
