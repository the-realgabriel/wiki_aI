const OLLAMA_BASE_URL = (import.meta.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/+$/g, '');
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL ?? "gemma4:e2b").trim();

const SYSTEM_PROMPT = `You are an AI assistant for a wiki knowledge base. Your role is to provide accurate, helpful information based on the wiki content provided to you. Always cite the wiki content when possible and acknowledge when information is beyond the scope of the wiki.`;

async function ollamaChat(
  messages: { role: string; content: string }[],
  options?: { max_tokens?: number; temperature?: number }
) {
  const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      max_tokens: options?.max_tokens ?? 500,
      temperature: options?.temperature ?? 0.5,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 404) {
      throw new Error(`Ollama model "${OLLAMA_MODEL}" not found. Pull it with: ollama pull ${OLLAMA_MODEL}`);
    }
    if (res.status === 403) {
      throw new Error(
        `Ollama returned 403. The proxy is likely forwarding your auth token to Ollama. ` +
        `Try setting VITE_OLLAMA_BASE_URL=http://localhost:11434 (direct connection) or ` +
        `check if Ollama requires authentication. Response: ${err}`
      );
    }
    throw new Error(`Ollama API error (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content ?? "No response available.";
}

export async function generateSummary(content: string): Promise<string> {
  return ollamaChat(
    [
      {
        role: "system",
        content:
          "You are a helpful assistant that generates concise wiki summaries. Provide a 2-3 sentence summary of the given wiki content. Keep it clear and informative.",
      },
      {
        role: "user",
        content: `Summarize the following wiki content:\n\n${content}`,
      },
    ],
    { max_tokens: 200, temperature: 0.3 }
  );
}

export async function chatWithWiki(
  messages: { role: "user" | "assistant"; content: string }[],
  pageContent: string
): Promise<string> {
  const systemMessage = {
    role: "system" as const,
    content: `${SYSTEM_PROMPT}\n\nHere is the wiki page content that the user is currently viewing:\n\n${pageContent}`,
  };

  return ollamaChat([systemMessage, ...messages], {
    max_tokens: 500,
    temperature: 0,
  });
}

export type ChatEvent = {
  type: 'searching'
  query: string
} | {
  type: 'search_complete'
  resultCount: number
} | {
  type: 'token'
  content: string
} | {
  type: 'done'
} | {
  type: 'error'
  message: string
}

export async function chatWithWebSearch(
  messages: { role: string; content: string }[],
  pageContent: string,
  onEvent: (event: ChatEvent) => void,
): Promise<string> {
  const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/g, '')
  const res = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, pageContent }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error')
    throw new Error(`Chat API error (${res.status}): ${err}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      try {
        const data = JSON.parse(trimmed.slice(6))
        const event = data as ChatEvent
        onEvent(event)
        if (event.type === 'token') {
          fullContent += event.content
        }
      } catch {
        // skip malformed events
      }
    }
  }

  return fullContent
}
