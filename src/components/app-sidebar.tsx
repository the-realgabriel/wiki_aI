import * as React from "react"
import { NavMain } from "#components/nav-main"
import { NavUser } from "#components/nav-user"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "#components/ui/sidebar"
import { TerminalSquareIcon, BookOpenIcon, TerminalIcon, SearchIcon, FileArchive } from "lucide-react"
import { getAllPages } from "@/lib/wiki"

const pages = getAllPages()

const data = {
  user: { name: "shadcn", email: "m@example.com", avatar: "/avatars/shadcn.jpg" },
  navMain: [
    { title: "Dashboard", url: "/", icon: <TerminalSquareIcon />, isActive: true },
    {
      title: "Knowledge Base",
      url: "/knowledge-base",
      icon: <BookOpenIcon />,
      items: pages.map((p) => ({ title: p.title, url: `/knowledge-base/${p.slug}` })),
    },
    {
      title: "Files",
      url: "/files",
      icon: <FileArchive />,
      items: [
        { title: "docs", url: "/files/docs" },
        { title: "guides", url: "/files/guides" },
        { title: "api", url: "/files/api" },
      ],
    },
    { title: "Search", url: "/search", icon: <SearchIcon /> },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
                  <TerminalIcon className="size-4" />
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
        <NavMain items={data.navMain} />
       
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
