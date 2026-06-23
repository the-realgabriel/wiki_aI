import { createContext, useContext, useState, useRef, useEffect } from "react"
import { Button } from "#components/ui/button"
import { chatWithWebSearch, generateSummary, type ChatEvent } from "#lib/ollama"
import { MessageSquare, Sparkles, Send, X, Loader2, FileText, Tag, Type, Hash, FileArchive, Globe, CheckCircle2 } from "lucide-react"
import Markdown from "react-markdown"
import { cn } from "#lib/utils"

type PageMeta = {
  title: string
  type: "wiki" | "file" | "none"
  path?: string
  tags?: string[]
  wordCount?: number
  content?: string
  fileSize?: string
}

type RightSidebarContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
  tab: "chat" | "metadata"
  setTab: (tab: "chat" | "metadata") => void
  pageMeta: PageMeta
  setPageMeta: (meta: PageMeta) => void
}

const RightSidebarCtx = createContext<RightSidebarContextValue | null>(null)

type Message = {
  role: "user" | "assistant"
  content: string
}

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"chat" | "metadata">("chat")
  const [pageMeta, setPageMeta] = useState<PageMeta>({ title: "", type: "none", content: "" })
  const toggle = () => {
    setOpen((prev) => {
      if (!prev) setTab("chat")
      return !prev
    })
  }

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--right-sidebar-width",
      open ? "24rem" : "0px"
    )
  }, [open])

  return (
    <RightSidebarCtx.Provider value={{ open, setOpen, toggle, tab, setTab, pageMeta, setPageMeta }}>
      {children}
    </RightSidebarCtx.Provider>
  )
}

export function useRightSidebar() {
  const ctx = useContext(RightSidebarCtx)
  if (!ctx) throw new Error("useRightSidebar must be used within RightSidebarProvider")
  return ctx
}

type PageContentValue = {
  pageContent: string
  setPageContent: (content: string) => void
}

const PageContentCtx = createContext<PageContentValue | null>(null)

export function PageContentProvider({ children }: { children: React.ReactNode }) {
  const [pageContent, setPageContent] = useState("")
  return (
    <PageContentCtx.Provider value={{ pageContent, setPageContent }}>
      {children}
    </PageContentCtx.Provider>
  )
}

export function usePageContent() {
  const ctx = useContext(PageContentCtx)
  if (!ctx) throw new Error("usePageContent must be used within PageContentProvider")
  return ctx
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function MetadataPanel({ meta }: { meta: PageMeta }) {
  if (meta.type === "none" || !meta.content) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <FileText className="size-10 text-muted-foreground/50 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Open a wiki page or markdown file to see its metadata.
          </p>
        </div>
      </div>
    )
  }

  const items = [
    { label: "Title", value: meta.title, icon: <Type className="size-3.5" /> },
    ...(meta.type === "file" && meta.path ? [{ label: "Path", value: meta.path, icon: <FileArchive className="size-3.5" /> }] : []),
    ...(meta.fileSize ? [{ label: "Size", value: meta.fileSize, icon: <FileArchive className="size-3.5" /> }] : []),
    { label: "Type", value: meta.type === "wiki" ? "Wiki Page" : "File", icon: <FileText className="size-3.5" /> },
    { label: "Words", value: String(meta.wordCount ?? 0), icon: <Hash className="size-3.5" /> },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5 text-sm">
              <span className="text-muted-foreground shrink-0 mt-0.5">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="font-medium truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {meta.tags && meta.tags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="size-3" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {meta.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-accent/10 text-accent-foreground border border-accent/20"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ChatPanel({ pageContent }: { pageContent: string; pageMeta: PageMeta }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! Ask me anything about this page." },
  ])
  const [input, setInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [searchingWeb, setSearchingWeb] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchComplete, setSearchComplete] = useState(false)
  const [streamStarted, setStreamStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [summaryTab, setSummaryTab] = useState<"chat" | "summary">("chat")

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, searchingWeb])

  async function handleSend() {
    if (!input.trim() || chatLoading || !pageContent) return
    const userMsg: Message = { role: "user", content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    setChatLoading(true)
    setChatError(null)
    setSearchingWeb(false)
    setSearchQuery("")
    setSearchComplete(false)
    setStreamStarted(false)

    let accumulated = ""
    try {
      await chatWithWebSearch(
        updated.map((m) => ({ role: m.role, content: m.content })),
        pageContent,
        (event: ChatEvent) => {
          switch (event.type) {
            case "searching":
              setSearchQuery(event.query)
              setSearchingWeb(true)
              setSearchComplete(false)
              break
            case "search_complete":
              setSearchComplete(true)
              break
            case "token":
              if (searchingWeb) setSearchingWeb(false)
              if (!streamStarted) setStreamStarted(true)
              accumulated += event.content
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { role: "assistant", content: accumulated }
                } else {
                  copy.push({ role: "assistant", content: accumulated })
                }
                return copy
              })
              break
            case "error":
              setChatError(event.message)
              break
          }
        },
      )
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setChatLoading(false)
      setSearchingWeb(false)
    }
  }

  async function handleGenerateSummary() {
    if (!pageContent) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const result = await generateSummary(pageContent)
      setSummary(result)
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b">
        <TabBtn
          active={summaryTab === "chat"}
          onClick={() => setSummaryTab("chat")}
          icon={<MessageSquare className="size-3.5" />}
          label="Chat"
        />
        <TabBtn
          active={summaryTab === "summary"}
          onClick={() => setSummaryTab("summary")}
          icon={<Sparkles className="size-3.5" />}
          label="Summary"
        />
      </div>

      {summaryTab === "chat" ? (
        <>
          {!pageContent ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground text-center">
                Open a wiki page or markdown file to ask questions about its content.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/60 border border-border/50 prose prose-sm max-w-none dark:prose-invert"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <Markdown>{msg.content}</Markdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && !streamStarted && (
                  <div className="flex justify-start">
                    {searchingWeb ? (
                      <div className="bg-muted/60 border border-border/50 rounded-xl px-3.5 py-2.5 text-sm max-w-[90%]">
                        <div className="flex items-center gap-2 mb-1.5">
                          {searchComplete ? (
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Globe className="size-4 text-primary animate-pulse shrink-0" />
                          )}
                          <span className="font-medium text-foreground/80 text-xs uppercase tracking-wider">
                            {searchComplete ? "Search complete" : "Searching the web"}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs pl-6">
                          &ldquo;{searchQuery}&rdquo;
                        </p>
                        {!searchComplete && (
                          <div className="flex gap-1 mt-2 pl-6">
                            <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                            <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                            <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted/60 border border-border/50 rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                        <Loader2 className="size-3.5 animate-spin" />
                        Thinking...
                      </div>
                    )}
                  </div>
                )}
                {chatError && <p className="text-xs text-destructive text-center">{chatError}</p>}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t bg-muted/20">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend() }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
                    disabled={chatLoading}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="size-9 shrink-0"
                    disabled={chatLoading || !input.trim()}
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {!pageContent ? (
            <p className="text-sm text-muted-foreground">
              Open a wiki page or markdown file to generate a summary.
            </p>
          ) : summary ? (
            <div className="space-y-4">
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/85">{summary}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                className="w-full"
              >
                {summaryLoading ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 size-4" />
                )}
                Regenerate
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="size-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Sparkles className="size-6 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Generate an AI summary of this page.
              </p>
              <Button onClick={handleGenerateSummary} disabled={summaryLoading}>
                {summaryLoading ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 size-4" />
                    Generate Summary
                  </>
                )}
              </Button>
              {summaryError && <p className="text-sm text-destructive">{summaryError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RightSidebar() {
  const { open, setOpen, tab, setTab, pageMeta } = useRightSidebar()
  const { pageContent } = usePageContent()

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 md:bg-transparent md:pointer-events-none"
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-dvh w-full sm:w-96 border-l bg-background/80 backdrop-blur-xl shadow-2xl flex flex-col",
          "dark:bg-sidebar/90 dark:border-sidebar-border"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b bg-muted/10">
          <div className="flex gap-1">
            <TabBtn
              active={tab === "metadata"}
              onClick={() => setTab("metadata")}
              icon={<FileText className="size-3.5" />}
              label="Metadata"
            />
            <TabBtn
              active={tab === "chat"}
              onClick={() => setTab("chat")}
              icon={<MessageSquare className="size-3.5" />}
              label="AI Chat"
            />
          </div>
          <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>

        {tab === "metadata" ? (
          <MetadataPanel meta={pageMeta} />
        ) : (
          <ChatPanel pageContent={pageContent} pageMeta={pageMeta} />
        )}
      </aside>
    </>
  )
}
