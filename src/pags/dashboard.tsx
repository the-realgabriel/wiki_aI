import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { fetchPages } from "#lib/wiki-api"
import { fetchFiles, formatFileSize, formatDate } from "#lib/files"
import { useAuth } from "#contexts/AuthContext"
import { BookOpenIcon, FileArchiveIcon, PlusIcon, ArrowRightIcon, Loader2, FileIcon } from "lucide-react"
import type { WikiPage } from "#lib/wiki"
import type { FileItem } from "#lib/files"

type StatCardProps = {
  title: string
  value: string | number
  icon: React.ReactNode
  href: string
}

function StatCard({ title, value, icon, href }: StatCardProps) {
  return (
    <Link
      to={href}
      className="flex items-center gap-4 rounded-xl border bg-card p-5 hover:bg-accent/50 transition-all duration-200 hover:shadow-sm hover-lift"
    >
      <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  useEffect(() => { document.title = "Dashboard — Dataphyte Wiki" }, [])
  const { user } = useAuth()
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [recentPages, setRecentPages] = useState<WikiPage[]>([])
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [recent, all, files] = await Promise.all([
          fetchPages({ order: 'created_at.desc', limit: '5' }),
          fetchPages({ limit: '1000' }),
          fetchFiles(),
        ])
        setPageCount(all.length)
        setFileCount(files.length)
        setRecentFiles(files.slice(0, 5))
        setRecentPages(recent)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome{user ? `, ${user.email?.split("@")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening in your wiki.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 mb-8">
            <StatCard
              title="Wiki Pages"
              value={pageCount ?? 0}
              icon={<BookOpenIcon className="size-6" />}
              href="/knowledge-base"
            />
            <StatCard
              title="Files"
              value={fileCount ?? 0}
              icon={<FileArchiveIcon className="size-6" />}
              href="/files"
            />
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Pages</h2>
                <Link
                  to="/knowledge-base"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRightIcon className="size-3" />
                </Link>
              </div>

              {recentPages.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-card">
                  <BookOpenIcon className="size-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No pages yet</p>
                  <Link
                    to="/knowledge-base"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <PlusIcon className="size-4" />
                    Create your first page
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPages.map((page) => (
                    <Link
                      key={page.slug}
                      to={`/knowledge-base/${page.slug}`}
                      className="block p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-sm"
                    >
                      <h3 className="font-medium">{page.title}</h3>
                      {page.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {page.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Uploads</h2>
                <Link
                  to="/files"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ArrowRightIcon className="size-3" />
                </Link>
              </div>

              {recentFiles.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-card">
                  <FileArchiveIcon className="size-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No files uploaded yet</p>
                  <Link
                    to="/files"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <PlusIcon className="size-4" />
                    Upload your first file
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentFiles.map((file) => (
                    <Link
                      key={file.path}
                      to={`/file/${encodeURIComponent(file.name)}`}
                      className="block p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
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
      )}
    </>
  )
}
