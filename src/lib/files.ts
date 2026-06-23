export interface FileItem {
  name: string
  path: string
  size: number
  uploaded_at: string
  modified_at: string
  type: string
  mime: string
  category: "image" | "code" | "document" | "audio" | "video" | "other"
  isText: boolean
}

export async function fetchFiles(): Promise<FileItem[]> {
  const res = await fetch("/api/files/browse")
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch files" }))
    throw new Error(err.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export function getFileDownloadUrl(name: string): string {
  return `/api/files/download/${encodeURIComponent(name)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export async function deleteFile(path: string): Promise<void> {
  const res = await fetch(`/api/files?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Delete failed" }))
    throw new Error(err.error || "Delete failed")
  }
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
