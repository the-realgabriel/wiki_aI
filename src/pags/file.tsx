import { useState } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "#components/ui/button"
import { useParams } from "react-router-dom"
import { FileBrowser } from "@/components/file-browser"
import { FileViewer } from "@/components/file-viewer"
import { UploadDialog } from "#components/upload-dialog"
import { UploadIcon } from "lucide-react"

function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown)$/i.test(path)
}

function FileContent() {
  const params = useParams()
  const filePath = params["*"] ?? ""
  const [showUpload, setShowUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // If the path is empty, show root directory
  if (!filePath) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Files</h1>
          <Button onClick={() => setShowUpload(true)}>
            <UploadIcon className="size-4 mr-2" />
            Upload
          </Button>
        </div>
        <FileBrowser currentPath="" key={refreshKey} />
        {showUpload && (
          <UploadDialog onClose={() => { setShowUpload(false); setRefreshKey(k => k + 1) }} />
        )}
      </div>
    )
  }

  // If it looks like a markdown file, show file viewer
  if (isMarkdownFile(filePath)) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <FileViewer filePath={filePath} />
      </div>
    )
  }

  // Otherwise treat it as a directory path
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <FileBrowser currentPath={filePath} />
    </div>
  )
}

export default function File() {
  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <FileContent />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  )
}
