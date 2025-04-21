import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { FileSystem, MapItem, FileSearchBar } from "../components/file-system"
import { Button } from "../components/ui/button"
import { Plus } from "lucide-react"
import { CreateMapDialog } from "../components/create-map-dialog"
import {useConceptMapsApi} from "../services/concept_map_api.ts";

export default function PublicMapsPage() {
  const navigate = useNavigate()
  const [publicMaps, setPublicMaps] = useState<MapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const { toggleFavorite } = useConceptMapsApi();

  // Fetch public maps on component mount
  useEffect(() => {
    const fetchPublicMaps = async () => {
      try {
        setLoading(true)
        
        // Use the real API to fetch public maps
        const maps = await conceptMapsApi.getPublicMaps()
        setPublicMaps(maps)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch public maps", err)
        setError("Failed to load public maps. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPublicMaps()
  }, [])
  
  const handleFavorite = async (id: number) => {
    try {
      const success = await toggleFavorite(id)
      if (success) {
        // Update the local state to reflect the change
        setPublicMaps(maps => maps.map(map => 
          map.id === id ? { ...map, isFavorite: !map.isFavorite } : map
        ))
      }
    } catch (err) {
      console.error("Failed to toggle favorite", err)
    }
  }
  
  const handleDownload = async (id: number) => {
    try {
      // Get the specific map that's being downloaded
      const map = publicMaps.find(m => m.id === id)
      if (map) {
        // In a real implementation, we would call an API endpoint 
        // to download or clone the public map to the user's account
        alert(`Download started for "${map.title}". This feature will be fully implemented soon!`)
      }
    } catch (err) {
      console.error("Failed to download map", err)
      alert("An error occurred during download. Please try again.")
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle map creation callback
  const handleMapCreated = (mapId: number) => {
    // Navigate to the map editor for the new map
    navigate(`/editor/${mapId}`)
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header with search bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white">
            <div className="flex items-center gap-3 flex-1">
              <SidebarTrigger />
              <span className="text-sm font-medium text-gray-700 min-w-24">Explore Public Maps</span>
              <FileSearchBar searchQuery={searchQuery} onSearch={handleSearch} />
            </div>
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
                items={publicMaps.filter(map => 
                  searchQuery ? 
                  map.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  map.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (map.author && map.author.toLowerCase().includes(searchQuery.toLowerCase()))
                  : true
                )}
                showAuthor={true}
                showActions={true}
                emptyMessage="No public maps found"
                onFavorite={handleFavorite}
                onDownload={handleDownload}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 