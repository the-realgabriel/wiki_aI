const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? "gemma4:e2b ";

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
    throw new Error(`Ollama API error: ${err}`);
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
