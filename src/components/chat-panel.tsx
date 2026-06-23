import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { chatWithWebSearch, type ChatEvent } from "@/lib/ollama";
import { MessageSquare, Send, X, Loader2, Globe, CheckCircle2 } from "lucide-react";
import Markdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  pageContent: string;
};

export function ChatPanel({ pageContent }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! Ask me anything about this wiki page.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchComplete, setSearchComplete] = useState(false);
  const [streamStarted, setStreamStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, searchingWeb]);

  async function handleSend() {
    if (!input.trim() || loading || !pageContent) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);
    setSearchingWeb(false);
    setSearchQuery("");
    setSearchComplete(false);
    setStreamStarted(false);

    let accumulated = "";
    try {
      await chatWithWebSearch(
        updated.map((m) => ({ role: m.role, content: m.content })),
        pageContent,
        (event: ChatEvent) => {
          switch (event.type) {
            case "searching":
              setSearchQuery(event.query);
              setSearchingWeb(true);
              setSearchComplete(false);
              break;
            case "search_complete":
              setSearchComplete(true);
              break;
            case "token":
              if (searchingWeb) setSearchingWeb(false);
              if (!streamStarted) setStreamStarted(true);
              accumulated += event.content;
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                if (last?.role === "assistant") {
                  copy[copy.length - 1] = { role: "assistant", content: accumulated };
                } else {
                  copy.push({ role: "assistant", content: accumulated });
                }
                return copy;
              });
              break;
            case "error":
              setError(event.message);
              break;
          }
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      setSearchingWeb(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        size="icon"
      >
        <MessageSquare className="size-5" />
      </Button>

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 h-[500px] flex flex-col rounded-lg border bg-background shadow-xl">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-sm font-medium">Ask AI</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted prose prose-sm max-w-none dark:prose-invert"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Markdown>{msg.content}</Markdown>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}
            {loading && !streamStarted && (
              <div className="flex justify-start">
                {searchingWeb ? (
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[90%]">
                    <div className="flex items-center gap-2 mb-1.5">
                      {searchComplete ? (
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Globe className="size-4 text-primary animate-pulse shrink-0" />
                      )}
                      <span className="font-medium text-foreground/80 text-xs uppercase tracking-wider">
                        {searchComplete ? "Search complete" : "Searching the web"}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs pl-6">
                      &ldquo;{searchQuery}&rdquo;
                    </p>
                    {!searchComplete && (
                      <div className="flex gap-1 mt-2 pl-6">
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                        <span className="size-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin inline mr-1.5" />
                    Thinking...
                  </div>
                )}
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                className="size-9"
                disabled={loading || !input.trim()}
              >
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
