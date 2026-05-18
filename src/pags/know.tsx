import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { getAllPages } from "@/lib/wiki"
import { Link, useParams } from "react-router-dom"
import { getPageBySlug } from "@/lib/wiki"
import Markdown from "react-markdown"
import { SummaryButton } from "@/components/summary-button"
import { ChatPanel } from "@/components/chat-panel"
import { ArrowLeft, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"

function KnowledgeBaseList() {
  const pages = getAllPages()

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Browse wiki pages or use the search bar above to find topics.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.slug}
            to={`/knowledge-base/${page.slug}`}
            className="group block p-5 rounded-lg border bg-card hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="size-4 text-primary" />
              <h2 className="font-semibold group-hover:text-primary transition-colors">
                {page.title}
              </h2>
            </div>
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
          </Link>
        ))}
      </div>
    </>
  )
}

function KnowledgeBasePage() {
  const { slug } = useParams<{ slug: string }>()
  const page = slug ? getPageBySlug(slug) : undefined

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
    <>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link to="/knowledge-base">
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">{page.title}</h1>
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
        <SummaryButton content={page.content} />
      </div>

      <div className="prose prose-sm max-w-none">
        <Markdown>{page.content}</Markdown>
      </div>

      <ChatPanel pageContent={page.content} />
    </>
  )
}

export default function KnowledgeBase() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="p-6 lg:p-8 max-w-3xl">
              {slug ? <KnowledgeBasePage /> : <KnowledgeBaseList />}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
