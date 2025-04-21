import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { FileSystem, MapItem, FileSearchBar } from "../components/file-system"
import { Plus } from "lucide-react"
import { Button } from "../components/ui/button"
import { useAuth } from "../contexts/auth-context"
import { CreateMapDialog } from "../components/create-map-dialog"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "../components/ui/dropdown-menu"import { useConceptMapsApi } from "../services/api"; // ✅ NEW
import { toast } from 'sonner';
import { MapItemActions } from '../components/map-item-actions';


// Mock data for personal concept maps
const mockPersonalMaps: MapItem[] = [
  { 
    id: 1, 
    title: "Study Notes: Machine Learning", 
    description: "My personal notes on deep learning concepts", 
    createdAt: "2023-10-15", 
    lastEdited: "2023-10-26", 
    nodes: 24, 
    isFavorite: true,
    isPublic: false
  },
  { 
    id: 2, 
    title: "Project Planning", 
    description: "Task breakdown for the new app development", 
    createdAt: "2023-09-28", 
    lastEdited: "2023-10-22", 
    nodes: 18, 
    isFavorite: false,
    isPublic: false
  },
  { 
    id: 3, 
    title: "Research Ideas", 
    description: "Brainstorming for next semester's research project", 
    createdAt: "2023-10-05", 
    lastEdited: "2023-10-18", 
    nodes: 12, 
    isFavorite: false,
    isPublic: false
  },
  { 
    id: 4, 
    title: "Book Analysis: Design Patterns", 
    description: "Notes and connections from the GoF book", 
    createdAt: "2023-09-10", 
    lastEdited: "2023-10-01", 
    nodes: 32,
    isFavorite: true,
    isPublic: true
  },
  { 
    id: 5, 
    title: "Personal Goals 2024", 
    description: "My goals for next year and how they connect", 
    createdAt: "2023-10-20", 
    lastEdited: "2023-10-25", 
    nodes: 15,
    isFavorite: false,
    isPublic: false
  }
]

export default function MyMapsPage() {
  const { user } = useAuth()
  const { getMyMaps, toggleFavorite, shareMap, deleteMap, getMap } = useConceptMapsApi();

  const navigate = useNavigate()
  const [myMaps, setMyMaps] = useState<MapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortMode, setSortMode] = useState<"az" | "za">("az") 

  // Fetch user's maps on component mount
  useEffect(() => {
    const fetchMaps = async () => {
      try {
        setLoading(true)
        const maps = await getMyMaps()
        setMyMaps(maps)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch maps", err)
        setError("Failed to load your maps. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchMaps()
  }, [])

  const handleMapCreated = (mapId: number) => {
    navigate(`/editor/${mapId}`)
  }
  
  const handleFavorite = async (id: number) => {
    try {
      const success = await toggleFavorite(id)
      if (success) {
        setMyMaps(maps => maps.map(map => 
          map.id === id ? { ...map, isFavorite: !map.isFavorite } : map
        ))
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err)
    }
  }
  
  const handleEdit = useCallback((id: number) => {
    const map = myMaps.find(m => m.id === id);
    if (map && map.format === 'handdrawn') {
      navigate(`/whiteboard-editor/${id}`);
    } else {
      navigate(`/editor/${id}`);
    }
  }, [myMaps, navigate]);
  
  const handleShare = async (id: number) => {
    try {
      const { shareUrl, shareId } = await shareMap(id);
      setMyMaps(prevMaps => prevMaps.map(map => {
        if (map.id === id) {
          return {
            ...map,
            isPublic: true,
            shareId: shareId,
            shareUrl: shareUrl
          };
        }
        return map;
      }));
      alert(`Map shared successfully! Share URL: ${shareUrl}`);
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert("Link copied to clipboard"))
        .catch(err => console.error("Could not copy link:", err));
    } catch (err) {
      console.error("Failed to share map", err);
      alert("Failed to share map. Please try again.");
    }
  }
  
  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this map? This action cannot be undone.")) {
      try {
        const success = await deleteMap(id)
        if (success) {
          setMyMaps(maps => maps.filter(map => map.id !== id))
        } else {
          alert("Failed to delete the map. Please try again.")
        }
      } catch (err) {
        console.error("Failed to delete map", err)
        alert("An error occurred while trying to delete the map.")
      }
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleDownload = async (id: number) => {
    try {
      const map = await getMap(id);
      if (!map) throw new Error("Could not retrieve map data");

      if (map.svgContent) {
        const blob = new Blob([map.svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${map.title}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert("Map downloaded successfully");
      } else {
        alert("This map doesn't have SVG content available for download");
      }
    } catch (err) {
      console.error("Failed to download map", err);
      alert(`An error occurred during download: ${err instanceof Error ? err.message : 'Please try again'}`); 
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header with search bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger />
              <span className="text-sm font-medium text-gray-700 min-w-24">My Maps</span>
              <FileSearchBar searchQuery={searchQuery} onSearch={handleSearch} />
            </div>


            {/* ✅ NEW Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="ml-2">Sort</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortMode("az")}>
                  A–Z (Title)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortMode("za")}>
                  Z-A(Title)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CreateMapDialog 
              trigger={
                <Button size="sm" className="gap-1 ml-3">
                  <Plus className="h-4 w-4" />
                  <span>New Map</span>
                </Button>
              }
              onMapCreated={handleMapCreated}
            />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-destructive p-4">
                <p>{error}</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            ) : (
              <FileSystem
                items={
                  [...myMaps]
                    .filter(map => 
                      searchQuery 
                        ? map.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          map.description.toLowerCase().includes(searchQuery.toLowerCase()) 
                        : true
                    )
                    .sort((a, b) => {
                      if (sortMode === "az") {
                        return a.title.localeCompare(b.title)
                      } else if (sortMode === "za") {
                        return b.title.localeCompare(a.title)
                      } else {
                        return 0 // default sort (no sorting applied)
                      }
                    })
                }

                showAuthor={false}
                showActions={true}
                emptyMessage="You haven't created any maps yet"
                onFavorite={handleFavorite}
                onEdit={handleEdit}
                onShare={handleShare}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}