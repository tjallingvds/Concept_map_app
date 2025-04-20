import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { FileSystem, MapItem, FileSearchBar } from "../components/file-system"
import { Button } from "../components/ui/button"
import { Plus, FileEdit } from "lucide-react"
import { toast } from "sonner"
import { notesApi, NoteItem } from "../services/api"
import { useAuth } from "../contexts/auth-context"

// Convert NoteItem to MapItem format for the FileSystem component
const convertNoteToMapItem = (note: NoteItem): MapItem => {
  return {
    id: note.id,
    title: note.title,
    description: note.description || "",
    createdAt: note.createdAt,
    lastEdited: note.lastEdited,
    nodes: 0, // Notes don't have nodes count
    author: "Me",
    isFavorite: note.isFavorite,
    isPublic: note.isPublic,
    shareId: note.shareId,
    shareUrl: note.shareUrl
  }
}

export default function NotesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notes, setNotes] = useState<MapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch notes on component mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true)
        
        // Fetch notes from the API
        const notesData = await notesApi.getNotes()
        
        // Convert to MapItem format for the FileSystem component
        const notesAsMapItems = notesData.map(convertNoteToMapItem)
        
        setNotes(notesAsMapItems)
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
      // Find the note to update
      const noteToUpdate = notes.find(note => note.id === id)
      if (!noteToUpdate) return
      
      // Call the API to update the note
      await notesApi.updateNote(id, {
        is_favorite: !noteToUpdate.isFavorite
      })
      
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
                  (note.description && note.description.toLowerCase().includes(searchQuery.toLowerCase()))
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