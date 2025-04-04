import * as React from "react"
import { Button } from "./ui/button"
import { FileUpload } from "./file-upload"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"

interface ImportMapDialogProps {
  trigger: React.ReactNode
  onMapImported?: (file: File) => void
}

export function ImportMapDialog({ trigger, onMapImported }: ImportMapDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleFileSelect = (selectedFile: File) => {
    setError(null)
    setFile(selectedFile)
  }

  const handleImport = () => {
    if (!file) {
      setError("Please select a file to import")
      return
    }

    // Call the onMapImported callback with the selected file
    onMapImported?.(file)
    setOpen(false)
    setFile(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Concept Map</DialogTitle>
          <DialogDescription>
            Select a concept map file to import. Supported formats: .json, .txt
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <FileUpload
            accept=".json,.txt"
            maxSize={5 * 1024 * 1024} // 5MB
            onFileSelect={handleFileSelect}
            className="w-full"
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {file && (
            <p className="text-sm text-muted-foreground">
              Selected file: {file.name}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport}>
            Import Map
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}