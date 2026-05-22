import { useState, useEffect } from "react"
import type React from "react"
import { NavMain } from "#components/nav-main"
import { NavUser } from "#components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "#components/ui/sidebar"
import { BookOpenIcon, SearchIcon, FileArchive, DatabaseSearch, CalendarDaysIcon } from "lucide-react"
import { getAllPages } from "@/lib/wiki"

const staticNav: {
  title: string
  url: string
  icon: React.ReactNode
  isActive?: boolean
  items?: { title: string; url: string }[]
}[] = [
  { title: "Dashboard", url: "/", icon: <DatabaseSearch />, isActive: true },
  {
    title: "Files",
    url: "/files",
    icon: <FileArchive />,

  },
  { title: "Search", url: "/search", icon: <SearchIcon /> },
  { title: "Calendar", url: "/calendar", icon: <CalendarDaysIcon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [navItems, setNavItems] = useState(staticNav)

  useEffect(() => {
    getAllPages().then((pages) => {
      setNavItems([
        staticNav[0],
        {
          title: "Knowledge Base",
          url: "/knowledge-base",
          icon: <BookOpenIcon />,
          items: pages.map((p) => ({ title: p.title, url: `/knowledge-base/${p.slug}` })),
        },
        ...staticNav.slice(1),
      ])
    })
  }, [])

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <DatabaseSearch className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Dataphyte <b>WIKI</b></span>
                  <span className="truncate text-xs">AI Knowledge Base</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
