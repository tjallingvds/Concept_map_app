import * as React from "react"
import { cn } from "../lib/utils"
import { Dropzone } from "./ui/dropzone"

interface FileUploadProps extends React.ComponentProps<"div"> {
  onFileSelect?: (file: File) => void
  accept?: string
  maxSize?: number
  className?: string
  description?: string
}

export function FileUpload({
  onFileSelect,
  accept = ".json,.txt",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className,
  description = "Select a concept map file to import",
  ...props
}: FileUploadProps) {
  return (
    <Dropzone
      onFileSelect={onFileSelect}
      accept={accept}
      maxSize={maxSize}
      className={className}
      description={description}
      {...props}
    />
  )
}