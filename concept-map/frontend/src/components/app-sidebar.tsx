// src/components/app-sidebar.tsx
import * as React from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  FileText,
  Globe,
  LayoutDashboard,
  Map as MapIcon,
  PlusCircle,
  type LucideIcon,
} from "lucide-react"

import LogoImg from "../assets/logo.png"                  // ← your logo here
import { NavProjects, type ProjectItem } from "./nav-projects"
import { CreateMapDialog } from "./create-map-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const [recentMaps, setRecentMaps] = useState<ProjectItem[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    // Replace with real fetch if you have one
    setRecentMaps([])
    setLoading(false)
  }, [])

  return (
    <Sidebar variant="inset" className="border-r border-border" {...props}>
      {/* — Logo + Title */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard" className="flex items-center gap-3">
                <img
                  src={LogoImg}
                  alt="Maplet logo"
                  className="h-8 w-8 rounded"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">MAPLET</span>
                  <span className="truncate text-xs">Learning Tool</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* — Navigation Links */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Get started</SidebarGroupLabel>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <CreateMapDialog
                trigger={
                  <SidebarMenuButton>
                    <PlusCircle />
                    <span>New concept map</span>
                  </SidebarMenuButton>
                }
              />
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/maps">
                  <FileText />
                  <span>My concept maps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/library">
                  <Globe />
                  <span>Public concept maps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* — Recent work */}
        <NavProjects
          projects={recentMaps}
          title="Your most recent work"
          emptyMessage="None yet"
          isLoading={loading}
        />
      </SidebarContent>
    </Sidebar>
  )
}
