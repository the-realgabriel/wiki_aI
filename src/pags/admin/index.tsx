import { useState, useEffect } from "react"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { getRows, updateRow } from "@/lib/rest"
import { fetchAllFiles, deleteFile } from "@/lib/file-server"
import { useAuth } from "#contexts/AuthContext"
import { UploadDialog } from "#components/upload-dialog"
import {
  FileArchiveIcon, UsersIcon, UploadIcon, Trash2Icon, Loader2,
  FileIcon, FolderIcon, RefreshCwIcon, ShieldCheckIcon, UserPlusIcon,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

type FileEntry = {
  id?: string
  name: string
  type: "file" | "dir"
  path: string
  parent_path?: string | null
}

type UserProfile = {
  id: string
  email?: string
  role?: string
}

export default function Admin() {
  useEffect(() => { document.title = "Admin — Dataphyte Wiki" }, [])
  const { user } = useAuth()
  const navigate = useNavigate()
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [promoteEmail, setPromoteEmail] = useState("")
  const [promoteStatus, setPromoteStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [promoteMsg, setPromoteMsg] = useState("")
  const [usersList, setUsersList] = useState<UserProfile[]>([])

  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/", { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const rows = await fetchAllFiles()
        setFiles(rows as FileEntry[])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [refreshKey])

  useEffect(() => {
    async function loadUsers() {
      for (const table of ["user_profiles", "profiles", "users"]) {
        try {
          const rows = await getRows(table, { select: "id,email,role", limit: "100" })
          setUsersList(rows as UserProfile[])
          return
        } catch {
          // try next table
        }
      }
    }
    loadUsers()
  }, [])

  async function handleDelete(filePath: string) {
    if (!confirm(`Delete "${filePath}"? This cannot be undone.`)) return
    try {
      await deleteFile(filePath)
      setRefreshKey(k => k + 1)
    } catch (err) {
      alert("Failed to delete: " + (err instanceof Error ? err.message : "Unknown error"))
    }
  }

  async function handlePromote() {
    const email = promoteEmail.trim()
    if (!email) return
    setPromoteStatus("loading")
    setPromoteMsg("")

    try {
      for (const table of ["user_profiles", "profiles", "users"]) {
        const rows = await getRows(table, {
          email: `eq.${email}`,
          select: "id,email,role",
        })
        if (rows.length > 0) {
          await updateRow(table, rows[0].id, { role: "admin" })
          setPromoteMsg(`Promoted ${email} to admin via "${table}" table`)
          setPromoteStatus("done")
          setPromoteEmail("")
          return
        }
      }

      const userTable = ["user_profiles", "profiles", "users"]
      for (const table of userTable) {
        const test = await getRows(table, { select: "id", limit: "1" }).catch(() => null)
        if (test !== null) {
          const token = localStorage.getItem("access_token")
          const res = await fetch(
            `${import.meta.env.VITE_API_URL ?? ""}/rest/v1/${table}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                Prefer: "return=representation",
              },
              body: JSON.stringify({ email, role: "admin" }),
            }
          )
          if (res.ok) {
            setPromoteMsg(`Created admin profile for ${email}`)
            setPromoteStatus("done")
            setPromoteEmail("")
            return
          }
        }
      }

      setPromoteMsg("Could not find or create user profile. Backend may not have a user_profiles / profiles / users table.")
      setPromoteStatus("error")
    } catch (err) {
      setPromoteMsg(err instanceof Error ? err.message : "Failed to promote user")
      setPromoteStatus("error")
    }
  }

  const fileCount = files.filter(f => f.type === "file").length
  const dirCount = files.filter(f => f.type === "dir").length

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">
              Central file management — files uploaded here are visible to all users.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/admin/register")} className="shadow-sm">
              <UserPlusIcon className="size-4 mr-2" />
              Register User
            </Button>
            <Button variant="outline" onClick={() => setRefreshKey(k => k + 1)} className="shadow-sm">
              <RefreshCwIcon className="size-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowUpload(true)} className="shadow-sm">
              <UploadIcon className="size-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileArchiveIcon className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{fileCount}</p>
            <p className="text-sm text-muted-foreground">Total Files</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderIcon className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{dirCount}</p>
            <p className="text-sm text-muted-foreground">Directories</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UsersIcon className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{files.length}</p>
            <p className="text-sm text-muted-foreground">Total Entries</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">All Files & Directories</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-20 border rounded-xl bg-card">
            <FileArchiveIcon className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No files in the system yet</p>
            <Button onClick={() => setShowUpload(true)}>
              <UploadIcon className="size-4 mr-2" />
              Upload your first file
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Path</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {files.map((file) => (
                    <tr key={file.path} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        {file.type === "dir" ? (
                          <FolderIcon className="size-4 text-blue-500" />
                        ) : (
                          <FileIcon className="size-4 text-muted-foreground" />
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{file.name}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[200px]">{file.path}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(file.path)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">User Management</h2>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="font-medium mb-3">Promote user to admin</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              className="max-w-xs"
            />
            <Button
              onClick={handlePromote}
              disabled={!promoteEmail.trim() || promoteStatus === "loading"}
            >
              {promoteStatus === "loading" ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheckIcon className="size-4 mr-2" />
              )}
              Set Admin
            </Button>
          </div>
          {promoteMsg && (
            <p className={`mt-2 text-sm ${promoteStatus === "error" ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
              {promoteMsg}
            </p>
          )}

          {usersList.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Current Users</h4>
              <div className="text-sm space-y-1">
                {usersList.map((u) => (
                  <div key={u.id} className="flex items-center justify-between py-1">
                    <span>{u.email || u.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === "admin"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {u.role || "user"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {showUpload && (
        <UploadDialog onClose={() => { setShowUpload(false); setRefreshKey(k => k + 1) }} />
      )}
    </>
  )
}
