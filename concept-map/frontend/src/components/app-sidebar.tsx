import { PlusIcon, BookOpenIcon, FileIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "./ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar className="border-r w-64 max-w-64 flex-shrink-0 overflow-x-hidden">
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black flex-shrink-0">
            <FileIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold truncate">Concept Map</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-2 overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#" className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted truncate w-full overflow-hidden">
                    <PlusIcon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">New Concept Map</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="#" className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted truncate w-full overflow-hidden">
                    <BookOpenIcon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">Public Library</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="my-3 mx-1 bg-border" />
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 mb-2 text-sm font-medium text-muted-foreground truncate">
            Your Maps
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="p-3 text-sm text-muted-foreground overflow-hidden">
              Your saved concept maps will appear here
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto border-t">
        <div className="p-3 text-xs text-muted-foreground truncate">
          Concept Map App © {new Date().getFullYear()}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
} 