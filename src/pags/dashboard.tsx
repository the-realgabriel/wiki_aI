import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getRows } from "@/lib/rest"
import { useAuth } from "#contexts/AuthContext"
import { BookOpenIcon, FileArchiveIcon, PlusIcon, ArrowRightIcon, Loader2 } from "lucide-react"
import type { WikiPage } from "@/lib/wiki"

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
      className="flex items-center gap-4 rounded-lg border bg-card p-5 hover:bg-accent transition-colors"
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
  const { user } = useAuth()
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [fileCount, setFileCount] = useState<number | null>(null)
  const [recentPages, setRecentPages] = useState<WikiPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [pages, files] = await Promise.all([
          getRows("wiki_pages", { order: "created_at.desc", limit: "5" }),
          getRows("wiki_files", { type: "eq.file", limit: "1000" }),
        ])
        setPageCount(pages.length < 5 ? pages.length : parseInt(pages[0]?.count || "0"))
        setFileCount(files.length)
        setRecentPages(
          (pages as any[]).map((p) => ({
            slug: p.slug,
            title: p.title,
            tags: p.tags || [],
            content: p.content || "",
          }))
        )
        // Get accurate total count
        const countResult = await getRows("wiki_pages", { select: "id", limit: "1000" })
        setPageCount(countResult.length)
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="p-6 lg:p-8 max-w-4xl">
              <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome{user ? `, ${user.email?.split("@")[0]}` : ""}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Here's what's happening in your wiki.
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
                      <div className="text-center py-12 border rounded-lg bg-card">
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
                            className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                          >
                            <h3 className="font-medium">{page.title}</h3>
                            {page.tags.length > 0 && (
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {page.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
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
                </>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
