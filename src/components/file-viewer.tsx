import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchFileContent, type FileData } from "@/lib/file-server"
import Markdown from "react-markdown"
import { ArrowLeft, Loader2, FileIcon, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePageContent } from "#components/right-sidebar"
import { useRightSidebar } from "#components/right-sidebar"

type Props = {
  filePath: string
}

export function FileViewer({ filePath }: Props) {
  const [file, setFile] = useState<FileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { setPageContent } = usePageContent()
  const { setPageMeta } = useRightSidebar()

  useEffect(() => {
    let cancelled = false
    fetchFileContent(filePath)
      .then((f) => {
        if (cancelled) return
        setFile(f)
        if (f?.content) {
          setPageContent(f.content)
          setPageMeta({
            title: f.name,
            type: "file",
            path: f.path,
            content: f.content,
            wordCount: f.content.split(/\s+/).filter(Boolean).length,
            fileSize: `${(f.content.length / 1024).toFixed(1)} KB`,
          })
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filePath, setPageContent, setPageMeta])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading file...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <FileIcon className="size-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-destructive mb-1">{error}</p>
        <p className="text-sm text-muted-foreground mb-4">The file may have been moved or deleted.</p>
        <Button asChild variant="outline">
          <Link to="/files">Back to Files</Link>
        </Button>
      </div>
    )
  }

  if (!file) return null

  const dirPath = file.path.includes("/")
    ? "/" + file.path.substring(0, file.path.lastIndexOf("/"))
    : "/files"

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to={dirPath}>
          <ArrowLeft className="mr-1 size-4" />
          Back
        </Link>
      </Button>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
          <FileText className="size-3" />
          {file.name.endsWith(".md") ? "Markdown" : "File"}
        </span>
      </div>
      <h1 className="text-3xl font-bold mb-6">{file.name}</h1>

      <div className="prose prose-sm max-w-none overflow-x-auto">
        <Markdown>{file.content}</Markdown>
      </div>
    </div>
  )
}
