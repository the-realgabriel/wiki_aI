import { useState, useEffect } from "react"
import { FileBrowser } from "#components/file-browser"
import { UploadDialog } from "#components/upload-dialog"
import { Button } from "#components/ui/button"
import { UploadIcon } from "lucide-react"

export default function File() {
  useEffect(() => { document.title = "Files — Dataphyte Wiki" }, [])
  const [showUpload, setShowUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <p className="text-muted-foreground mt-1">Browse and manage your uploaded files.</p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="shadow-sm">
          <UploadIcon className="size-4 mr-2" />
          Upload
        </Button>
      </div>
      <FileBrowser key={refreshKey} />
      {showUpload && (
        <UploadDialog onClose={() => { setShowUpload(false); setRefreshKey(k => k + 1) }} />
      )}
    </>
  )
}
