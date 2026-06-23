import { useState, useRef, type FormEvent, type DragEvent } from "react"
import { Button } from "#components/ui/button"
import { UploadIcon, XIcon, Loader2, FileTextIcon, CheckCircle2Icon, FileSpreadsheet, FileArchive } from "lucide-react"
import { cn } from "#lib/utils"

type UploadStatus = "idle" | "dragging" | "uploading" | "done" | "error"

export function UploadDialog({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return

    setStatus("uploading")
    setError("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
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

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile)
      setStatus("idle")
      setError("")
    }
  }

  const fileName = file?.name.toLowerCase() ?? ""
  const ext = fileName.split(".").pop()

  function getFilePreviewIcon() {
    switch (ext) {
      case "md": case "txt": case "rtf": case "pdf": case "doc": case "docx": case "odt":
        return <FileTextIcon className="size-10 text-blue-500" />
      case "xls": case "xlsx": case "xlsm": case "csv": case "ods":
        return <FileSpreadsheet className="size-10 text-green-600" />
      case "ppt": case "pptx": case "pptm": case "odp":
        return <FileArchive className="size-10 text-orange-500" />
      default:
        return <FileTextIcon className="size-10 text-primary" />
    }
  }

  const formatFileSize = (size: number) =>
    size < 1024
      ? `${size.toFixed(0)} bytes`
      : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border-2 p-8 cursor-pointer transition-all duration-200",
              dragOver
                ? "border-primary border-dashed bg-primary/5"
                : "border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-accent/30"
            )}
          >
            {file ? (
              <>
                {getFilePreviewIcon()}
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
                  <p className="font-medium">Click to select or drag a file</p>
                  <p className="text-sm text-muted-foreground">
                    .md, .txt, .pdf, .docx, .xlsx, .pptx and more
                  </p>
                </div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt,text/markdown,text/plain,.pdf,.docx,.xlsx,.xls,.xlsm,.pptx,.ppt,.pptm,.odt,.ods,.odp,.rtf,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.ms-powerpoint,application/rtf,text/csv,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setStatus("idle"); setError("") }}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!file || status === "uploading" || status === "done"}
            className="w-full shadow-sm"
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
        </form>
      </div>
    </div>
  )
}
