import { useEffect, useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Loader2, AlertCircle, Download } from 'lucide-react'
import { Button } from '#components/ui/button'

interface XlsxPreviewProps {
  url: string
  onTextContent?: (text: string) => void
}

interface SheetData {
  name: string
  rows: string[][]
  cols: { name: string; key: number }[]
}

export function XlsxPreview({ url, onTextContent }: XlsxPreviewProps) {
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
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
    setSheets([])
    setActiveSheet(0)

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load spreadsheet')
        return r.arrayBuffer()
      })
      .then((buffer) => {
        if (cancelled) return
        const workbook = XLSX.read(buffer, { type: 'array' })
        const result: SheetData[] = []

        for (const name of workbook.SheetNames) {
          const sheet = workbook.Sheets[name]
          const ref = sheet['!ref']
          if (!ref) {
            result.push({ name, rows: [], cols: [] })
            continue
          }
          const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })
          const rows = aoa.map((row) =>
            row.map((cell) => (cell == null ? '' : String(cell)))
          )
          const cols = rows[0]?.map((_, i) => ({ name: `Col ${i + 1}`, key: i })) || []
          result.push({ name, rows, cols })
        }

        if (!cancelled) {
          setSheets(result)
          setLoading(false)

          const cb = textContentRef.current
          if (cb) {
            const textParts = result.map((s) => {
              const header = `Sheet: ${s.name}`
              const data = s.rows.map((r) => r.join('\t')).join('\n')
              return `${header}\n${data}`
            })
            cb(textParts.join('\n\n'))
          }
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
        <p className="text-sm text-muted-foreground">Could not load spreadsheet</p>
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

  if (sheets.length === 0) {
    return (
      <div className="text-center py-16 rounded-xl border border-border">
        <p className="text-sm text-muted-foreground">This spreadsheet appears to be empty.</p>
      </div>
    )
  }

  const active = sheets[activeSheet]

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {sheets.length > 1 && (
        <div className="flex border-b border-border bg-muted/20 overflow-x-auto">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              className={`px-4 py-2 text-xs font-medium border-r border-border last:border-r-0 transition-colors ${
                i === activeSheet
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveSheet(i)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-auto max-h-[70vh]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/30">
              {active.cols.map((_, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap"
                >
                  {active.rows[0]?.[i] || `Col ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.rows.slice(1).map((row, ri) => (
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
