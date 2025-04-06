import * as React from "react"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { FileUp, FileText, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

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
import { TLDrawEditor } from "./tldraw-editor"

// Form schema validation
const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  learningObjective: z.string().min(1, "Learning objective is required").max(200, "Learning objective must be less than 200 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  mapType: z.enum(["mindmap", "wordcloud", "bubblechart"]).default("mindmap"),
  isPublic: z.boolean().default(false),
  contentSource: z.enum(["empty", "file", "text"]).default("empty"),
  fileUpload: z.any().optional(),
  textContent: z.string().max(1000000, "Text content must be less than 1,000,000 characters").optional(),
  tldrawContent: z.string().optional(),
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
  const [isProcessingFile, setIsProcessingFile] = React.useState(false)
  
  // Form setup
  const form = useForm<CreateMapData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      learningObjective: "",
      description: "",
      mapType: "mindmap",
      isPublic: false,
      contentSource: "empty",
      textContent: "",
    },
  })

  const contentSource = form.watch("contentSource")

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Clear previous file and extracted text when uploading a new file
      if (selectedFile && selectedFile.name !== file.name) {
        form.setValue("textContent", "");
      }
      
      setSelectedFile(file);
      form.setValue("contentSource", "file");
      
      // Process the file immediately to extract text
      try {
        setIsProcessingFile(true);
        toast.info("Processing document, please wait...");
        
        const result = await conceptMapsApi.processDocument(file);
        
        if (result && result.text) {
          // Store the extracted text but stay in the file tab
          // This addresses the user's request to keep extracted text in the upload tab
          form.setValue("textContent", result.text);
          // Keep contentSource as "file" so the text stays hidden but available for processing
          form.setValue("contentSource", "file");
          toast.success("Document processed successfully! You can now generate a concept map.");
        }
      } catch (error) {
        console.error("Error processing file:", error);
        toast.error("Failed to process document. Please try again or use text input instead.");
      } finally {
        setIsProcessingFile(false);
      }
    }
  }

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    // Clear the extracted text when removing a file
    form.setValue("textContent", "");
    if (contentSource === "file") {
      form.setValue("contentSource", "empty");
    }
  }

  // Function to download image (supports both SVG and PNG formats)
  const downloadImage = (imageContent: string, fileName: string) => {
    // Check if the content is a data URL
    if (imageContent.startsWith('data:')) {
      // Extract the MIME type from the data URL
      const mimeType = imageContent.split(';')[0].split(':')[1];
      const fileExtension = mimeType === 'image/svg+xml' ? 'svg' : 'png';
      
      // For data URLs, we can use them directly
      const link = document.createElement('a');
      link.href = imageContent;
      link.download = `${fileName}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // If it's not a data URL, assume it's SVG content
      const blob = new Blob([imageContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Form submit handler
  const onSubmit = async (data: CreateMapData) => {
    try {
      setIsCreating(true);
      
      let textContent = "";
      let svgContent = "";
      
      // Handle different content sources
      if (data.contentSource === "file" && data.textContent) {
        // Use the text extracted from the file processing
        textContent = data.textContent;
      } else if (data.contentSource === "text" && data.textContent) {
        textContent = data.textContent;
      }
      
      // If using TLDraw, include the SVG as the input text
      const inputText = data.contentSource === "empty" && data.tldrawContent ? data.tldrawContent : textContent;
      
      // Call API to create the map
      const newMap = await conceptMapsApi.createMap({
        title: data.title,
        description: `${data.learningObjective}${data.description ? ` - ${data.description}` : ''}`,
        isPublic: data.isPublic,
        mapType: data.mapType,
        text: inputText
      });
      
      if (!newMap) {
        throw new Error("Failed to create map");
      }
      
      // Handle SVG content if available
      if (newMap.svgContent) {
        console.log('Received image content:', newMap.svgContent.substring(0, 50) + '...');
        
        // Download the image
        downloadImage(newMap.svgContent, data.title);
        
        // Open in new window if requested
        const newWindow = window.open();
        if (newWindow && newMap.svgContent) {
          // Check if the content is SVG
          const isSvg = newMap.svgContent.includes('image/svg+xml');
          
          // Set the content type
          newWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${data.title} - Concept Map</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background-color: #f8f9fa;
                  }
                  img {
                    max-width: 90%;
                    max-height: 90vh;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                  }
                </style>
              </head>
              <body>
          `);
          
          // Add either SVG or image content
          if (isSvg) {
            const svgContent = atob(newMap.svgContent.split(',')[1]);
            newWindow.document.write(`
              ${svgContent}
            `);
          } else {
            newWindow.document.write(`
              <img src="${newMap.svgContent}" alt="${data.title}" />
            `);
          }
          
          newWindow.document.write(`
              </body>
            </html>
          `);
          newWindow.document.close();
        }
      }
      
      toast.success("Concept map created successfully!");
      
      // Clear the form data after successful creation
      form.reset({
        title: "",
        learningObjective: "",
        description: "",
        mapType: "mindmap",
        isPublic: false,
        contentSource: "empty",
        textContent: "",
      });
      
      // Clear selected file and extracted text
      setSelectedFile(null);
      
      // Close the dialog
      setOpen(false);
      
      // Handle map created callback
      if (onMapCreated && newMap.id) {
        onMapCreated(newMap.id);
      } else if (newMap.id) {
        // Navigate to the created map
        navigate(`/editor/${newMap.id}`);
      }
      
    } catch (error) {
      console.error("Error creating map:", error);
      toast.error("Failed to create concept map. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };
  
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
                  name="mapType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Map Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a map type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mindmap">Mind Map</SelectItem>
                          <SelectItem value="wordcloud">Word Cloud</SelectItem>
                          <SelectItem value="bubblechart">Bubble Chart</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose how you want to visualize your concept map
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                        <div className="text-center py-2 text-muted-foreground">
                          <p>Start with a blank canvas and build your concept map from scratch.</p>
                        </div>
                        <div className="mt-4 border rounded-lg" style={{ height: '500px' }}>
                          <TLDrawEditor 
                            onSave={(svgContent) => {
                              form.setValue("tldrawContent", svgContent);
                            }}
                          />
                        </div>
                      </TabsContent>
                      <TabsContent value="file" className="pt-4">
                        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                          {selectedFile ? (
                            <div className="flex flex-col gap-4">
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
                                  disabled={isProcessingFile}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              {isProcessingFile ? (
                                <div className="text-center py-4">
                                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                                  <p className="text-sm text-muted-foreground">Processing document...</p>
                                </div>
                              ) : (
                                <div>
                                  {form.watch("textContent") ? (
                                    <div className="space-y-3">
                                      <div className="p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                        <div>
                                          <p className="text-sm font-medium">Processing Complete</p>
                                          <p className="text-xs mt-0.5">Text has been successfully extracted from your document</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full"
                                      onClick={() => handleFileSelect({ target: { files: [selectedFile] } } as any)}
                                      disabled={isProcessingFile}
                                    >
                                      Process Document Again
                                    </Button>
                                  )}
                                </div>
                              )}
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
                                disabled={isProcessingFile}
                              >
                                Select File
                              </Button>
                              <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={handleFileSelect}
                              />
                            </>
                          )}
                        </div>
                        
                        {/* Extracted Text Display Section - shown below the upload area */}
                        {form.watch("textContent") && selectedFile && (
                          <div className="mt-6 border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold">Extracted Text</h3>
                              <p className="text-xs text-muted-foreground">
                                {(form.watch("textContent")?.length || 0).toLocaleString()} characters
                              </p>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto bg-muted/30 p-3 rounded text-sm text-muted-foreground whitespace-pre-wrap border">
                              {form.watch("textContent")?.substring(0, 500) || ""}
                              {(form.watch("textContent")?.length || 0) > 500 && (
                                <>
                                  <span>...</span>
                                  <p className="text-xs italic mt-2">
                                    (Showing first 500 characters only. Full text will be used to generate your concept map.)
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
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
              <Button 
                type="submit" 
                className="px-8" 
                disabled={isCreating}
                variant={form.watch("contentSource") === "file" && form.watch("textContent") ? "default" : "default"}
              >
                {isCreating ? "Creating..." : 
                  form.watch("contentSource") === "file" && form.watch("textContent") 
                    ? "Generate Map from Document" 
                    : "Create Map"
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}