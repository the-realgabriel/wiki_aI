import { useState } from "react"
import { Button } from "@/components/ui/button"
import { generateSummary } from "@/lib/ollama"
import { Sparkles, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type Props = {
  content: string
}

export function SummaryButton({ content }: Props) {
  const [summary, setSummary] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateSummary(content)
      setSummary(result)
      setOpen(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-6">
      <Button onClick={handleGenerate} disabled={loading} size="sm" variant="outline" className="shadow-sm">
        {loading ? (
          <Loader2 className="mr-1.5 size-4 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 size-4" />
        )}
        {loading ? "Generating..." : "Generate Summary"}
      </Button>

      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Summary</DialogTitle>
            <DialogDescription>
              AI-generated summary of this page.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm leading-relaxed">{summary}</div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
