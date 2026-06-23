import { fetchPages, fetchPage, searchPages as apiSearchPages } from './wiki-api';
import type { WikiPage } from './wiki-api';

export type { WikiPage };

export async function getAllPages(): Promise<WikiPage[]> {
  return fetchPages({ order: 'title.asc' });
}

export async function getPageBySlug(slug: string): Promise<WikiPage | undefined> {
  try {
    return await fetchPage(slug);
  } catch {
    return undefined;
  }
}

export async function searchPages(query: string): Promise<WikiPage[]> {
  return apiSearchPages(query);
}
