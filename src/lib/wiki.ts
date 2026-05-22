import { getRows } from './rest';

export type WikiPage = {
  slug: string;
  title: string;
  tags: string[];
  content: string;
};

function mapPage(row: any): WikiPage {
  return {
    slug: row.slug,
    title: row.title,
    tags: row.tags || [],
    content: row.content || "",
  };
}

export async function getAllPages(): Promise<WikiPage[]> {
  const rows = await getRows("wiki_pages", { order: "title.asc" });
  return rows.map(mapPage);
}

export async function getPageBySlug(slug: string): Promise<WikiPage | undefined> {
  const rows = await getRows("wiki_pages", { slug: `eq.${slug}` });
  return rows.length > 0 ? mapPage(rows[0]) : undefined;
}

export async function searchPages(query: string): Promise<WikiPage[]> {
  const q = query.toLowerCase();
  const all = await getAllPages();
  return all.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}
