import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { FileSystem, MapItem, FileSearchBar } from "../components/file-system"
import { Button } from "../components/ui/button"
import conceptMapsApi from "../services/api"

// Mock data for public concept maps
const mockPublicMaps: MapItem[] = [
  { 
    id: 1, 
    title: "Web Development Fundamentals", 
    description: "HTML, CSS, JavaScript basics and their relationships", 
    createdAt: "2023-09-15", 
    lastEdited: "2023-10-20", 
    nodes: 32, 
    author: "TechExpert",
    isFavorite: false,
    isPublic: true
  },
  { 
    id: 2, 
    title: "Machine Learning Pipeline", 
    description: "Data preparation, model training, and evaluation flow", 
    createdAt: "2023-10-01", 
    lastEdited: "2023-10-18", 
    nodes: 24, 
    author: "AIResearcher",
    isFavorite: true,
    isPublic: true
  },
  { 
    id: 3, 
    title: "Biology Cell Structure", 
    description: "Organelles and their functions in eukaryotic cells", 
    createdAt: "2023-08-22", 
    lastEdited: "2023-09-30", 
    nodes: 18, 
    author: "BioTeacher",
    isFavorite: false,
    isPublic: true
  },
  { 
    id: 4, 
    title: "Project Management", 
    description: "Agile vs Waterfall methodologies comparison", 
    createdAt: "2023-07-10", 
    lastEdited: "2023-10-05", 
    nodes: 15,
    author: "PMProfessional",
    isFavorite: false,
    isPublic: true
  },
  { 
    id: 5, 
    title: "Physics Mechanics", 
    description: "Newton's laws and their applications", 
    createdAt: "2023-09-05", 
    lastEdited: "2023-10-10", 
    nodes: 22,
    author: "PhysicsTeacher",
    isFavorite: false,
    isPublic: true
  },
  {
    id: 6,
    title: "Data Structures and Algorithms",
    description: "Common data structures and algorithms with examples",
    createdAt: "2023-08-15",
    lastEdited: "2023-10-15",
    nodes: 45,
    author: "CodingInstructor",
    isFavorite: false,
    isPublic: true
  },
  {
    id: 7,
    title: "Human Anatomy",
    description: "Comprehensive map of human body systems",
    createdAt: "2023-07-22",
    lastEdited: "2023-09-18",
    nodes: 64,
    author: "MedStudent",
    isFavorite: true,
    isPublic: true
  },
  {
    id: 8,
    title: "World History Timeline",
    description: "Major historical events from ancient to modern times",
    createdAt: "2023-06-10",
    lastEdited: "2023-10-01",
    nodes: 78,
    author: "HistoryBuff",
    isFavorite: false,
    isPublic: true
  }
]

export default function PublicMapsPage() {
  const navigate = useNavigate()
  const [publicMaps, setPublicMaps] = useState<MapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch public maps on component mount
  useEffect(() => {
    const fetchPublicMaps = async () => {
      try {
        setLoading(true)
        
        // For now, we'll use mock data until backend implementation is ready
        // In a production environment, we would call:
        // const maps = await conceptMapsApi.getPublicMaps()
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Use mock data for now
        setPublicMaps(mockPublicMaps)
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
      const success = await conceptMapsApi.toggleFavorite(id)
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