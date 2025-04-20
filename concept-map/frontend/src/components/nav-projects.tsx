import {
  Map,
  Folder,
  MoreHorizontal,
  Share,
  Trash2,
  PlusCircle,
  type LucideIcon,
} from "lucide-react"
import { Skeleton } from "../components/ui/skeleton"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../components/ui/sidebar"
import { Button } from "../components/ui/button"

export interface ProjectItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

export function NavProjects({
  projects,
  title = "Projects",
  emptyMessage = "No projects found",
  isLoading = false,
  onAddClick,
}: {
  projects: ProjectItem[];
  title?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  onAddClick?: () => void;
}) {
  const { isMobile } = useSidebar()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between pr-3">
        <SidebarGroupLabel>{title}</SidebarGroupLabel>
        {onAddClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={onAddClick}
          >
            <PlusCircle className="h-4 w-4" />
            <span className="sr-only">Add new</span>
          </Button>
        )}
      </div>
      <SidebarMenu>
        {isLoading ? (
          <>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 py-2 px-3">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-32" />
              </div>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="flex items-center gap-3 py-2 px-3">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
            </SidebarMenuItem>
          </>
        ) : projects.length > 0 ? (
          projects.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <Folder className="text-muted-foreground" />
                    <span>View Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="text-muted-foreground" />
                    <span>Share Project</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton disabled className="opacity-70 cursor-default">
              <Map className="text-muted-foreground opacity-70" />
              <span className="text-muted-foreground">{emptyMessage}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
