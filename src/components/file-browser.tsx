import { useEffect, useState, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { fetchFiles, deleteFile, getFileDownloadUrl, formatFileSize, formatDate, type FileItem } from "#lib/files"
import { FilePreviewModal } from "#components/file-preview-modal"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { cn } from "#lib/utils"
import {
  FileIcon, FileText, FileSpreadsheet, FileCode, FileImage, FileArchive,
  Trash2, Upload, Loader2, AlertCircle, CheckCircle2, Search, Eye,
  Download, Music, Video, FileType, ExternalLink,
} from "lucide-react"

type UploadState = {
  status: "idle" | "dragging" | "uploading" | "done" | "error"
  fileName: string
  error: string
}

function getFileTypeIcon(category: string, ext: string) {
  switch (category) {
    case "image":
      return <FileImage className="size-4 text-pink-500" />
    case "code":
      return <FileCode className="size-4 text-purple-500" />
    case "audio":
      return <Music className="size-4 text-amber-500" />
    case "video":
      return <Video className="size-4 text-rose-500" />
    case "document":
      if (ext === ".pdf") return <FileText className="size-4 text-red-500" />
      if (ext === ".md" || ext === ".txt") return <FileText className="size-4 text-blue-500" />
      if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") return <FileSpreadsheet className="size-4 text-green-600" />
      return <FileText className="size-4 text-sky-600" />
    default:
      if (ext === ".zip" || ext === ".tar" || ext === ".gz" || ext === ".rar")
        return <FileArchive className="size-4 text-amber-500" />
      return <FileIcon className="size-4 text-muted-foreground" />
  }
}

export function FileBrowser() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [upload, setUpload] = useState<UploadState>({ status: "idle", fileName: "", error: "" })
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    try {
      const data = await fetchFiles()
      setFiles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const filtered = search
    ? files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : files

  async function uploadFile(file: File) {
    setUpload({ status: "uploading", fileName: file.name, error: "" })

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }))
        throw new Error(err.error || "Upload failed")
      }
      setUpload({ status: "done", fileName: file.name, error: "" })
      loadFiles()
      setTimeout(() => setUpload({ status: "idle", fileName: "", error: "" }), 2000)
    } catch (err) {
      setUpload({
        status: "error",
        fileName: file.name,
        error: err instanceof Error ? err.message : "Upload failed",
      })
      setTimeout(() => setUpload({ status: "idle", fileName: "", error: "" }), 3000)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setUpload((prev) => prev.status === "idle" ? { ...prev, status: "dragging" } : prev)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setUpload((prev) => prev.status === "dragging" ? { ...prev, status: "idle" } : prev)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFile(files[0])
    else setUpload((prev) => prev.status === "dragging" ? { ...prev, status: "idle" } : prev)
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteFile(name)
      loadFiles()
    } catch (err) {
      alert("Failed to delete: " + (err instanceof Error ? err.message : "Unknown error"))
    }
  }

  function handlePreview(file: FileItem) {
    setPreviewFile(file)
    setPreviewOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading files...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="size-10 text-destructive mx-auto mb-4" />
        <p className="text-destructive mb-1">{error}</p>
        <p className="text-sm text-muted-foreground mb-4">Could not load file listing.</p>
        <Button variant="outline" onClick={loadFiles}>Retry</Button>
      </div>
    )
  }

  return (
    <div>
      {/* Drop zone wrapper */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-xl border-2 transition-all duration-200",
          upload.status === "dragging"
            ? "border-primary border-dashed bg-primary/5"
            : "border-border",
        )}
      >
        {/* Drag overlay */}
        {upload.status === "dragging" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm">
            <div className="text-center">
              <Upload className="size-10 text-primary mx-auto mb-2" />
              <p className="text-lg font-semibold text-primary">Drop file to upload</p>
            </div>
          </div>
        )}

        {/* Upload status */}
        {upload.status === "uploading" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-accent/10 border-b border-border">
            <Loader2 className="size-4 animate-spin text-primary" />
            <p className="text-sm font-medium truncate flex-1">{upload.fileName}</p>
            <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        )}
        {upload.status === "done" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50/50 dark:bg-green-950/20 border-b border-green-200/50 dark:border-green-800/30">
            <CheckCircle2 className="size-4 text-green-600" />
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{upload.fileName} uploaded</p>
          </div>
        )}
        {upload.status === "error" && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50/50 dark:bg-red-950/20 border-b border-red-200/50 dark:border-red-800/30">
            <AlertCircle className="size-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">{upload.error}</p>
          </div>
        )}

        {/* Search bar */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div
            className="text-center py-16 cursor-pointer hover:bg-accent/30 transition-colors rounded-xl"
            onClick={() => inputRef.current?.click()}
          >
            {search ? (
              <>
                <Search className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-1">No files match "{search}"</p>
              </>
            ) : (
              <>
                <Upload className="size-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-1">No files uploaded yet</p>
                <p className="text-sm text-muted-foreground/60">
                  Drag & drop files here or click to upload
                </p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadFile(file)
                e.target.value = ""
              }}
            />
          </div>
        )}

        {/* File table */}
        {filtered.length > 0 && (
          <div className="divide-y divide-border">
            {/* Header */}
            <div className="hidden sm:flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center gap-2 flex-[2] min-w-0">
                <span className="size-4" /> {/* icon placeholder */}
                <span>Name</span>
              </div>
              <div className="w-20 shrink-0 text-right">Size</div>
              <div className="w-24 shrink-0 hidden md:block">Type</div>
              <div className="w-36 shrink-0 hidden lg:block">Uploaded</div>
              <div className="w-20 shrink-0 text-right">Actions</div>
            </div>

            {/* Rows */}
            {filtered.map((file) => (
              <div
                key={file.path}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors text-sm cursor-pointer"
                onClick={() => navigate(`/file/${encodeURIComponent(file.name)}`)}
              >
                <div className="flex items-center gap-2 flex-[2] min-w-0">
                  {getFileTypeIcon(file.category, file.type)}
                  <span className="truncate font-medium">{file.name}</span>
                </div>

                <div className="w-20 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
                  {formatFileSize(file.size)}
                </div>

                <div className="w-24 shrink-0 hidden md:block">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <FileType className="size-3" />
                    {file.category === "other" ? file.type.replace(".", "").toUpperCase() : file.category.charAt(0).toUpperCase() + file.category.slice(1)}
                  </span>
                </div>

                <div className="w-36 shrink-0 hidden lg:block text-xs text-muted-foreground">
                  {formatDate(file.uploaded_at)}
                </div>

                <div
                  className="w-20 shrink-0 flex items-center justify-end gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    title="Quick preview"
                    onClick={() => handlePreview(file)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open page"
                    onClick={() => navigate(`/file/${encodeURIComponent(file.name)}`)}
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download"
                    asChild
                  >
                    <a href={getFileDownloadUrl(file.name)} download={file.name}>
                      <Download className="size-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                    onClick={() => handleDelete(file.name)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Bottom drop hint */}
            <div
              className="px-4 py-2 text-xs text-muted-foreground/50 text-center cursor-pointer hover:text-muted-foreground/80 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              Drop files anywhere to upload
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadFile(file)
                  e.target.value = ""
                }}
              />
            </div>
          </div>
        )}
      </div>

      <FilePreviewModal
        file={previewFile}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
