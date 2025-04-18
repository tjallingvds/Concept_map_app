import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { Button } from "../components/ui/button"
import { ArrowLeft, Save, GitMerge } from "lucide-react"

// Import BlockNote components
import "@blocknote/core/fonts/inter.css"
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { useCreateBlockNote } from "@blocknote/react"
import { toast } from "sonner"
import { notesApi, NoteItem } from "../services/api"
import { useAuth } from "../contexts/auth-context"

export default function EditorNotesPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [noteName, setNoteName] = useState(`Note ${id || ""}`)
  const [isSaving, setIsSaving] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [isLoading, setIsLoading] = useState(id ? true : false)
  const [note, setNote] = useState<NoteItem | null>(null)
  
  // Create a BlockNote editor instance
  const editor = useCreateBlockNote()
  
  // Load note data if editing an existing note
  useEffect(() => {
    if (id) {
      loadNote(parseInt(id));
    }
  }, [id]);
  
  // Load note from the API
  const loadNote = async (noteId: number) => {
    try {
      setIsLoading(true);
      const noteData = await notesApi.getNote(noteId);
      setNote(noteData);
      setNoteName(noteData.title);
      
      // Load content into the editor
      if (noteData.content && editor) {
        try {
          // The replaceBlocks method requires two parameters:
          // 1. blocks to remove (we'll use all current blocks)
          // 2. blocks to insert (the content from the note)
          
          // Get all current blocks in the editor
          const currentBlocks = editor.document;
          
          // Determine the content to load
          let contentToLoad = [];
          if (Array.isArray(noteData.content)) {
            contentToLoad = noteData.content;
          } else if (noteData.content.content && Array.isArray(noteData.content.content)) {
            contentToLoad = noteData.content.content;
          }
          
          // Replace all blocks with the note content
          if (contentToLoad.length > 0) {
            editor.replaceBlocks(currentBlocks, contentToLoad);
          } else {
            console.warn("Note content is not in expected format");
          }
        } catch (error) {
          console.error("Failed to load note content into editor:", error);
          toast.error("Failed to load note content");
        }
      }
    } catch (error) {
      console.error("Error loading note:", error);
      toast.error("Failed to load note");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving notes
  const handleSaveNotes = async () => {
    try {
      setIsSaving(true);
      
      // Get the current editor content as JSON
      const editorContent = editor.topLevelBlocks;
      
      if (id) {
        // Update existing note
        const updatedNote = await notesApi.updateNote(parseInt(id), {
          title: noteName,
          content: editorContent
        });
        setNote(updatedNote);
        toast.success("Note updated successfully!");
      } else {
        // Create new note
        const newNote = await notesApi.createNote({
          title: noteName,
          content: editorContent
        });
        setNote(newNote);
        // Update URL to include the new note ID for subsequent saves
        navigate(`/notes/edit/${newNote.id}`, { replace: true });
        toast.success("Note created successfully!");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle converting to concept map
  const handleConvertToConceptMap = async () => {
    try {
      setIsConverting(true);
      
      // If the note hasn't been saved yet, save it first
      let noteId = id ? parseInt(id) : null;
      
      if (!noteId) {
        // Create the note first
        const editorContent = editor.topLevelBlocks;
        const newNote = await notesApi.createNote({
          title: noteName,
          content: editorContent
        });
        noteId = newNote.id;
        setNote(newNote);
        // Update URL to include the new note ID
        navigate(`/notes/edit/${newNote.id}`, { replace: true });
      }
      
      // Convert note to concept map
      const conceptMap = await notesApi.convertNoteToConceptMap(noteId);
      
      // Navigate to the concept map editor with the new map
      toast.success("Note converted to concept map!");
      navigate(`/editor/${conceptMap.id}`);
    } catch (error) {
      console.error("Error converting note:", error);
      toast.error("Failed to convert note to concept map");
    } finally {
      setIsConverting(false);
    }
  };
  
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleConvertToConceptMap} 
                disabled={isConverting || isLoading}
                className="flex items-center gap-1"
              >
                <GitMerge className="h-4 w-4" />
                {isConverting ? "Converting..." : "Convert to Concept Map"}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveNotes} 
                disabled={isSaving || isLoading}
                className="flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
          
          {/* Editor - Full Page */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading note...</p>
              </div>
            ) : (
              <div className="h-full">
                <BlockNoteView 
                  editor={editor}
                  theme="light"
                  className="h-full"
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 