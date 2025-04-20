import * as React from "react"
import { Tldraw, Editor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { Button } from "./ui/button"

interface TLDrawWhiteboardProps {
  onSave?: (content: any) => void
}

export function TLDrawWhiteboard({ onSave }: TLDrawWhiteboardProps) {
  const [editor, setEditor] = React.useState<Editor | null>(null)
  const saveRef = React.useRef<{ save: () => void }>({ save: () => {} })

  // Handle save
  const handleSaveWhiteboard = React.useCallback(() => {
    if (!editor) return
    
    // Get the current drawing as persisted JSON state
    const snapshot = editor.store.getSnapshot()
    
    if (onSave) {
      onSave(snapshot)
    }
  }, [editor, onSave])

  // Expose the save method to parent components
  React.useImperativeHandle(
    saveRef,
    () => ({
      save: handleSaveWhiteboard,
    }),
    [handleSaveWhiteboard]
  )

  return (
    <div className="tldraw-wrapper flex flex-col" style={{ height: '100%', width: '100%' }}>
      <div className="flex-grow">
        <Tldraw
          onMount={setEditor}
          autoFocus
        />
      </div>
      
      {onSave && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleSaveWhiteboard}>
            Save Drawing
          </Button>
        </div>
      )}
    </div>
  )
} 