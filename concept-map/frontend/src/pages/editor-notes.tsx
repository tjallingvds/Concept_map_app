import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { Button } from "../components/ui/button"
import { ArrowLeft, Save } from "lucide-react"

// Import BlockNote components
import "@blocknote/core/fonts/inter.css"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { useCreateBlockNote } from "@blocknote/react"
import { toast } from "sonner"

export default function EditorNotesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [noteName, setNoteName] = useState(`Note ${id || ""}`)
  const [isSaving, setIsSaving] = useState(false)
  
  // Create a BlockNote editor instance
  const editor = useCreateBlockNote()
  
  // Handle saving notes
  const handleSaveNotes = async () => {
    try {
      setIsSaving(true)
      // In a real app, you would save to backend here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      toast.success("Note saved successfully!")
    } catch (error) {
      console.error("Error saving note:", error)
      toast.error("Failed to save note")
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full overflow-hidden bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <Button variant="outline" size="icon" className="mr-2" onClick={() => navigate("/notes")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <input
                type="text"
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
                className="text-sm font-medium bg-transparent border-none outline-none focus:ring-0"
                placeholder="Untitled Note"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSaveNotes} 
              disabled={isSaving}
              className="flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
          
          {/* Editor - Full Page */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full">
              <BlockNoteView 
                editor={editor}
                theme="light"
                className="h-full"
              />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 