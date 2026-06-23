import { useState, useEffect, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from "#components/ui/field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  UserPlusIcon,
  Loader2,
  ArrowLeftIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"
import { getAccessToken } from "#lib/auth"

export default function AdminRegister() {
  useEffect(() => { document.title = "Register User — Dataphyte Wiki" }, [])
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<"user" | "admin">("user")

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string
    const confirm = form.get("confirm-password") as string
    const name = form.get("name") as string

    if (password !== confirm) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const token = getAccessToken()
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? ""}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ email, password, name }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Registration failed" }))
        throw new Error(err.error)
      }

      const data = await res.json()
      const newUserId = data.user?.id

      if (newUserId && role === "admin") {
        for (const table of ["user_profiles", "profiles", "users"]) {
          try {
            const check = await fetch(
              `${import.meta.env.VITE_API_URL ?? ""}/rest/v1/${table}?id=eq.${newUserId}&select=id`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            )
            if (check.ok) {
              const rows = await check.json()
              if (rows.length > 0) {
                await fetch(
                  `${import.meta.env.VITE_API_URL ?? ""}/rest/v1/${table}/${rows[0].id}`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ role: "admin" }),
                  }
                )
              }
              break
            }
          } catch {
            continue
          }
        }
      }

      setSuccess(`User "${name || email}" registered successfully${role === "admin" ? " as admin" : ""}`)
      ;(e.target as HTMLFormElement).reset()
      setRole("user")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => navigate("/admin")}
        className="mb-6"
      >
        <ArrowLeftIcon className="size-4 mr-2" />
        Back to Admin Panel
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlusIcon className="size-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Register New User</CardTitle>
              <CardDescription>
                Create a new user account. The user will receive a standard account
                that can be promoted to admin after registration.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="user@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      required
                    />
                  </Field>
                </div>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Role</FieldLabel>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={role === "user" ? "default" : "outline"}
                    onClick={() => setRole("user")}
                    className="flex-1"
                  >
                    <UserIcon className="size-4 mr-2" />
                    User
                  </Button>
                  <Button
                    type="button"
                    variant={role === "admin" ? "default" : "outline"}
                    onClick={() => setRole("admin")}
                    className="flex-1"
                  >
                    <ShieldCheckIcon className="size-4 mr-2" />
                    Admin
                  </Button>
                </div>
                <FieldDescription>
                  {role === "admin"
                    ? "Admin role grants full access to all features and settings."
                    : "Standard user with access to wiki and files."}
                </FieldDescription>
              </Field>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              )}
              <Field>
                <Button type="submit" disabled={loading} className="w-full shadow-sm">
                  {loading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="size-4 mr-2" />
                      Register User
                    </>
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
