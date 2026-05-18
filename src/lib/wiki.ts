import pagesData from "../data/pages.json";

export type WikiPage = {
  slug: string;
  title: string;
  tags: string[];
  content: string;
};

export function getAllPages(): WikiPage[] {
  return pagesData as WikiPage[];
}

export function getPageBySlug(slug: string): WikiPage | undefined {
  return (pagesData as WikiPage[]).find((p) => p.slug === slug);
}

export function searchPages(query: string): WikiPage[] {
  const q = query.toLowerCase();
  return (pagesData as WikiPage[]).filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}
