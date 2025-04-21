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

import { TLDrawEditor } from "./tldraw-editor"
import { WhiteboardEditor, WhiteboardEditorRef } from "./whiteboard-editor"
import {useConceptMapsApi} from "../services/concept_map_api.ts";

// Form schema validation
const formSchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
    learningObjective: z.string().min(1, "Learning objective is required").max(200, "Learning objective must be less than 200 characters"),
    description: z.string().max(500, "Description must be less than 500 characters").optional(),
    mapType: z.enum(["mindmap", "wordcloud", "bubblechart", "handdrawn"]).default("mindmap"),
    isPublic: z.boolean().default(false),
    contentSource: z.enum(["digitize", "whiteboard", "file", "text"]).default("file"),
    fileUpload: z.any().optional(),
    textContent: z.string().max(1000000, "Text content must be less than 1,000,000 characters").optional(),
    tldrawContent: z.string().optional(),
    isDigitized: z.boolean().default(false),
    svgContent: z.string().optional(),
    conceptData: z.any().optional(),
    hasTLDrawContent: z.boolean().default(false),
    whiteboardContent: z.any().optional(),
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
    const { processDocument, createMap } = useConceptMapsApi();
    
    // Create a ref for the whiteboard editor
    const whiteboardEditorRef = React.useRef<WhiteboardEditorRef>(null);

    // Form setup
    const form = useForm<CreateMapData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            learningObjective: "",
            description: "",
            mapType: "mindmap",
            isPublic: false,
            contentSource: "file",
            textContent: "",
            isDigitized: false,
            hasTLDrawContent: false,
            whiteboardContent: null
        },
    })

    const contentSource = form.watch("contentSource")
    const mapType = form.watch("mapType")

    // Update content source when map type changes
    React.useEffect(() => {
        if (mapType === "handdrawn") {
            // For handdrawn maps, set content source to digitize or whiteboard
            if (contentSource !== "digitize" && contentSource !== "whiteboard") {
                form.setValue("contentSource", "digitize");
            }
        } else {
            // For other map types, set content source to file or text
            if (contentSource !== "file" && contentSource !== "text") {
                form.setValue("contentSource", "file");
            }
        }
    }, [mapType, contentSource, form]);

    // Monitor contentSource changes for debugging
    React.useEffect(() => {
        console.log("contentSource changed to:", contentSource);
    }, [contentSource]);

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

                const result = await processDocument(file);

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
    }

    // Form submit handler
    const onSubmit = async (data: CreateMapData) => {
        try {
            setIsCreating(true);

            // Force a refresh of all form values to ensure the latest state
            const latestFormValues = form.getValues();
            console.log("Raw form values before submission:", latestFormValues);

            // Log form values for debugging
            console.log("Form submit values:", {
                contentSource: data.contentSource,
                mapType: data.mapType,
                isDigitized: data.isDigitized,
                hasTLDrawContent: !!data.tldrawContent || !!data.svgContent,
                hasSVGContent: !!data.svgContent,
                hasWhiteboardContent: !!data.whiteboardContent,
                textLength: data.textContent?.length || 0
            });

            // If this is a whiteboard, get the latest content directly from the editor
            if (data.contentSource === "whiteboard") {
                console.log("Getting current whiteboard content from editor");
                
                // Get the current content from the editor if available
                if (whiteboardEditorRef.current) {
                    const currentContent = whiteboardEditorRef.current.getCurrentContent();
                    if (currentContent) {
                        console.log("Got current whiteboard content, size:", JSON.stringify(currentContent).length);
                        data.whiteboardContent = currentContent;
                    }
                }
                
                if (!data.whiteboardContent) {
                    console.error("No whiteboard content available");
                    toast.error("Please draw something on the whiteboard before creating");
                    setIsCreating(false);
                    return;
                }
            }

            // Handle digitized drawing content
            if (data.contentSource === "digitize" && data.isDigitized && data.conceptData) {
                console.log("Using structured concept data from OCR for digitized drawing");

                // Create map with the structured concept data
                const newMap = await createMap({
                    title: data.title || "Concept Map",
                    description: data.description || "",
                    learningObjective: data.learningObjective,
                    isPublic: data.isPublic,
                    mapType: "mindmap",
                    text: data.textContent || "",
                    svgContent: data.svgContent,
                    conceptData: {
                        nodes: data.conceptData.nodes,
                        edges: data.conceptData.edges,
                        structure: data.conceptData.structure || {
                            type: "hierarchical",
                            root: data.conceptData.nodes.length > 0 ? data.conceptData.nodes[0].id : "c1"
                        }
                    }
                });

                if (!newMap) {
                    throw new Error("Failed to create map from digitized content");
                }

                // Handle success (download image, show success message, etc.)
                toast.success("Digitized concept map created successfully!");

                // Close the dialog
                setOpen(false);

                // Handle map created callback or navigation
                if (onMapCreated && newMap.id) {
                    onMapCreated(newMap.id);
                } else if (newMap.id) {
                    // Navigate to the created map
                    navigate(`/editor/${newMap.id}`);
                }

                return; // Exit early since we've handled the digitized map case
            }

            // Handle whiteboard content
            if (data.contentSource === "whiteboard" && data.whiteboardContent) {
                console.log("Creating whiteboard with content");
                
                // Create map with whiteboard content and explicitly set format to handdrawn
                const newMap = await createMap({
                    title: data.title || "Whiteboard",
                    description: data.description || "",
                    learningObjective: data.learningObjective,
                    isPublic: data.isPublic,
                    mapType: "handdrawn",  // Use mapType handdrawn to identify this as a whiteboard
                    // Store whiteboard content directly
                    whiteboardContent: data.whiteboardContent,
                    // Force the format field to be handdrawn
                    format: "handdrawn"
                });

                if (!newMap) {
                    throw new Error("Failed to create whiteboard");
                }

                // Handle success
                toast.success("Whiteboard created successfully!");

                // Close the dialog
                setOpen(false);

                // Handle map created callback or navigation
                if (onMapCreated && newMap.id) {
                    onMapCreated(newMap.id);
                } else if (newMap.id) {
                    // Navigate to the whiteboard editor
                    navigate(`/whiteboard-editor/${newMap.id}`);
                }

                return;
            }

            let textContent = "";

            // Validate content based on source for non-handdrawn maps
            if (data.mapType !== "handdrawn") {
                if (data.contentSource === "file") {
                    if (!data.textContent) {
                        throw new Error("Please process a file before creating the map");
                    }
                    textContent = data.textContent;
                } else if (data.contentSource === "text") {
                    if (!data.textContent) {
                        throw new Error("Please enter some text before creating the map");
                    }
                    textContent = data.textContent;
                }
            }

            console.log("Creating map with:", {
                title: data.title,
                mapType: data.mapType,
                isDigitized: data.isDigitized,
                textLength: textContent.length
            });

            // Call API to create the map
            const newMap = await createMap({
                title: data.title,
                description: data.description || "",
                learningObjective: data.learningObjective,
                isPublic: data.isPublic,
                mapType: data.mapType,
                text: textContent,
                svgContent: data.svgContent,
                tldrawContent: data.tldrawContent,
                isDigitized: data.isDigitized,
                conceptData: data.isDigitized && data.conceptData ? {
                    nodes: data.conceptData.nodes,
                    edges: data.conceptData.edges,
                    structure: data.conceptData.structure || { type: "hierarchical", root: data.conceptData.nodes?.[0]?.id || "c1" }
                } : undefined
            });

            if (!newMap) {
                throw new Error("Failed to create map");
            }

            // Map creation successful
            toast.success("Concept map created successfully!");

            // Clear the form data after successful creation
            form.reset({
                title: "",
                learningObjective: "",
                description: "",
                mapType: "mindmap",
                isPublic: false,
                contentSource: "file",
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
            toast.error(error instanceof Error ? error.message : "Failed to create concept map. Please try again.");
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
                                                    <SelectItem value="handdrawn">Handdrawn</SelectItem>
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
                                            defaultValue="file"
                                            value={field.value}
                                            onValueChange={(value) => {
                                                // Update field value
                                                field.onChange(value);
                                            }}
                                            className="w-full"
                                        >
                                            {/* Show different tabs based on mapType */}
                                            {mapType === "handdrawn" ? (
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="digitize">Digitize Drawing</TabsTrigger>
                                                    <TabsTrigger value="whiteboard">Whiteboard</TabsTrigger>
                                                </TabsList>
                                            ) : (
                                                <TabsList className="grid w-full grid-cols-2">
                                                    <TabsTrigger value="file">File</TabsTrigger>
                                                    <TabsTrigger value="text">Text</TabsTrigger>
                                                </TabsList>
                                            )}
                                            
                                            {/* Digitize Drawing tab for handdrawn maps - replaces empty canvas */}
                                            <TabsContent value="digitize" className="pt-4">
                                                <div className="text-center py-2 text-muted-foreground">
                                                    <p>Draw your concept map and digitize it using AI recognition.</p>
                                                </div>
                                                <div className="mt-4 border rounded-lg" style={{ height: '500px' }}>
                                                    <TLDrawEditor
                                                        enableOcr={true}
                                                        debugMode={true}
                                                        onSave={(svgContent) => {
                                                            console.log("Drawing saved, updating form values");
                                                            // Update form when drawing is saved
                                                            form.setValue("svgContent", svgContent);
                                                            form.setValue("hasTLDrawContent", true);
                                                        }}
                                                        onOcrProcessed={(result) => {
                                                            console.log("OCR processing result received:", result);

                                                            // Store the original drawing
                                                            if (result.image) {
                                                                form.setValue("svgContent", result.image);
                                                            }

                                                            // Set flags for digitized content
                                                            form.setValue("isDigitized", true, { shouldDirty: true, shouldTouch: true });
                                                            form.setValue("hasTLDrawContent", true, { shouldDirty: true, shouldTouch: true });

                                                            // Store the extracted concepts and relationships
                                                            if (result.concepts && result.concepts.length > 0) {
                                                                // Create nodes array
                                                                const nodes = result.concepts.map((c: any) => ({
                                                                    id: c.id || `c${Math.floor(Math.random() * 1000)}`,
                                                                    label: c.name || "Unnamed Concept",
                                                                    description: c.description || ""
                                                                }));

                                                                // Create edges array
                                                                const edges = result.relationships.map((r: any) => ({
                                                                    source: r.source,
                                                                    target: r.target,
                                                                    label: r.label || "relates to"
                                                                }));

                                                                // Create a text summary for display/metadata purposes
                                                                const conceptNames = nodes.map((c: any) => c.label).join(', ');
                                                                const conceptDetails = nodes.map((c: any) =>
                                                                    `${c.label}: ${c.description || 'No description'}`
                                                                ).join('\n');

                                                                const relationshipDetails = edges.map((r: any) => {
                                                                    const sourceConcept = nodes.find((c: any) => c.id === r.source);
                                                                    const targetConcept = nodes.find((c: any) => c.id === r.target);
                                                                    return `${sourceConcept?.label || r.source} ${r.label} ${targetConcept?.label || r.target}`;
                                                                }).join('\n');

                                                                const fullText = `Digitized concept map with concepts: ${conceptNames}\n\nConcepts:\n${conceptDetails}\n\nRelationships:\n${relationshipDetails}`;

                                                                form.setValue("textContent", fullText);

                                                                // Store the concept data in the expected format for the mind_map.py
                                                                form.setValue("conceptData", {
                                                                    nodes: nodes,
                                                                    edges: edges,
                                                                    structure: result.structure || {
                                                                        type: "hierarchical",
                                                                        root: nodes.length > 0 ? nodes[0].id : "c1"
                                                                    }
                                                                });

                                                                console.log("Stored concept data:", {
                                                                    nodes: nodes,
                                                                    edges: edges,
                                                                    structure: result.structure || {
                                                                        type: "hierarchical",
                                                                        root: nodes.length > 0 ? nodes[0].id : "c1"
                                                                    }
                                                                });
                                                            }

                                                            // Show success toast
                                                            toast.success("Drawing digitized successfully!");
                                                        }}
                                                    />
                                                </div>
                                            </TabsContent>
                                            
                                            {/* Whiteboard tab for handdrawn maps */}
                                            <TabsContent value="whiteboard" className="pt-4">
                                                <div className="text-center py-2 text-muted-foreground">
                                                    <p>Create a hand-drawn whiteboard with freeform drawing tools.</p>
                                                </div>
                                                <div className="mt-4 border rounded-lg overflow-hidden" style={{ height: '500px', minHeight: '500px', maxHeight: '500px' }}>
                                                    <WhiteboardEditor 
                                                        ref={whiteboardEditorRef}
                                                        whiteboardContent={null} 
                                                        hideSaveButton={true}
                                                        onSave={() => {
                                                            // Only set these values once
                                                            if (form.getValues().contentSource !== "whiteboard") {
                                                                form.setValue("mapType", "handdrawn");
                                                                form.setValue("contentSource", "whiteboard");
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </TabsContent>
                                            
                                            {/* Regular file upload tab for non-handdrawn maps */}
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

                                            {/* Text input tab for non-handdrawn maps */}
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
                                type="button"
                                className="px-8"
                                disabled={isCreating}
                                onClick={() => {
                                    // Submit the form
                                    form.handleSubmit(onSubmit)();
                                }}
                            >
                                {isCreating ? "Creating..." : "Create Map"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}