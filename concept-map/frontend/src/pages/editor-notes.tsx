import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger } from "../components/ui/sidebar"
import { AppSidebar } from "../components/app-sidebar"
import { Button } from "../components/ui/button"
import { ArrowLeft, Save, GitMerge } from "lucide-react"

// Import BlockNote components
import { BlockNoteView } from "@blocknote/mantine"
import "@blocknote/mantine/style.css"
import { filterSuggestionItems } from "@blocknote/core"
import { 
  useCreateBlockNote, 
  getDefaultReactSlashMenuItems, 
  SuggestionMenuController
} from "@blocknote/react"
import { toast } from "sonner"
import { notesApi, NoteItem, conceptMapsApi } from "../services/api"
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

  // Extract plain text content from BlockNote editor
  const extractPlainText = (blocks: any[]): string => {
    let text = "";
    
    // Recursively process blocks and their content
    const processContent = (content: any[]): string => {
      if (!content || !Array.isArray(content)) return "";
      
      return content.map(item => {
        if (item.type === "text") {
          return item.text || "";
        } else if (item.content) {
          return processContent(item.content);
        }
        return "";
      }).join(" ");
    };
    
    // Process each top-level block
    blocks.forEach(block => {
      // Add block text
      if (block.content) {
        text += processContent(block.content) + "\n\n";
      }
      
      // Process children blocks if any
      if (block.children && Array.isArray(block.children)) {
        block.children.forEach((childBlock: any) => {
          if (childBlock.content) {
            text += processContent(childBlock.content) + "\n";
          }
        });
      }
    });
    
    return text.trim();
  };

  // Handle converting to concept map
  const handleConvertToConceptMap = async () => {
    try {
      setIsConverting(true);
      
      // Save the note first if needed
      let noteId = id ? parseInt(id) : null;
      const editorContent = editor.topLevelBlocks;
      
      if (!noteId) {
        // Create the note first
        const newNote = await notesApi.createNote({
          title: noteName,
          content: editorContent
        });
        noteId = newNote.id;
        setNote(newNote);
        // Update URL to include the new note ID
        navigate(`/notes/edit/${newNote.id}`, { replace: true });
      } else {
        // Make sure the note is saved with latest content
        await notesApi.updateNote(noteId, {
          title: noteName,
          content: editorContent
        });
      }
      
      // Extract text content from the note for the concept map
      const noteText = extractPlainText(editorContent);
      
      // Create concept map directly without showing popup
      const conceptMap = await conceptMapsApi.createMap({
        title: noteName,
        description: "", 
        mapType: "mindmap",
        isPublic: false,
        text: noteText,
      });
      
      if (!conceptMap) {
        throw new Error("Failed to create concept map");
      }
      
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
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col w-full bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 z-10 bg-background">
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
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Loading note...</p>
              </div>
            ) : (
              <div className="h-full">
                <BlockNoteView 
                  editor={editor}
                  theme="light"
                  className="h-full overflow-visible"
                  slashMenu={false}
                >
                  <SuggestionMenuController
                    triggerCharacter="/"
                    getItems={async (query) => {
                      // Get default items but filter out audio, video, and file
                      const defaultItems = getDefaultReactSlashMenuItems(editor);
                      const filteredItems = defaultItems.filter(
                        (item) => !["Audio", "Video", "File"].includes(item.title)
                      );
                      return filterSuggestionItems(filteredItems, query);
                    }}
                  />
                </BlockNoteView>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
} 