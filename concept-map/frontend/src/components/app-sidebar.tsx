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
} from '../components/ui/sidebar';
import { useAuth } from '../contexts/auth-context';
import { CreateMapDialog } from '../components/create-map-dialog';

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

        {/* Recent work section */}
        <NavProjects projects={recentMaps} title="Your most recent work" emptyMessage="None yet" isLoading={loading} />
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
