import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { FileSystem, MapItem, FileSearchBar } from "../components/file-system"
import { Button } from "../components/ui/button"
import { Plus, FileEdit } from "lucide-react"
import { toast } from "sonner"

// Mock data for notes
const mockNotes: MapItem[] = [
  { 
    id: 1, 
    title: "History Class Notes", 
    description: "World War II lecture notes and key events", 
    createdAt: "2023-09-15", 
    lastEdited: "2023-10-20", 
    nodes: 32, 
    author: "Me",
    isFavorite: false,
    isPublic: false
  },
  { 
    id: 2, 
    title: "Biology Study Guide", 
    description: "Cell structure and DNA replication", 
    createdAt: "2023-10-01", 
    lastEdited: "2023-10-18", 
    nodes: 24, 
    author: "Me",
    isFavorite: true,
    isPublic: false
  },
  { 
    id: 3, 
    title: "Chemistry Formulas", 
    description: "Important equations and periodic table notes", 
    createdAt: "2023-08-22", 
    lastEdited: "2023-09-30", 
    nodes: 18, 
    author: "Me",
    isFavorite: false,
    isPublic: false
  },
  { 
    id: 4, 
    title: "Project Ideas", 
    description: "Brainstorming for semester project", 
    createdAt: "2023-07-10", 
    lastEdited: "2023-10-05", 
    nodes: 15,
    author: "Me",
    isFavorite: false,
    isPublic: false
  },
  { 
    id: 5, 
    title: "Mathematics Proofs", 
    description: "Calculus theorems and proofs", 
    createdAt: "2023-09-05", 
    lastEdited: "2023-10-10", 
    nodes: 22,
    author: "Me",
    isFavorite: false,
    isPublic: false
  }
]

export default function NotesPage() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState<MapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch notes on component mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true)
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Use mock data for now
        setNotes(mockNotes)
      } catch (err) {
        console.error("Failed to fetch notes", err)
        toast.error("Failed to load your notes. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchNotes()
  }, [])
  
  const handleFavorite = async (id: number) => {
    try {
      // In a real app, you would call an API here
      // const success = await notesApi.toggleFavorite(id)
      
      // Update the local state to reflect the change
      setNotes(notes => notes.map(note => 
        note.id === id ? { ...note, isFavorite: !note.isFavorite } : note
      ))
      
      toast.success("Note favorite status updated")
    } catch (err) {
      console.error("Failed to toggle favorite", err)
      toast.error("Failed to update favorite status")
    }
  }
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  // Handle opening a note for editing
  const handleEditNote = (id: number) => {
    navigate(`/editor-notes/${id}`)
  }

  // Handle creating a new note
  const handleCreateNewNote = () => {
    navigate('/editor-notes')
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
              <span className="text-sm font-medium text-gray-700 min-w-24">Notes & Learn</span>
              <FileSearchBar searchQuery={searchQuery} onSearch={handleSearch} />
            </div>
            <Button size="sm" className="gap-1 ml-3" onClick={handleCreateNewNote}>
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </Button>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <FileSystem
                items={notes.filter(note => 
                  searchQuery ? 
                  note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  note.description.toLowerCase().includes(searchQuery.toLowerCase())
                  : true
                )}
                showAuthor={false}
                showActions={true}
                emptyMessage="No notes found. Create your first note to get started."
                onFavorite={handleFavorite}
                onEdit={handleEditNote}
              />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 