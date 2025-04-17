import { useState, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { FileSystem } from "../components/file-system"
import { Plus, FileText } from "lucide-react"
import { Button } from "../components/ui/button"
import { useAuth } from "../contexts/auth-context"
import conceptMapsApi from "../services/api"

// Define the Note type
interface Note {
  id: number
  title: string
  content: string
  createdAt: string
  lastEdited: string
  isFavorite: boolean
  isPublic: boolean
  tags?: string[]
}

// Mock data for stored notes
const mockStoredNotes: Note[] = [
  { 
    id: 1, 
    title: "Machine Learning Notes", 
    content: "Personal notes on neural networks and deep learning...", 
    createdAt: "2023-10-15", 
    lastEdited: "2023-10-26", 
    isFavorite: true,
    isPublic: false,
    tags: ["AI", "Deep Learning"]
  },
  { 
    id: 2, 
    title: "Project Documentation", 
    content: "Detailed documentation of the development process...", 
    createdAt: "2023-09-28", 
    lastEdited: "2023-10-22", 
    isFavorite: false,
    isPublic: false,
    tags: ["Development", "Documentation"]
  },
  { 
    id: 3, 
    title: "Research Findings", 
    content: "Key findings and insights from recent research...", 
    createdAt: "2023-10-05", 
    lastEdited: "2023-10-18", 
    isFavorite: false,
    isPublic: false,
    tags: ["Research", "Analysis"]
  }
]

export default function StoredNotesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>(mockStoredNotes)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate("/login")
    }
  }, [user, navigate])

  const handleSearch = (query: string) => {
    // Implement search functionality
    console.log("Searching for:", query)
  }

  const handleFavorite = async (id: number) => {
    // Implement favorite functionality
    console.log("Toggling favorite for note:", id)
  }

  const handleDelete = async (id: number) => {
    // Implement delete functionality
    console.log("Deleting note:", id)
  }

  const handleEdit = (id: number) => {
    // Navigate to edit page
    navigate(`/write-and-learn?noteId=${id}`)
  }

  const handleShare = async (id: number) => {
    // Implement share functionality
    console.log("Sharing note:", id)
  }

  const handleDownload = async (id: number) => {
    // Implement download functionality
    console.log("Downloading note:", id)
  }

  if (!user) {
    return null
  }

  // Convert notes to the format expected by FileSystem component
  const fileSystemItems = notes.map(note => ({
    id: note.id,
    title: note.title,
    description: note.content.substring(0, 100) + "...",
    createdAt: note.createdAt,
    lastEdited: note.lastEdited,
    nodes: 0, // Not applicable for notes
    isFavorite: note.isFavorite,
    isPublic: note.isPublic,
    tags: note.tags
  }))

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm font-medium">Stored Notes</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => navigate('/write-and-learn')}
            >
              <Plus className="h-4 w-4" />
              New Note
            </Button>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <FileSystem
              items={fileSystemItems}
              emptyMessage="No notes found"
              onSearch={handleSearch}
              onFavorite={handleFavorite}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onShare={handleShare}
              onDownload={handleDownload}
            />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 