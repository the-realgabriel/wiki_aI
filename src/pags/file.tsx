import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useParams } from "react-router-dom"
import { FileBrowser } from "@/components/file-browser"
import { FileViewer } from "@/components/file-viewer"

function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown)$/i.test(path)
}

function FileContent() {
  const params = useParams()
  const filePath = params["*"] ?? ""

  // If the path is empty, show root directory
  if (!filePath) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Files</h1>
        <FileBrowser currentPath="" />
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
