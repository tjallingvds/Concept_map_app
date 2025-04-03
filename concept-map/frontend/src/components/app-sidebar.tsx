import * as React from "react"
import { Link } from "react-router-dom"
import {
  BookOpen,
  Home,
  Plus,
  Map,
  Library,
  Settings2,
  History,
  PieChart,
  GalleryVerticalEnd,
  AudioWaveform,
  Command,
  Globe,
} from "lucide-react"

import { NavProjects } from "../components/nav-projects"
import { NavUser } from "../components/nav-user"
import { TeamSwitcher } from "../components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "../components/ui/sidebar"
import { useAuth } from "../contexts/auth-context"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  
  // This is sample data for teams and projects
  const data = {
    teams: [
      {
        name: "Personal",
        logo: GalleryVerticalEnd,
        plan: "Free",
      },
      {
        name: "My Team",
        logo: AudioWaveform,
        plan: "Pro",
      },
      {
        name: "School",
        logo: Command,
        plan: "Education",
      },
    ],
    navItems: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
      {
        title: "Create New",
        url: "/create",
        icon: Plus,
      },
      {
        title: "My Maps",
        url: "/maps",
        icon: Map,
      },
      {
        title: "Explore Public Maps",
        url: "/library",
        icon: Globe,
      },
    ],
    projects: [
      {
        name: "Recent Maps",
        url: "/maps/recent",
        icon: History,
      },
      {
        name: "Educational Maps",
        url: "/maps/category/education",
        icon: BookOpen,
      },
      {
        name: "Work Projects",
        url: "/maps/category/work",
        icon: PieChart,
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {data.navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{
          name: user?.email?.split('@')[0] || "User",
          email: user?.email || "user@example.com",
          avatar: "/avatars/default.jpg",
        }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

