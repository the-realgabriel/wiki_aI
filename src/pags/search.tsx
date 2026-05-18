import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { searchAll, type SearchResult } from "@/lib/search";
import {
  FileIcon,
  BookOpenIcon,
  SearchIcon,
  ArrowRight,
} from "lucide-react";

function SearchResults({ query }: { query: string }) {
  const results = useMemo(() => searchAll(query), [query]);

  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <SearchIcon className="size-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;. Try a different search term.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
      </p>

      <div className="space-y-3">
        {results.map((result, i) => (
          <ResultCard key={`${result.type}-${result.title}-${i}`} result={result} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Link
      to={result.url}
      className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
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
            <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {result.type === "wiki" ? "Wiki" : "File"}
            </span>
          </div>
          {result.tags && result.tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-1">
              {result.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
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
  );
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <div className="p-6 lg:p-8 max-w-3xl">
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
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
