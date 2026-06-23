import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#components/ui/dialog"
import { Button } from "#components/ui/button"
import { getFileDownloadUrl, formatFileSize, formatDate, type FileItem } from "#lib/files"
import { generateSummary } from "#lib/ollama"
import { PdfViewer } from "#components/pdf-viewer"
import { DocxPreview } from "#components/docx-preview"
import { XlsxPreview } from "#components/xlsx-preview"
import { CsvPreview } from "#components/csv-preview"
import {
  FileText,
  Download,
  AlertCircle,
  Loader2,
  Eye,
  Sparkles,
} from "lucide-react"

type Props = {
  file: FileItem | null
  open: boolean
  onClose: () => void
}

function FilePreview({ file, onContent }: { file: FileItem; onContent?: (content: string) => void }) {
  const url = getFileDownloadUrl(file.name)

  useEffect(() => {
    if (!file.isText && !file.name.toLowerCase().endsWith(".csv")) {
      onContent?.("")
    }
  }, [file.isText, onContent])

  if (file.isText && !file.name.toLowerCase().endsWith(".csv")) {
    return <CodePreview file={file} url={url} onContent={onContent} />
  }

  switch (file.category) {
    case "image":
      return (
        <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
          <img
            src={url}
            alt={file.name}
            className="max-w-full max-h-[70vh] object-contain rounded-lg"
          />
        </div>
      )

    case "video":
      return (
        <div className="flex items-center justify-center max-h-[70vh]">
          <video controls className="max-w-full max-h-[70vh] rounded-lg">
            <source src={url} type={file.mime} />
          </video>
        </div>
      )

    case "audio":
      return (
        <div className="flex items-center justify-center py-12">
          <audio controls className="w-full max-w-md">
            <source src={url} type={file.mime} />
          </audio>
        </div>
      )

    case "document": {
      const name = file.name.toLowerCase()
      if (name.endsWith(".pdf")) {
        return <PdfViewer url={url} onTextContent={(text) => onContent?.(text)} />
      }
      if (name.endsWith(".docx") || name.endsWith(".doc")) {
        return <DocxPreview url={url} onTextContent={(text) => onContent?.(text)} />
      }
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        return <XlsxPreview url={url} onTextContent={(text) => onContent?.(text)} />
      }
      if (name.endsWith(".csv")) {
        return <CsvPreview url={url} onTextContent={(text) => onContent?.(text)} />
      }
      return <UnsupportedPreview file={file} />
    }

    default:
      return <UnsupportedPreview file={file} />
  }
}

function CodePreview({ file, url, onContent }: { file: FileItem; url: string; onContent?: (content: string) => void }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(`/api/files/content?path=${encodeURIComponent(file.path)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const c = data.content || ""
          setContent(c)
          onContent?.(c)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
          onContent?.("")
        }
      })

    return () => { cancelled = true }
  }, [file.path, onContent])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || content === null) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Could not load file preview</p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <a href={url} download={file.name}>
            <Download className="size-4 mr-1.5" />
            Download instead
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative max-h-[65vh] overflow-auto rounded-lg border border-border bg-zinc-950 dark:bg-black">
      <pre className="p-4 text-sm leading-relaxed overflow-x-auto">
        <code>{content}</code>
      </pre>
    </div>
  )
}

function UnsupportedPreview({ file }: { file: FileItem }) {
  return (
    <div className="text-center py-12">
      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <FileText className="size-8 text-muted-foreground" />
      </div>
      <p className="text-base font-medium mb-1">
        {file.type.toUpperCase().replace(".", "")} File
      </p>
      <p className="text-sm text-muted-foreground mb-1">
        {file.name}
      </p>
      <p className="text-xs text-muted-foreground/60 mb-5">
        {formatFileSize(file.size)} &middot; {formatDate(file.uploaded_at)}
      </p>
      <Button asChild>
        <a href={getFileDownloadUrl(file.name)} download={file.name}>
          <Download className="size-4 mr-2" />
          Download File
        </a>
      </Button>
    </div>
  )
}

export function FilePreviewModal({ file, open, onClose }: Props) {
  const [textContent, setTextContent] = useState("")
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setTextContent("")
      setSummary(null)
      setSummaryError(null)
    }
  }, [open])

  useEffect(() => {
    setSummary(null)
    setSummaryError(null)
  }, [file?.path])

  const hasTextContent = textContent.length > 0

  async function handleGenerateSummary() {
    if (!textContent) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const result = await generateSummary(textContent)
      setSummary(result)
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSummaryLoading(false)
    }
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-4xl w-[calc(100vw-3rem)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4 text-muted-foreground" />
            <span className="truncate">{file.name}</span>
            <span className="text-xs font-normal text-muted-foreground shrink-0 ml-auto">
              {formatFileSize(file.size)}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto px-1 space-y-4">
          <FilePreview file={file} onContent={setTextContent} />

          {hasTextContent && (
            <div className="border-t border-border pt-4 pb-2">
              {summary ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="size-4 text-amber-500" />
                      AI Summary
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateSummary}
                      disabled={summaryLoading}
                      className="h-7 text-xs"
                    >
                      {summaryLoading ? (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="size-3 mr-1" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                  <div className="text-sm leading-relaxed text-foreground/85 bg-accent/20 rounded-lg p-4 border border-border/50">
                    {summary}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Generate an AI summary of this file&apos;s content.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateSummary}
                    disabled={summaryLoading}
                    className="h-8 text-xs shadow-sm"
                  >
                    {summaryLoading ? (
                      <Loader2 className="size-3 animate-spin mr-1.5" />
                    ) : (
                      <Sparkles className="size-3 mr-1.5" />
                    )}
                    {summaryLoading ? "Generating..." : "Generate Summary"}
                  </Button>
                </div>
              )}
              {summaryError && (
                <p className="mt-2 text-xs text-destructive">{summaryError}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
