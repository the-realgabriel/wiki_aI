import { useEffect, useRef, useState } from 'react'
import { renderAsync } from 'docx-preview'
import { Loader2, AlertCircle, Download } from 'lucide-react'
import { Button } from '#components/ui/button'

interface DocxPreviewProps {
  url: string
  onTextContent?: (text: string) => void
}

export function DocxPreview({ url, onTextContent }: DocxPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
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

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load document')
        return r.arrayBuffer()
      })
      .then(async (buffer) => {
        if (cancelled) return
        if (!containerRef.current) return

        await renderAsync(buffer, containerRef.current, undefined, {
          className: 'docx-viewer',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        })

        if (!cancelled) setLoading(false)

        const cb = textContentRef.current
        if (cb) {
          const text = containerRef.current?.textContent || ''
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
        <p className="text-sm text-muted-foreground">Could not load document</p>
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

  return (
    <div className="rounded-xl border border-border overflow-auto max-h-[80vh] bg-white text-black">
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div
        ref={containerRef}
        className="docx-container"
        style={{ display: loading ? 'none' : undefined }}
      />
    </div>
  )
}
