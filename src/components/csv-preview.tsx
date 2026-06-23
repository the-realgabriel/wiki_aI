import { useEffect, useState, useRef } from 'react'
import Papa from 'papaparse'
import { Loader2, AlertCircle, Download } from 'lucide-react'
import { Button } from '#components/ui/button'

interface CsvPreviewProps {
  url: string
  onTextContent?: (text: string) => void
}

export function CsvPreview({ url, onTextContent }: CsvPreviewProps) {
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const textContentRef = useRef(onTextContent)

  useEffect(() => {
    textContentRef.current = onTextContent
  }, [onTextContent])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setRows([])

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load CSV')
        return r.text()
      })
      .then((raw) => {
        if (cancelled) return
        const result = Papa.parse<string[]>(raw, { skipEmptyLines: true })
        const parsed = result.data.map((row) =>
          row.map((cell: unknown) => (cell == null ? '' : String(cell)))
        )
        setRows(parsed)
        setLoading(false)

        const cb = textContentRef.current
        if (cb) {
          const text = parsed.map((r) => r.join('\t')).join('\n')
          cb(text)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => { cancelled = true }
  }, [url])

  if (error) {
    return (
      <div className="text-center py-16 rounded-xl border border-border">
        <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Could not load CSV</p>
        <p className="text-xs text-muted-foreground/60 mt-1 mb-4">{error}</p>
        <Button variant="outline" size="sm" asChild>
          <a href={url} download>
            <Download className="size-4 mr-1.5" />
            Download instead
          </a>
        </Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 rounded-xl border border-border">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-border">
        <p className="text-sm text-muted-foreground">This CSV is empty.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/30">
              {rows[0].map((cell, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((row, ri) => (
              <tr key={ri} className="border-b border-border/50 last:border-b-0 hover:bg-accent/20">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 whitespace-nowrap max-w-[300px] truncate">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
