import { useState, useEffect } from "react"
import { NavMain } from "#components/nav-main"
import { NavUser } from "#components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarRail, SidebarSeparator,
} from "#components/ui/sidebar"
import { BookOpenIcon, SearchIcon, FileArchive, DatabaseSearch, SettingsIcon, CalendarIcon } from "lucide-react"
import { getAllPages } from "@/lib/wiki"
import type { WikiPage } from "@/lib/wiki"
import { useAuth } from "#contexts/AuthContext"

type NavItem = {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  items?: { title: string; url: string }[]
}

function buildBaseNav(isAdmin: boolean): NavItem[] {
  return [
    {
      title: "Dashboard",
      url: "/",
      icon: <DatabaseSearch />,
    },
    {
      title: "Files",
      url: "/files",
      icon: <FileArchive />,
    },
    { title: "Search", url: "/search", icon: <SearchIcon /> },
    { title: "Calendar", url: "/calendar", icon: <CalendarIcon /> },
    ...(isAdmin
      ? [{
          title: "Admin",
          url: "/admin",
          icon: <SettingsIcon />,
          items: [
            { title: "Dashboard", url: "/admin" },
            { title: "Register", url: "/admin/register" },
          ],
        }]
      : []),
  ]
}

function buildNavWithPages(isAdmin: boolean, pages: WikiPage[]): NavItem[] {
  return [
    buildBaseNav(isAdmin)[0],
    {
      title: "Knowledge Base",
      url: "/knowledge-base",
      icon: <BookOpenIcon />,
      items: pages.map((p) => ({ title: p.title, url: `/knowledge-base/${p.slug}` })),
    },
    ...buildBaseNav(isAdmin).slice(1),
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const [navItems, setNavItems] = useState<NavItem[]>(() => buildBaseNav(isAdmin))

  useEffect(() => {
    getAllPages().then((pages) => {
      setNavItems(buildNavWithPages(isAdmin, pages))
    })
  }, [isAdmin])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <DatabaseSearch className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Dataphyte <span className="font-bold">WIKI</span></span>
                  <span className="truncate text-xs text-muted-foreground">AI Knowledge Base</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarSeparator className="mx-3" />
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
