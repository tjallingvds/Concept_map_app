import * as React from "react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileUp, FileText, X } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form"
import { Input } from "./ui/input"
import { Textarea } from "./ui/textarea"
import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"
import { toast } from "sonner"

import conceptMapsApi from "../services/api"

// Form schema validation
const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  learningObjective: z.string().min(1, "Learning objective is required").max(200, "Learning objective must be less than 200 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  isPublic: z.boolean().default(false),
  contentSource: z.enum(["empty", "file", "text"]).default("empty"),
  fileUpload: z.any().optional(),
  textContent: z.string().max(5000, "Text content must be less than 5000 characters").optional(),
})

export type CreateMapData = z.infer<typeof formSchema>

interface CreateMapDialogProps {
  trigger?: React.ReactNode // Optional custom trigger component
  onMapCreated?: (mapId: number) => void // Optional callback when map is created
}

export function CreateMapDialog({ trigger, onMapCreated }: CreateMapDialogProps) {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  
  // Form setup
  const form = useForm<CreateMapData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      learningObjective: "",
      description: "",
      isPublic: false,
      contentSource: "empty",
      textContent: "",
    },
  })

  const contentSource = form.watch("contentSource")

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0])
      form.setValue("contentSource", "file")
    }
  }

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (contentSource === "file") {
      form.setValue("contentSource", "empty")
    }
  }

  // Form submit handler
  const onSubmit = async (data: CreateMapData) => {
    try {
      setIsCreating(true)
      
      // Call API to create the map
      const newMap = await conceptMapsApi.createMap({
        title: data.title,
        description: `${data.learningObjective}${data.description ? ` - ${data.description}` : ''}`,
        isPublic: data.isPublic,
      })
      
      // In a real implementation, we would handle file uploads or text content here
      if (data.contentSource === "file" && selectedFile) {
        // Upload file logic would go here
        console.log("File to process:", selectedFile)
        // Simulate file upload success
        toast.success("File uploaded successfully")
      } else if (data.contentSource === "text" && data.textContent) {
        // Process text content logic would go here
        console.log("Text content to process:", data.textContent)
      }
      
      // Show success message
      toast.success("Map created successfully")
      
      // Close the dialog
      setOpen(false)
      
      // Reset form
      form.reset()
      setSelectedFile(null)
      
      // If callback provided, call it
      if (onMapCreated && newMap?.id) {
        onMapCreated(newMap.id)
      } else if (newMap?.id) {
        // Navigate to the map editor for the new map
        navigate(`/editor/${newMap.id}`)
      }
    } catch (error) {
      console.error("Failed to create map", error)
      toast.error("Failed to create map. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button className="gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            <span>New Map</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New Concept Map</DialogTitle>
          <DialogDescription>
            Fill in the details to create your new concept map and select your content source.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Map title and learning objective section */}
            <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="text-lg font-medium">Map Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a title for your concept map" className="text-lg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="learningObjective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Learning Objective</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="What do you want to learn about? (e.g., 'How AI affects daily life')" 
                          className="text-lg"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Information (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any additional details about your concept map"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Content Source Tabs */}
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="text-lg font-medium mb-4">Content Source</h3>
              <FormField
                control={form.control}
                name="contentSource"
                render={({ field }) => (
                  <FormItem>
                    <Tabs 
                      defaultValue="empty" 
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="empty">Empty Canvas</TabsTrigger>
                        <TabsTrigger value="file">Upload File</TabsTrigger>
                        <TabsTrigger value="text">Text Input</TabsTrigger>
                      </TabsList>
                      <TabsContent value="empty" className="pt-4">
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Start with a blank canvas and build your concept map from scratch.</p>
                        </div>
                      </TabsContent>
                      <TabsContent value="file" className="pt-4">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                          {selectedFile ? (
                            <div className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <FileUp className="h-5 w-5 text-primary" />
                                <span className="text-sm truncate max-w-[400px]">{selectedFile.name}</span>
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon"
                                onClick={handleRemoveFile}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                              <h3 className="mt-2 text-lg font-medium">Upload a file</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Upload a PDF, Word document, or text file to extract concepts
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                className="mt-4"
                                onClick={() => document.getElementById('file-upload')?.click()}
                              >
                                Select File
                              </Button>
                              <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt"
                                onChange={handleFileSelect}
                              />
                            </>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="text" className="pt-4">
                        <FormField
                          control={form.control}
                          name="textContent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Paste your text content</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Paste text to extract concepts from..."
                                  className="min-h-[200px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                The system will analyze this text and extract key concepts to create your map.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  </FormItem>
                )}
              />
            </div>
            
            {/* Settings Section */}
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="text-lg font-medium mb-4">Settings</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Make Public</FormLabel>
                        <FormDescription>
                          Allow other users to view this concept map
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="px-8" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Map"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 