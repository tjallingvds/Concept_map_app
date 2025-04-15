import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { UploadIcon } from "lucide-react"

interface DropzoneProps extends React.ComponentProps<"div"> {
  onFileSelect?: (file: File) => void
  accept?: string
  maxSize?: number
  className?: string
  description?: string
}

export function Dropzone({
  onFileSelect,
  accept = ".json,.txt",
  maxSize = 5 * 1024 * 1024,
  className,
  description = "Select a concept map file to import",
  ...props
}: DropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".json") && 
        !file.name.toLowerCase().endsWith(".txt")) {
      setError("Please select a .json or .txt file")
      return false
    }

    if (maxSize && file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
      return false
    }

    setError(null)
    return true
  }

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (!file) return

      if (validateFile(file)) {
        onFileSelect?.(file)
      }
    },
    [maxSize, onFileSelect]
  )

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (validateFile(file)) {
      onFileSelect?.(file)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50",
        error && "border-destructive/50 hover:border-destructive",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <UploadIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
      <p className="mb-2 text-sm text-muted-foreground">{description}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleButtonClick}
        className="relative"
      >
        Choose File
      </Button>
      {error && (
        <p className="mt-2 text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}