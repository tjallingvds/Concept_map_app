import * as React from "react"
import { Tldraw, Editor, loadSnapshot, getSnapshot } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { Button } from "./ui/button"

interface WhiteboardEditorProps {
  whiteboardContent: any
  onSave?: (content: any) => void
  readOnly?: boolean
  hideSaveButton?: boolean
}

// Create a type for the ref
export interface WhiteboardEditorRef {
  getCurrentContent: () => any
}

// Use forwardRef to properly handle refs
export const WhiteboardEditor = React.forwardRef<WhiteboardEditorRef, WhiteboardEditorProps>(
  function WhiteboardEditor(
    { whiteboardContent, onSave, readOnly = false, hideSaveButton = false },
    ref
  ) {
    const [editor, setEditor] = React.useState<Editor | null>(null)
    const hasInitialized = React.useRef<boolean>(false)
    
    // Load whiteboard content when the editor is ready
    React.useEffect(() => {
      if (!editor) return

      try {
        // Prevent multiple initializations
        if (hasInitialized.current) return;
        hasInitialized.current = true;
        
        // Create default empty document structure if none exists
        if (!whiteboardContent || Object.keys(whiteboardContent).length === 0) {
          console.log("Creating new empty whiteboard content");
          // Don't automatically save during initialization - this was causing infinite loops
          return;
        }
        
        // Load the saved snapshot into the editor
        console.log("Loading existing whiteboard content, size:", JSON.stringify(whiteboardContent).length);
        loadSnapshot(editor.store, whiteboardContent);
      } catch (error) {
        console.error("Error loading whiteboard content:", error);
      }
    }, [editor, whiteboardContent]);

    // Set editor to read-only mode if specified
    React.useEffect(() => {
      if (editor && readOnly) {
        editor.updateInstanceState({ isReadonly: true })
      }
    }, [editor, readOnly])

    // Handle save
    const handleSave = React.useCallback(() => {
      if (!editor) return
      
      // Get the current drawing as persisted JSON state using the recommended non-deprecated method
      const snapshot = getSnapshot(editor.store)
      
      if (onSave) {
        console.log("Saving whiteboard content manually, size:", JSON.stringify(snapshot).length);
        onSave(snapshot)
      }
    }, [editor, onSave])

    // Method to get current content (for external access)
    const getCurrentContent = React.useCallback(() => {
      if (!editor) return null;
      const snapshot = getSnapshot(editor.store);
      return snapshot;
    }, [editor]);

    // Expose the getCurrentContent method to parent components via ref
    React.useImperativeHandle(ref, () => ({
      getCurrentContent,
    }), [getCurrentContent]);

    return (
      <div className="whiteboard-editor-container flex flex-col h-full">
        <div className="flex-grow relative" style={{ minHeight: "100%" }}>
          <Tldraw
            onMount={setEditor}
            autoFocus
          />
        </div>
        
        {!readOnly && onSave && !hideSaveButton && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        )}
      </div>
    )
  }
) 