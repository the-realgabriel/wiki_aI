import pagesData from "../data/pages.json";
import fileContentsData from "../data/file-contents.json";

export type SearchResult = {
  type: "wiki" | "file";
  title: string;
  url: string;
  preview: string;
  tags?: string[];
};

type WikiPage = {
  slug: string;
  title: string;
  tags: string[];
  content: string;
};

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*`\[\]()>|_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPreview(text: string, query: string, maxLen = 150): string {
  const clean = stripMarkdown(text);
  const lower = clean.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());

  if (idx === -1) return clean.slice(0, maxLen) + (clean.length > maxLen ? "..." : "");

  const start = Math.max(0, idx - 60);
  const end = Math.min(clean.length, idx + query.length + 60);
  let snippet = (start > 0 ? "..." : "") + clean.slice(start, end) + (end < clean.length ? "..." : "");
  if (snippet.length > maxLen + 30) {
    snippet = snippet.slice(0, maxLen) + "...";
  }
  return snippet;
}

export function searchWikiPages(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return (pagesData as WikiPage[])
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
    }));
}

export function searchFiles(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const contents = fileContentsData as Record<string, string>;
  const results: SearchResult[] = [];

  for (const [path, content] of Object.entries(contents)) {
    const name = path.split("/").pop() || path;
    const matchesName = name.toLowerCase().includes(q);
    const matchesContent = content.toLowerCase().includes(q);

    if (matchesName || matchesContent) {
      results.push({
        type: "file",
        title: path,
        url: `/files/${path}`,
        preview: getPreview(content, q),
      });
    }
  }

  return results;
}

export function searchAll(query: string): SearchResult[] {
  return [...searchWikiPages(query), ...searchFiles(query)];
}
