import { SearchForm } from "#components/search-form"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "#components/ui/breadcrumb"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { useSidebar } from "#components/ui/sidebar"
import { useRightSidebar } from "#components/right-sidebar"
import { useTheme } from "#contexts/ThemeContext"
import { PanelLeftIcon, PanelRightOpen, Moon, Sun } from "lucide-react"
import { useLocation, Link } from "react-router-dom"

function useBreadcrumbs() {
  const location = useLocation()
  const parts = location.pathname.split("/").filter(Boolean)
  if (parts.length === 0) return [{ label: "Dashboard", href: "/" }]

  const crumbs: { label: string; href: string }[] = []
  let accum = ""
  for (const part of parts) {
    accum += `/${part}`
    const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ")
    crumbs.push({ label, href: accum })
  }
  return crumbs
}

export function SiteHeader() {
  const { toggleSidebar } = useSidebar()
  const { toggle: toggleRightSidebar, open: rightOpen } = useRightSidebar()
  const { theme, toggleTheme } = useTheme()
  const breadcrumbs = useBreadcrumbs()

  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background/70 backdrop-blur-xl supports-backdrop-blur:bg-background/60">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          title="Toggle sidebar (Ctrl+B)"
        >
          <PanelLeftIcon className="size-4" />
        </Button>

        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />

        <Breadcrumb className="hidden sm:block">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="contents">
                <BreadcrumbItem>
                  {i < breadcrumbs.length - 1 ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </BreadcrumbItem>
                {i < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="ml-auto flex items-center gap-1">
          <SearchForm className="hidden sm:block" />

          <Button
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          <Button
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            variant="ghost"
            size="icon"
            onClick={toggleRightSidebar}
            title="Toggle AI Sidebar"
            data-active={rightOpen}
          >
            <PanelRightOpen className={rightOpen ? "text-primary" : ""} />
          </Button>
        </div>
      </div>
    </header>
  )
}
