import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { semanticSearchAll, searchAll, type SearchResult } from "@/lib/search"
import {
  FileIcon,
  BookOpenIcon,
  SearchIcon,
  ArrowRight,
  SparklesIcon,
  TypeIcon,
} from "lucide-react"

function ResultCard({ result, type }: { result: SearchResult; type: "semantic" | "keyword" }) {
  return (
    <Link
      to={result.url}
      className="block p-4 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {result.type === "wiki" ? (
            <BookOpenIcon className="size-4 text-primary" />
          ) : (
            <FileIcon className="size-4 text-amber-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{result.title}</h3>
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {result.type === "wiki" ? "Wiki" : "File"}
            </span>
            {result.score && (
              <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                {result.score}%
              </span>
            )}
            {type === "semantic" && (
              <SparklesIcon className="size-3 text-primary shrink-0" />
            )}
          </div>
          {result.tags && result.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-1">
              {result.tags.map((tag) => (
                <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {result.preview}
          </p>
        </div>
        <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-1" />
      </div>
    </Link>
  )
}

function SearchResults({ query }: { query: string }) {
  const [semantic, setSemantic] = useState<SearchResult[]>([])
  const [keyword, setKeyword] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<"hybrid" | "keyword">("hybrid")

  useEffect(() => {
    setLoading(true)
    if (mode === "hybrid") {
      semanticSearchAll(query)
        .then((r) => {
          setSemantic(r.semantic)
          setKeyword(r.keyword)
        })
        .finally(() => setLoading(false))
    } else {
      searchAll(query).then((r) => {
        setSemantic([])
        setKeyword(r)
        setLoading(false)
      })
    }
  }, [query, mode])

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Searching...</p>
      </div>
    )
  }

  const total = semantic.length + keyword.length

  if (total === 0) {
    return (
      <div className="text-center py-20">
        <SearchIcon className="size-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          {total} result{total !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
        </p>
        <div className="flex items-center gap-1 text-sm bg-muted/50 p-0.5 rounded-lg">
          <button
            onClick={() => setMode("hybrid")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              mode === "hybrid" ? "bg-background text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SparklesIcon className="size-3.5" />
            Semantic
          </button>
          <button
            onClick={() => setMode("keyword")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
              mode === "keyword" ? "bg-background text-foreground font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TypeIcon className="size-3.5" />
            Keyword
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {semantic.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3 text-sm font-medium text-muted-foreground">
              <SparklesIcon className="size-4 text-primary" />
              Semantic matches
            </div>
            <div className="space-y-2">
              {semantic.map((r, i) => (
                <ResultCard key={`sem-${r.url}-${i}`} result={r} type="semantic" />
              ))}
            </div>
          </section>
        )}

        {keyword.length > 0 && (
          <section>
            {semantic.length > 0 && (
              <div className="flex items-center gap-1.5 mb-3 text-sm font-medium text-muted-foreground">
                <TypeIcon className="size-4" />
                Keyword matches
              </div>
            )}
            <div className="space-y-2">
              {keyword.map((r, i) => (
                <ResultCard key={`kw-${r.url}-${i}`} result={r} type="keyword" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function Search() {
  useEffect(() => { document.title = "Search — Dataphyte Wiki" }, [])
  const [searchParams] = useSearchParams()
  const query = searchParams.get("q") || ""

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Search</h1>
      {query ? (
        <SearchResults query={query} />
      ) : (
        <div className="text-center py-20">
          <SearchIcon className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Search the Wiki</h2>
          <p className="text-muted-foreground">
            Use the search bar in the header to find wiki pages and files.
          </p>
        </div>
      )}
    </>
  )
}
