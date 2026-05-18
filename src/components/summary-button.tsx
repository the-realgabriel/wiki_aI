import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generateSummary } from "@/lib/ollama";
import { Sparkles } from "lucide-react";

type Props = {
  content: string;
};

export function SummaryButton({ content }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSummary(content);
      setSummary(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6">
      <Button onClick={handleGenerate} disabled={loading} size="sm">
        <Sparkles className="mr-1.5 size-4" />
        {loading ? "Generating..." : "Generate Summary"}
      </Button>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {summary && (
        <div className="mt-4 p-4 rounded-lg border bg-muted/50">
          <p className="text-xs font-medium mb-1 text-muted-foreground">
            AI Summary
          </p>
          <p className="text-sm leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}
