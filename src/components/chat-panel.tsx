import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { chatWithWiki } from "@/lib/ollama";
import { MessageSquare, Send, X } from "lucide-react";

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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await chatWithWiki(
        updated.map((m) => ({ role: m.role, content: m.content })),
        pageContent
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
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
                      : "bg-muted"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
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
