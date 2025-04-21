import * as React from "react"
import { Tldraw, Editor, loadSnapshot } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { Button } from "./ui/button"

interface WhiteboardEditorProps {
  whiteboardContent: any
  onSave?: (content: any) => void
  readOnly?: boolean
}

export function WhiteboardEditor({ whiteboardContent, onSave, readOnly = false }: WhiteboardEditorProps) {
  const [editor, setEditor] = React.useState<Editor | null>(null)
  
  // Load whiteboard content when the editor is ready
  React.useEffect(() => {
    if (editor && whiteboardContent) {
      try {
        // Load the saved snapshot into the editor using the recommended method
        loadSnapshot(editor.store, whiteboardContent)
      } catch (error) {
        console.error("Error loading whiteboard content:", error)
      }
    }
  }, [editor, whiteboardContent])

  // Set editor to read-only mode if specified
  React.useEffect(() => {
    if (editor && readOnly) {
      editor.updateInstanceState({ isReadonly: true })
    }
  }, [editor, readOnly])

  // Handle save
  const handleSave = React.useCallback(() => {
    if (!editor) return
    
    // Get the current drawing as persisted JSON state
    const snapshot = editor.store.getSnapshot()
    
    if (onSave) {
      onSave(snapshot)
    }
  }, [editor, onSave])

  return (
    <div className="whiteboard-editor-container flex flex-col h-full">
      <div className="flex-grow" style={{ minHeight: "600px" }}>
        <Tldraw
          onMount={setEditor}
          autoFocus
        />
      </div>
      
      {!readOnly && onSave && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  )
} 