import * as React from 'react';
import { FileText, Globe, LayoutDashboard, Map, PlusCircle, BookOpen, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { NavProjects, type ProjectItem } from '../components/nav-projects';
import { NavUser } from '../components/nav-user';
import { SidebarOptInForm } from '../components/sidebar-opt-in-form';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,

} from "../components/ui/sidebar"
import { useAuth } from "../contexts/auth-context"
import { CreateMapDialog } from "../components/create-map-dialog"
import { Button } from "../components/ui/button"
import { Skeleton } from "../components/ui/skeleton"


// Define the type for concept maps from the backend
interface ConceptMapData {
  id: number;
  name: string;
  url: string;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const [recentMaps, setRecentMaps] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateMapDialog, setOpenCreateMapDialog] = useState(false);

  // Fetch recent maps from the backend
  useEffect(() => {
    const fetchRecentMaps = async () => {
      try {
        if (user) {
          // In a real app, this would be an API call to your backend
          // const response = await fetch(`/api/users/${user.id}/recent-maps`);
          // const data = await response.json();
          // Convert backend data to ProjectItem format
          // const mapItems: ProjectItem[] = data.maps.map((map: ConceptMapData) => ({
          //   name: map.name,
          //   url: map.url,
          //   icon: Map
          // }));
          // setRecentMaps(mapItems);

          // For now, set empty array to show "None yet" message
          setRecentMaps([]);
        }
      } catch (error) {
        console.error('Failed to fetch recent maps:', error);
        setRecentMaps([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentMaps();
  }, [user]);

  return (
    <Sidebar variant="inset" className="border-r border-border" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Map className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Concept Map</span>
                  <span className="truncate text-xs">Learning Tool</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Get started section with direct links */}
        <SidebarGroup>
          <SidebarGroupLabel>Get started</SidebarGroupLabel>
          <SidebarMenu>
            {/* Dashboard link */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* New concept map - Opens create map dialog */}
            <SidebarMenuItem>
              <CreateMapDialog
                trigger={
                  <SidebarMenuButton>
                    <PlusCircle />
                    <span>New concept map</span>
                  </SidebarMenuButton>
                }
                open={openCreateMapDialog}
                onOpenChange={setOpenCreateMapDialog}
              />
            </SidebarMenuItem>

            {/* Notes & Learn - Links to /notes page */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/notes">
                  <BookOpen />
                  <span>Notes & Learn</span>
                </Link>
              </SidebarMenuButton>
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

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/templates">
                  <Globe />
                  <span>Templates</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        
        {/* Recent work section with + button */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between pr-3">
            <SidebarGroupLabel>Your most recent work</SidebarGroupLabel>
            <CreateMapDialog 
              trigger={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span className="sr-only">New concept map</span>
                </Button>
              }
            />
          </div>
          <SidebarMenu>
            {loading ? (
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
            ) : recentMaps.length > 0 ? (
              recentMaps.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            ) : (
              <SidebarMenuItem>
                <SidebarMenuButton disabled className="opacity-70 cursor-default">
                  <Map className="text-muted-foreground opacity-70" />
                  <span className="text-muted-foreground">None yet</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter>
        {/* Premium upgrade component */}
        <div className="mb-4 px-3">
          <SidebarOptInForm freeMessage="Awww thanks but it is free for you!" />
        </div>

        {user && (
          <NavUser
            user={{
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              avatar: user.avatarUrl || '',
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
