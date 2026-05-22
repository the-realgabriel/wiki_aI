import { getAllPages } from './wiki'
import { getRows } from './rest'
import { generateEmbedding, indexDocuments, semanticSearch, type IndexedDoc } from './embeddings'

export type SearchResult = {
  type: "wiki" | "file"
  title: string
  url: string
  preview: string
  tags?: string[]
  score?: number
}

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*`\[\]()>|_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function getPreview(text: string, query: string, maxLen = 150): string {
  const clean = stripMarkdown(text)
  const lower = clean.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())

  if (idx === -1) return clean.slice(0, maxLen) + (clean.length > maxLen ? "..." : "")

  const start = Math.max(0, idx - 60)
  const end = Math.min(clean.length, idx + query.length + 60)
  let snippet = (start > 0 ? "..." : "") + clean.slice(start, end) + (end < clean.length ? "..." : "")
  if (snippet.length > maxLen + 30) {
    snippet = snippet.slice(0, maxLen) + "..."
  }
  return snippet
}

export async function searchWikiPages(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const pages = await getAllPages()
  return pages
    .filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    )
    .map((p) => ({
      type: "wiki" as const,
      title: p.title,
      url: `/knowledge-base/${p.slug}`,
      preview: getPreview(p.content, q),
      tags: p.tags,
    }))
}

export async function searchFiles(query: string): Promise<SearchResult[]> {
  const q = query.toLowerCase().trim()
  if (!q) return []

  const rows = await getRows("wiki_files", {
    type: "eq.file",
    select: "path,name,content",
  })

  const results: SearchResult[] = []

  for (const file of rows) {
    const name = file.name || file.path.split("/").pop()
    const content: string = file.content || ""
    const matchesName = name.toLowerCase().includes(q)
    const matchesContent = content.toLowerCase().includes(q)

    if (matchesName || matchesContent) {
      results.push({
        type: "file",
        title: file.path,
        url: `/files/${file.path}`,
        preview: getPreview(content, q),
      })
    }
  }

  return results
}

export async function semanticSearchAll(query: string): Promise<{
  semantic: SearchResult[]
  keyword: SearchResult[]
}> {
  const q = query.trim()
  if (!q) return { semantic: [], keyword: [] }

  const [pages, fileRows] = await Promise.all([
    getAllPages(),
    getRows("wiki_files", { select: "path,name,content" }).catch(() => []),
  ])

  const docs: IndexedDoc[] = [
    ...pages.map((p) => ({
      id: `wiki:${p.slug}`,
      type: "wiki" as const,
      title: p.title,
      url: `/knowledge-base/${p.slug}`,
      content: p.content,
      tags: p.tags,
    })),
    ...fileRows.map((f: any) => ({
      id: `file:${f.path}`,
      type: "file" as const,
      title: f.name || f.path.split("/").pop(),
      url: `/files/${f.path}`,
      content: f.content || "",
      tags: [] as string[],
    })),
  ]

  let queryEmbedding: number[]
  try {
    queryEmbedding = await generateEmbedding(q)
  } catch {
    return {
      semantic: [],
      keyword: await searchAll(q),
    }
  }

  const indexed = await indexDocuments(docs)
  const scored = semanticSearch(queryEmbedding, indexed, 10)

  const qLower = q.toLowerCase()
  const semantic: SearchResult[] = scored
    .filter((s) => s.score > 0.25)
    .map((s) => ({
      type: s.doc.type,
      title: s.doc.title,
      url: s.doc.url,
      preview: getPreview(s.doc.content, q),
      tags: s.doc.tags,
      score: Math.round(s.score * 100),
    }))

  const keyword = docs
    .filter(
      (d) =>
        !semantic.some((s) => s.url === d.url) &&
        (d.title.toLowerCase().includes(qLower) ||
          d.content.toLowerCase().includes(qLower) ||
          d.tags.some((t) => t.toLowerCase().includes(qLower)))
    )
    .map((d) => ({
      type: d.type,
      title: d.title,
      url: d.url,
      preview: getPreview(d.content, q),
      tags: d.tags,
    }))

  return { semantic, keyword }
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  const [wiki, files] = await Promise.all([
    searchWikiPages(query),
    searchFiles(query),
  ])
  return [...wiki, ...files]
}
