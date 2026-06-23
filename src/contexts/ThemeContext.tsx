import { createContext, useContext, useEffect, useState, useCallback } from "react"

type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
  isTransitioning: boolean
}

const ThemeCtx = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem("theme")
  if (stored === "dark" || stored === "light") return stored
  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() ?? getSystemTheme()
  })
  const [isTransitioning, setIsTransitioning] = useState(false)

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem("theme", t)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsTransitioning(true)
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem("theme", next)
      return next
    })
    setTimeout(() => setIsTransitioning(false), 400)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (!getStoredTheme()) {
        setThemeState(mql.matches ? "dark" : "light")
      }
    }
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (isTransitioning) {
      document.documentElement.classList.add("theme-transition")
      const timer = setTimeout(() => {
        document.documentElement.classList.remove("theme-transition")
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isTransitioning])

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme, setTheme, isTransitioning }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
