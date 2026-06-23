const OLLAMA_BASE_URL = (import.meta.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/+$/g, '')
const EMBEDDING_MODEL = (import.meta.env.VITE_EMBEDDING_MODEL ?? "nomic-embed-text").trim()

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/v1/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  })
  if (!res.ok) {
    const err = await res.text()
    if (res.status === 404) {
      throw new Error(`Ollama embedding model "${EMBEDDING_MODEL}" not found. Pull it with: ollama pull ${EMBEDDING_MODEL}`)
    }
    if (res.status === 403) {
      throw new Error(
        `Ollama returned 403. The proxy may be forwarding auth headers. ` +
        `Try setting VITE_OLLAMA_BASE_URL=http://localhost:11434 directly. Response: ${err}`
      )
    }
    throw new Error(`Embedding API error (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.data?.[0]?.embedding ?? data.embedding
}

export type IndexedDoc = {
  id: string
  type: "wiki" | "file"
  title: string
  url: string
  content: string
  tags: string[]
  embedding?: number[]
}

let indexCache: { docs: IndexedDoc[]; embeddingModel: string } | null = null

function strip(text: string): string {
  return text.replace(/[#*`\[\]()>|_-]/g, " ").replace(/\s+/g, " ").trim()
}

export function clearIndexCache() {
  indexCache = null
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.allSettled(
    texts.map((text) => generateEmbedding(text.slice(0, 2048)))
  )
  return results.map((r) => (r.status === 'fulfilled' ? r.value : []))
}

export async function indexDocuments(docs: IndexedDoc[]): Promise<IndexedDoc[]> {
  const existing = indexCache?.docs
  if (existing && existing.length === docs.length && indexCache?.embeddingModel === EMBEDDING_MODEL) {
    return existing
  }

  const needsEmbedding = docs.filter((d) => !d.embedding)
  if (needsEmbedding.length > 0) {
    const texts = needsEmbedding.map((d) => strip(`${d.title} ${d.tags.join(" ")} ${d.content}`))
    const embeddings = await embedBatch(texts)
    for (let i = 0; i < needsEmbedding.length; i++) {
      needsEmbedding[i].embedding = embeddings[i]
    }
  }

  indexCache = { docs, embeddingModel: EMBEDDING_MODEL }
  return docs
}

export function semanticSearch(
  queryEmbedding: number[],
  docs: IndexedDoc[],
  topK = 10
): { doc: IndexedDoc; score: number }[] {
  const scored: { doc: IndexedDoc; score: number }[] = []

  for (const doc of docs) {
    if (doc.embedding && doc.embedding.length > 0) {
      const score = cosineSimilarity(queryEmbedding, doc.embedding)
      scored.push({ doc, score })
    }
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}
