import { useEffect, useState, useCallback } from "react"
import { useParams, Link } from "react-router-dom"
import { fetchFiles, getFileDownloadUrl, formatFileSize, formatDate, type FileItem } from "#lib/files"
import { generateSummary } from "#lib/ollama"
import { usePageContent } from "#components/right-sidebar"
import { useRightSidebar } from "#components/right-sidebar"
import { Button } from "#components/ui/button"
import { PdfViewer } from "#components/pdf-viewer"
import { DocxPreview } from "#components/docx-preview"
import { XlsxPreview } from "#components/xlsx-preview"
import { CsvPreview } from "#components/csv-preview"
import {
  ArrowLeft,
  Download,
  Loader2,
  FileIcon,
  FileText,
  Sparkles,
  AlertCircle,
} from "lucide-react"

function SummaryBlock({
  summary,
  summaryLoading,
  onGenerate,
  onRegenerate,
}: {
  summary: string | null
  summaryLoading: boolean
  onGenerate: () => void
  onRegenerate: () => void
}) {
  return summary ? (
    <div className="border-t border-border pt-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="size-4 text-amber-500" />
            AI Summary
          </h3>
          <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={summaryLoading} className="h-7 text-xs">
            {summaryLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <Sparkles className="size-3 mr-1" />}
            Regenerate
          </Button>
        </div>
        <div className="text-sm leading-relaxed text-foreground/85 bg-accent/20 rounded-lg p-4 border border-border/50">
          {summary}
        </div>
      </div>
    </div>
  ) : (
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Generate an AI summary of this file&apos;s content.</p>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={summaryLoading} className="shadow-sm">
          {summaryLoading ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Sparkles className="size-4 mr-1.5" />}
          {summaryLoading ? "Generating..." : "Generate Summary"}
        </Button>
      </div>
    </div>
  )
}

function getCategory(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase()
  const image = ["png", "jpg", "jpeg", "gif", "webp", "svg"]
  const code = ["js", "ts", "jsx", "tsx", "css", "html", "htm", "json", "xml", "yaml", "yml", "sh", "bat", "ps1", "py", "rb", "go", "rs", "java", "cpp", "c", "h", "sql", "r", "swift", "kt", "toml"]
  const doc = ["md", "txt", "csv", "pdf", "docx", "doc", "xlsx", "xls"]
  const audio = ["mp3", "ogg", "wav", "flac", "aac"]
  const video = ["mp4", "webm", "avi", "mov", "mkv"]
  if (ext && image.includes(ext)) return "image"
  if (ext && code.includes(ext)) return "code"
  if (ext && doc.includes(ext)) return "document"
  if (ext && audio.includes(ext)) return "audio"
  if (ext && video.includes(ext)) return "video"
  return "other"
}

export default function FileView() {
  const { filename } = useParams<{ filename: string }>()
  useEffect(() => { document.title = filename ? `${filename} — Dataphyte Wiki` : "File — Dataphyte Wiki" }, [filename])
  const [file, setFile] = useState<FileItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const { setPageContent } = usePageContent()
  const { setPageMeta } = useRightSidebar()

  useEffect(() => {
    if (!filename) return
    let cancelled = false
    fetchFiles().then((files) => {
      if (cancelled) return
      const match = files.find((f) => f.name === filename)
      if (match) {
        setFile(match)
        if (match.isText && !match.name.toLowerCase().endsWith(".csv")) {
          setContentLoading(true)
          fetch(`/api/files/content?path=${encodeURIComponent(match.path)}`)
            .then((r) => r.json())
            .then((data) => {
              if (!cancelled) {
                const c = data.content || ""
                setTextContent(c)
                setPageContent(c)
                setPageMeta({
                  title: match.name,
                  type: "file",
                  path: match.path,
                  content: c,
                  wordCount: c.split(/\s+/).filter(Boolean).length,
                  fileSize: formatFileSize(match.size),
                })
                setContentLoading(false)
              }
            })
            .catch(() => { if (!cancelled) setContentLoading(false) })
        } else {
          setTextContent(null)
          setPageContent("")
          setPageMeta({
            title: match.name,
            type: "file",
            path: match.path,
            content: "",
            fileSize: formatFileSize(match.size),
          })
        }
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [filename, setPageContent, setPageMeta])

  const handlePdfTextContent = useCallback((text: string) => {
    setTextContent(text || null)
    setPageContent(text || "")
    setPageMeta({
      title: file?.name ?? "",
      type: "file",
      path: file?.path ?? "",
      content: text || "",
      wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
      fileSize: file ? formatFileSize(file.size) : "",
    })
  }, [setPageContent, setPageMeta, file])

  async function handleSummary() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!file) {
    return (
      <div className="text-center py-20">
        <FileIcon className="size-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">File Not Found</h1>
        <p className="text-muted-foreground mb-4">The file "{filename}" could not be found.</p>
        <Button asChild variant="outline">
          <Link to="/files">Back to Files</Link>
        </Button>
      </div>
    )
  }

  const category = getCategory(file.name)
  const url = getFileDownloadUrl(file.name)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/files">
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{file.name}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatFileSize(file.size)} &middot; {formatDate(file.uploaded_at)} &middot; {category}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild className="shadow-sm">
          <a href={url} download={file.name}>
            <Download className="size-4 mr-1.5" />
            Download
          </a>
        </Button>
      </div>

      {category === "image" && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-muted/20 p-4">
          <img src={url} alt={file.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
        </div>
      )}

      {category === "video" && (
        <div className="flex items-center justify-center rounded-xl border border-border bg-black p-4">
          <video controls className="max-w-full max-h-[80vh] rounded-lg">
            <source src={url} type={file.mime} />
          </video>
        </div>
      )}

      {category === "audio" && (
        <div className="flex items-center justify-center py-16 rounded-xl border border-border bg-muted/20">
          <audio controls className="w-full max-w-lg">
            <source src={url} type={file.mime} />
          </audio>
        </div>
      )}

      {category === "document" && file.name.endsWith(".pdf") && (
        <PdfViewer url={url} onTextContent={handlePdfTextContent} maxHeight="75vh" />
      )}

      {(category === "document" && file.name.endsWith(".pdf") && textContent) && (
        <div className="border-t border-border pt-6 mt-6">
          <SummaryBlock
            summary={summary}
            summaryLoading={summaryLoading}
            onGenerate={handleSummary}
            onRegenerate={handleSummary}
          />
          {summaryError && (
            <p className="mt-3 text-sm text-destructive">{summaryError}</p>
          )}
        </div>
      )}

      {category === "document" && (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) && (
        <DocxPreview url={url} onTextContent={handlePdfTextContent} />
      )}

      {(category === "document" && (file.name.toLowerCase().endsWith(".docx") || file.name.toLowerCase().endsWith(".doc")) && textContent) && (
        <div className="border-t border-border pt-6 mt-6">
          <SummaryBlock
            summary={summary}
            summaryLoading={summaryLoading}
            onGenerate={handleSummary}
            onRegenerate={handleSummary}
          />
          {summaryError && <p className="mt-3 text-sm text-destructive">{summaryError}</p>}
        </div>
      )}

      {category === "document" && (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) && (
        <XlsxPreview url={url} onTextContent={handlePdfTextContent} />
      )}

      {(category === "document" && (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) && textContent) && (
        <div className="border-t border-border pt-6 mt-6">
          <SummaryBlock
            summary={summary}
            summaryLoading={summaryLoading}
            onGenerate={handleSummary}
            onRegenerate={handleSummary}
          />
          {summaryError && <p className="mt-3 text-sm text-destructive">{summaryError}</p>}
        </div>
      )}

      {category === "document" && !file.isText && !file.name.toLowerCase().endsWith(".pdf") && !file.name.toLowerCase().endsWith(".docx") && !file.name.toLowerCase().endsWith(".doc") && !file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls") && (
        <div className="text-center py-20 rounded-xl border border-border bg-muted/10">
          <FileText className="size-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-1">{file.name}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {formatFileSize(file.size)} &middot; {formatDate(file.uploaded_at)}
          </p>
          <Button asChild>
            <a href={url} download={file.name}>
              <Download className="size-4 mr-2" />
              Download File
            </a>
          </Button>
        </div>
      )}

      {file.name.toLowerCase().endsWith(".csv") && (
        <>
          <CsvPreview url={url} onTextContent={handlePdfTextContent} />
          {textContent && (
            <div className="border-t border-border pt-6 mt-6">
              <SummaryBlock
                summary={summary}
                summaryLoading={summaryLoading}
                onGenerate={handleSummary}
                onRegenerate={handleSummary}
              />
              {summaryError && <p className="mt-3 text-sm text-destructive">{summaryError}</p>}
            </div>
          )}
        </>
      )}

      {file.isText && !file.name.toLowerCase().endsWith(".csv") && (
        <div className="space-y-6">
          {contentLoading ? (
            <div className="flex items-center justify-center py-20 rounded-xl border border-border">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : textContent !== null ? (
            <>
              <div className="rounded-xl border border-border bg-zinc-950 dark:bg-black overflow-auto max-h-[70vh]">
                <pre className="p-5 text-sm leading-relaxed overflow-x-auto">
                  <code>{textContent}</code>
                </pre>
              </div>

              <SummaryBlock
                summary={summary}
                summaryLoading={summaryLoading}
                onGenerate={handleSummary}
                onRegenerate={handleSummary}
              />
              {summaryError && (
                <p className="mt-3 text-sm text-destructive">{summaryError}</p>
              )}
            </>
          ) : (
            <div className="text-center py-16 rounded-xl border border-border">
              <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Could not load file content</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a href={url} download={file.name}>
                  <Download className="size-4 mr-1.5" />
                  Download instead
                </a>
              </Button>
            </div>
          )}
        </div>
      )}

      {category === "other" && (
        <div className="text-center py-20 rounded-xl border border-border bg-muted/10">
          <FileText className="size-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-1">{file.name}</p>
          <p className="text-sm text-muted-foreground mb-6">
            {formatFileSize(file.size)} &middot; {formatDate(file.uploaded_at)}
          </p>
          <Button asChild>
            <a href={url} download={file.name}>
              <Download className="size-4 mr-2" />
              Download File
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
