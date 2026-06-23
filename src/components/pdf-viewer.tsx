import { useState, useEffect, useCallback, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import { Loader2, AlertCircle, Download } from 'lucide-react'
import { Button } from '#components/ui/button'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
  onTextContent?: (text: string) => void
  maxHeight?: string
}

export function PdfViewer({ url, onTextContent, maxHeight = "80vh" }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)

  useEffect(() => {
    setNumPages(null)
    setPageNumber(1)
    setError(null)
    pdfRef.current = null
  }, [url])

  const handleLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {
    pdfRef.current = pdf
    setNumPages(pdf.numPages)
    if (!onTextContent) return
    try {
      const pagesText: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const text = textContent.items.map((item) => 'str' in item ? item.str : '').join(' ')
        pagesText.push(text)
      }
      onTextContent(pagesText.join('\n\n'))
    } catch {
      onTextContent('')
    }
  }, [onTextContent])

  const handleLoadError = useCallback((err: Error) => {
    setError(err.message)
  }, [])

  if (error) {
    return (
      <div className="text-center py-16 rounded-xl border border-border">
        <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Could not load PDF</p>
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
    <Document
      file={url}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={handleLoadError}
      loading={
        <div className="flex items-center justify-center py-20 rounded-xl border border-border">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
      error={
        <div className="text-center py-16 rounded-xl border border-border">
          <AlertCircle className="size-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Failed to load PDF</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href={url} download>
              <Download className="size-4 mr-1.5" />
              Download instead
            </a>
          </Button>
        </div>
      }
    >
      {numPages && (
        <div className="rounded-xl border border-border overflow-hidden" style={{ maxHeight }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20 text-xs text-muted-foreground shrink-0">
            <span>Page {pageNumber} of {numPages}</span>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-0.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                className="px-2 py-0.5 rounded hover:bg-accent disabled:opacity-30 transition-colors"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
          <div className="overflow-auto p-4 flex justify-center bg-muted/10">
            <Page
              pageNumber={pageNumber}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-xl"
              width={Math.min(typeof window !== 'undefined' ? window.innerWidth - 64 : 900, 900)}
            />
          </div>
        </div>
      )}
    </Document>
  )
}
