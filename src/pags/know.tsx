import { useState, useEffect } from "react"
import { getAllPages, getPageBySlug } from "@/lib/wiki"
import { fetchFiles, formatFileSize, formatDate } from "#lib/files"
import { Link, useParams } from "react-router-dom"
import type { WikiPage } from "@/lib/wiki"
import type { FileItem } from "#lib/files"
import Markdown from "react-markdown"
import { usePageContent } from "#components/right-sidebar"
import { useRightSidebar } from "#components/right-sidebar"
import { SummaryButton } from "#components/summary-button"
import { ArrowLeft, BookOpen, FileIcon, FileArchiveIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

function KnowledgeBaseList() {
  const [pages, setPages] = useState<WikiPage[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = "Knowledge Base — Dataphyte Wiki" }, [])
  useEffect(() => {
    Promise.all([
      getAllPages(),
      fetchFiles(),
    ]).then(([p, f]) => {
      setPages(p)
      setFiles(f)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
      </div>
    )
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Browse wiki pages and uploaded files, or use the search bar above to find topics.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="size-5 text-primary" />
            Wiki Pages
          </h2>
          {pages.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <BookOpen className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pages yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pages.map((page) => (
                <Link
                  key={page.slug}
                  to={`/knowledge-base/${page.slug}`}
                  className="group block p-5 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-sm hover-lift"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="size-4 text-primary" />
                    <h2 className="font-semibold group-hover:text-primary transition-colors">
                      {page.title}
                    </h2>
                  </div>
                  {page.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {page.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileArchiveIcon className="size-5 text-primary" />
            Uploaded Files
          </h2>
          {files.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <FileIcon className="size-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No files uploaded yet</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {files.map((file) => (
                <Link
                  key={file.path}
                  to={`/file/${encodeURIComponent(file.name)}`}
                  className="group block p-5 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-sm hover-lift"
                >
                  <div className="flex items-center gap-3">
                    <FileIcon className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold group-hover:text-primary transition-colors truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(file.size)} &middot; {formatDate(file.uploaded_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  )
}

function KnowledgeBasePage() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<WikiPage | undefined>(undefined)
  useEffect(() => { document.title = page ? `${page.title} — Dataphyte Wiki` : "Knowledge Base — Dataphyte Wiki" }, [page])
  const [loading, setLoading] = useState(() => !!slug)
  const { setPageContent } = usePageContent()
  const { setPageMeta, setOpen } = useRightSidebar()

  useEffect(() => {
    let cancelled = false
    if (slug) {
      getPageBySlug(slug).then((p) => {
        if (cancelled) return
        setPage(p)
        if (p?.content) {
          setPageContent(p.content)
          setPageMeta({
            title: p.title,
            type: "wiki",
            tags: p.tags,
            content: p.content,
            wordCount: p.content.split(/\s+/).filter(Boolean).length,
          })
        }
      }).finally(() => { if (!cancelled) setLoading(false) })
    }
    return () => { cancelled = true }
  }, [slug, setPageContent, setPageMeta])

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-3">Page Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The wiki page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild variant="outline">
          <Link to="/knowledge-base">Back to Knowledge Base</Link>
        </Button>
      </div>
    )
  }

  return (
    <article>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/knowledge-base">
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
            {page.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {page.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="shrink-0 shadow-sm"
          >
            AI Tools
          </Button>
        </div>
        <SummaryButton content={page.content} />
      </div>

      <div className="prose prose-sm max-w-none">
        <Markdown>{page.content}</Markdown>
      </div>
    </article>
  )
}

export default function KnowledgeBase() {
  const { slug } = useParams<{ slug: string }>()
  return slug ? <KnowledgeBasePage /> : <KnowledgeBaseList />
}
