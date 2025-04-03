import { type LucideIcon, PlusCircle, FileText, Globe } from "lucide-react"
import { Link } from "react-router-dom"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CreateMapDialog } from "@/components/create-map-dialog"

export function GetStartedMenu() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Get started</SidebarGroupLabel>
      <SidebarMenu>
        {/* New concept map - Opens create map dialog */}
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
        
        {/* My concept maps - Links to /maps page */}
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <Link to="/maps">
              <FileText />
              <span>My concept maps</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        {/* Public concept maps - Links to /library page */}
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
  )
} 