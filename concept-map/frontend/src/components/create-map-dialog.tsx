import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileUp, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from './ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

import { TLDrawEditor } from './tldraw-editor';
import { TLDrawWhiteboard } from './tldraw-whiteboard';
import { useConceptMapsApi } from '../services/api.ts';

// Form schema validation
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  learningObjective: z.string().min(1, 'Learning objective is required').max(200, 'Learning objective must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  mapType: z.enum(['mindmap', 'wordcloud', 'bubblechart', 'handdrawn']).default('mindmap'),
  isPublic: z.boolean().default(false),
  contentSource: z.enum(['empty', 'file', 'text', 'drawing', 'handdrawn']).default('empty'),
});

  fileUpload: z.any().optional(),
  textContent: z.string().max(1000000, 'Text content must be less than 1,000,000 characters').optional(),
  tldrawContent: z.string().optional(),
  isDigitized: z.boolean().default(false),
  svgContent: z.string().optional(),
  conceptData: z.any().optional(),
  hasTLDrawContent: z.boolean().default(false),
  isFromTemplate: z.boolean().default(false),
  templateNodes: z.any().optional(),
  templateEdges: z.any().optional(),
  whiteboardContent: z.any().optional(),
});


export type CreateMapData = z.infer<typeof formSchema>;

export interface CreateMapDialogInitialData {
  id?: string;
  name?: string;
  description?: string;
  input_text?: string;
  nodes?: any[];
  edges?: any[];
}

interface CreateMapDialogProps {
  trigger?: React.ReactNode;
  onMapCreated?: (mapId: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CreateMapDialogInitialData | null;
}

export function CreateMapDialog({ trigger, onMapCreated, open, initialData, onOpenChange }: CreateMapDialogProps) {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = React.useState(false);
  const { processDocument, createMap } = useConceptMapsApi();

  // Form setup
  const form = useForm<CreateMapData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      learningObjective: '',
      description: '',
      mapType: 'mindmap',
      isPublic: false,
      contentSource: 'empty',
      textContent: '',
      isDigitized: false,
      hasTLDrawContent: false,
      isFromTemplate: false,
      templateNodes: undefined,
      templateEdges: undefined,
    },
  });

  const contentSource = form.watch('contentSource');

  // Monitor contentSource changes for debugging
  //   React.useEffect(() => {
  //     console.log('contentSource changed to:', contentSource);
  //   }, [contentSource]);

  React.useEffect(() => {
    if (open && initialData) {
      console.log('CreateMapDialog: Setting initial data from template', initialData);
      form.reset({
        // Use reset to set multiple values and mark as not dirty initially
        ...form.getValues(), // Keep other defaults
        title: initialData.name || '',
        // Use learningObjective if template provides it, else keep default
        learningObjective: initialData.input_text || '',
        description: initialData.description || '',
        // Use template text if provided, otherwise keep default
        textContent: initialData.input_text || '',
        // Keep other fields like mapType, isPublic at their defaults unless template overrides
        mapType: form.getValues('mapType') || 'mindmap',
        isPublic: form.getValues('isPublic') || false,
        // Mark that this data came from a template
        isFromTemplate: true,
        // Store template structure (nodes/edges) in hidden form fields
        // The parent component (DashboardPage) will use these fields when calling the API
        templateNodes: initialData.nodes || [],
        templateEdges: initialData.edges || [],
        // Decide which tab to show. If template has structure, maybe start with empty?
        // If template has text, start with text? Let's default to "text" if textContent exists.
        contentSource: initialData.input_text ? 'text' : 'empty', // << Adjust logic as needed
      });
      // Clear the drawing/file state if we loaded a template
      setSelectedFile(null);
      form.setValue('svgContent', undefined);
      form.setValue('hasTLDrawContent', false);
      form.setValue('isDigitized', false);
      form.setValue('conceptData', undefined);
      form.setValue('fileUpload', undefined);
    } else if (!open) {
      // Reset the form completely when dialog closes if NOT pre-filled
      // If it was pre-filled, maybe don't reset? Let's reset for now.
      form.reset(); // Reset to default values
      setSelectedFile(null);
      setIsProcessingFile(false); // Ensure processing state is reset
      setIsCreating(false); // Ensure creating state is reset
    }
  }, [open, initialData, form]);


React.useEffect(() => {
  const subscription = form.watch((value, { name }) => {
    if (name === "mapType") {
      console.log("mapType changed to:", value.mapType);
    }
  });

  return () => subscription.unsubscribe();
}, [form]);

    
    // When mapType is changed to handdrawn, update contentSource as well
    if (mapType === "handdrawn") {
      // Set contentSource to handdrawn when mapType is handdrawn
      form.setValue("contentSource", "handdrawn", { 
        shouldDirty: true, 
        shouldTouch: true, 
        shouldValidate: true 
      });
    }
  }, [form.watch("mapType")]);

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Clear previous file and extracted text when uploading a new file
      if (selectedFile && selectedFile.name !== file.name) {
        form.setValue('textContent', '');
      }

      setSelectedFile(file);
      form.setValue('contentSource', 'file');

      // Process the file immediately to extract text
      try {
        setIsProcessingFile(true);
        toast.info('Processing document, please wait...');

        const result = await processDocument(file);

        if (result && result.text) {
          // Store the extracted text but stay in the file tab
          // This addresses the user's request to keep extracted text in the upload tab
          form.setValue('textContent', result.text);
          // Keep contentSource as "file" so the text stays hidden but available for processing
          form.setValue('contentSource', 'file');
          toast.success('Document processed successfully! You can now generate a concept map.');
        }
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Failed to process document. Please try again or use text input instead.');
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  // Remove selected file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    // Clear the extracted text when removing a file
    form.setValue('textContent', '');
    if (contentSource === 'file') {
      form.setValue('contentSource', 'empty');
    }
  };

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

      // Force a refresh of all form values to ensure the latest state
      const latestFormValues = form.getValues();
      console.log('Raw form values before submission:', latestFormValues);

      // Log form values for debugging
      console.log('Form submit values:', {
        contentSource: data.contentSource,
        mapType: data.mapType,
        isDigitized: data.isDigitized,
        hasTLDrawContent: !!data.tldrawContent || !!data.svgContent,
        hasSVGContent: !!data.svgContent,
        textLength: data.textContent?.length || 0,
      });

      // Safety check: If we have a drawing but contentSource is empty, fix it
      if (data.contentSource === 'empty' && (data.svgContent || data.hasTLDrawContent)) {
        console.log('Correcting contentSource from empty to drawing');
        data.contentSource = 'drawing';
      }

      // If this is a digitized drawing with structured concept data,
      // use that directly instead of trying to process the text
      if (data.isDigitized && data.conceptData) {
        console.log('Using structured concept data from OCR for digitized drawing');

        // Create map with the structured concept data
        const newMap = await createMap({
          title: data.title || 'Concept Map',
          description: data.description || '',
          learningObjective: data.learningObjective,
          isPublic: data.isPublic,
          mapType: 'mindmap',
          text: data.textContent || '',
          svgContent: data.svgContent,
          conceptData: {
            nodes: data.conceptData.nodes,
            edges: data.conceptData.edges,
            structure: data.conceptData.structure || {
              type: 'hierarchical',
              root: data.conceptData.nodes.length > 0 ? data.conceptData.nodes[0].id : 'c1',
            },
          },
        });

        if (!newMap) {
          throw new Error('Failed to create map from digitized content');
        }

        // Handle success (download image, show success message, etc.)
        toast.success('Digitized concept map created successfully!');

        // Close the dialog
        onOpenChange(false);

        // Handle map created callback or navigation
        if (onMapCreated && newMap.id) {
          onMapCreated(newMap.id);
        } else if (newMap.id) {
          // Navigate to the created map
          if (data.mapType === "handdrawn") {
            navigate(`/whiteboard-editor/${newMap.id}`);
          } else {
            navigate(`/editor/${newMap.id}`);
          }
        }

        return; // Exit early since we've handled the digitized map case
      }

      let textContent = '';

      // Validate content based on source
      if (data.contentSource === 'empty') {
        // Check if we have any drawing content
        if (!data.tldrawContent && !data.svgContent) {
          throw new Error('Please draw something on the canvas before creating the map');
        }

        // If we have drawing content that has been digitized, use that content
        if (data.isDigitized && data.textContent) {
          textContent = data.textContent;
          console.log('Using digitized content text:', textContent.substring(0, 50));
        }
      } else if (data.contentSource === 'drawing') {
        // This is content from the drawing tab
        if (!data.svgContent) {
          throw new Error('Please draw something on the canvas before creating the map');
        }

        // If we have drawing content that has been digitized, use that content
        if (data.isDigitized && data.textContent) {
          textContent = data.textContent;
          console.log('Using digitized content text:', textContent.substring(0, 50));
        }
      } else if (data.contentSource === "handdrawn") {
        if (!data.whiteboardContent) {
          console.error("Missing whiteboard content for handdrawn map", {
            contentSource: data.contentSource,
            mapType: data.mapType,
            hasWhiteboardContent: !!data.whiteboardContent,
          });
          throw new Error("Please save your drawing by clicking the 'Save Drawing' button before continuing");
        }
        console.log("Using hand-drawn whiteboard content");
      } else if (data.contentSource === "file") {

        if (!data.textContent) {
          throw new Error('Please process a file before creating the map');
        }
        textContent = data.textContent;
      } else if (data.contentSource === 'text') {
        if (!data.textContent) {
          throw new Error('Please enter some text before creating the map');
        }
        textContent = data.textContent;
      }

      // For digitized drawings, set the map type to "mindmap" to avoid text generation
      if (data.isDigitized) {
        console.log('Map is digitized, ensuring map type is set to mindmap');
        data.mapType = 'mindmap'; // Ensure mapType is explicitly set to mindmap
      }

      console.log('Creating map with:', {
        title: data.title,
        mapType: data.mapType,
        isDigitized: data.isDigitized,
        hasTLDrawContent: !!data.tldrawContent || !!data.svgContent,
        hasSVGContent: !!data.svgContent,
        textLength: textContent.length,
      });

      // Call API to create the map
      const newMap = await createMap({
        title: data.title,
        description: data.description || '',
        learningObjective: data.learningObjective,
        isPublic: data.isPublic,
        mapType: data.mapType,
        text: textContent,
        svgContent: data.svgContent,
        tldrawContent: data.tldrawContent,
        isDigitized: data.isDigitized,
        whiteboardContent: data.whiteboardContent,
        conceptData: data.isDigitized && data.conceptData
          ? {
              nodes: data.conceptData.nodes,
              edges: data.conceptData.edges,
              structure: data.conceptData.structure || {
                type: 'hierarchical',
                root: data.conceptData.nodes?.[0]?.id || 'c1',
              },
            }
          : undefined,

      });

      if (!newMap) {
        throw new Error('Failed to create map');
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

      // Map creation successful
      toast.success('Concept map created successfully!');

      // Clear the form data after successful creation
      form.reset({
        title: '',
        learningObjective: '',
        description: '',
        mapType: 'mindmap',
        isPublic: false,
        contentSource: 'empty',
        textContent: '',
      });
      // Clear selected file and extracted text
      setSelectedFile(null);

      // Close the dialog (works with both local and controlled)
      onOpenChange?.(false);
      setOpen?.(false);

      // Handle map created callback or navigation
      if (onMapCreated && newMap.id) {
        onMapCreated(newMap.id);
      } else if (newMap.id) {
        if (data.mapType === "handdrawn") {
          navigate(`/whiteboard-editor/${newMap.id}`);
        } else {
          navigate(`/editor/${newMap.id}`);
        }

      }
    } catch (error) {
      console.error('Error creating map:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create concept map. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
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
            {initialData
              ? `Starting with template: "${initialData.name}". Fill in the details.` // Show template name if present
              : 'Fill in the details to create your new concept map and select your content source.'}
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
                          <SelectItem value="handdrawn">Hand-Drawn Whiteboard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Choose how you want to visualize your concept map</FormDescription>
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
                      value={field.value === 'drawing' ? 'empty' : field.value}
                      onValueChange={(value) => {
                        // If changing from "drawing" content source to another tab,
                        // make sure we preserve the data but update the tab selection
                        if (field.value === 'drawing' && value !== 'empty') {
                          // Save the current svgContent and drawing data
                          const currentSvgContent = form.getValues('svgContent');
                          const isDigitized = form.getValues('isDigitized');
                          const conceptData = form.getValues('conceptData');

                          // Change tab
                          field.onChange(value);

                          // But keep the drawing data
                          if (currentSvgContent) {
                            form.setValue('svgContent', currentSvgContent);
                            form.setValue('hasTLDrawContent', true);
                          }
                          if (isDigitized) {
                            form.setValue('isDigitized', isDigitized);
                          }
                          if (conceptData) {
                            form.setValue('conceptData', conceptData);
                          }
                        } else {
                          // Normal tab change
                          field.onChange(value);
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-4">
                        {form.watch("mapType") !== "handdrawn" && (
                          <>
                            <TabsTrigger value="empty">Empty Canvas</TabsTrigger>
                            <TabsTrigger value="file">Upload File</TabsTrigger>
                            <TabsTrigger value="text">Text Input</TabsTrigger>
                          </>
                        )}
                        <TabsTrigger value="handdrawn" className={form.watch("mapType") === "handdrawn" ? "col-span-4" : ""}>
                          Hand-Drawn
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="empty" className="pt-4">
                        <div className="text-center py-2 text-muted-foreground">
                          <p>Start with a blank canvas and build your concept map from scratch.</p>
                        </div>
                        <div className="mt-4 border rounded-lg" style={{ height: '500px' }}>
                          <TLDrawEditor
                            enableOcr={true}
                            debugMode={true}
                            onSave={(svgContent) => {
                              console.log('Drawing saved, updating form values');
                              // Update form when drawing is saved
                              form.setValue('svgContent', svgContent);
                              form.setValue('hasTLDrawContent', true);
                              // Change contentSource from "empty" to indicate we have content
                              form.setValue('contentSource', 'drawing', {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });
                              // Log the current form values after update
                              console.log('Form values after save:', {
                                contentSource: form.getValues('contentSource'),
                                hasTLDrawContent: form.getValues('hasTLDrawContent'),
                              });
                            }}
                            onOcrProcessed={(result) => {
                              console.log('OCR processing result received:', result);

                              // Store the original drawing
                              if (result.image) {
                                form.setValue('svgContent', result.image);
                              }

                              // Set flags for digitized content - using full options to ensure values are registered
                              form.setValue('isDigitized', true, { shouldDirty: true, shouldTouch: true });
                              form.setValue('mapType', 'mindmap', { shouldDirty: true, shouldTouch: true });
                              form.setValue('hasTLDrawContent', true, { shouldDirty: true, shouldTouch: true });
                              // Change contentSource from "empty" to indicate we have content
                              form.setValue('contentSource', 'drawing', {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              });

                              // Store the extracted concepts and relationships
                              if (result.concepts && result.concepts.length > 0) {
                                // Create nodes array
                                const nodes = result.concepts.map((c: any) => ({
                                  id: c.id || `c${Math.floor(Math.random() * 1000)}`,
                                  label: c.name || 'Unnamed Concept',
                                  description: c.description || '',
                                }));

                                // Create edges array
                                const edges = result.relationships.map((r: any) => ({
                                  source: r.source,
                                  target: r.target,
                                  label: r.label || 'relates to',
                                }));

                                // Create a text summary for display/metadata purposes
                                const conceptNames = nodes.map((c: any) => c.label).join(', ');
                                const conceptDetails = nodes
                                  .map((c: any) => `${c.label}: ${c.description || 'No description'}`)
                                  .join('\n');

                                const relationshipDetails = edges
                                  .map((r: any) => {
                                    const sourceConcept = nodes.find((c: any) => c.id === r.source);
                                    const targetConcept = nodes.find((c: any) => c.id === r.target);
                                    return `${sourceConcept?.label || r.source} ${r.label} ${
                                      targetConcept?.label || r.target
                                    }`;
                                  })
                                  .join('\n');

                                const fullText = `Digitized concept map with concepts: ${conceptNames}\n\nConcepts:\n${conceptDetails}\n\nRelationships:\n${relationshipDetails}`;

                                form.setValue('textContent', fullText);

                                // Store the concept data in the expected format for the mind_map.py
                                form.setValue('conceptData', {
                                  nodes: nodes,
                                  edges: edges,
                                  structure: result.structure || {
                                    type: 'hierarchical',
                                    root: nodes.length > 0 ? nodes[0].id : 'c1',
                                  },
                                });

                                console.log('Stored concept data:', {
                                  nodes: nodes,
                                  edges: edges,
                                  structure: result.structure || {
                                    type: 'hierarchical',
                                    root: nodes.length > 0 ? nodes[0].id : 'c1',
                                  },
                                });
                              }

                              // Show success toast
                              toast.success('Drawing digitized successfully!');
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
                                  {form.watch('textContent') ? (
                                    <div className="space-y-3">
                                      <div className="p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded flex items-center gap-2">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="20"
                                          height="20"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="text-green-600"
                                        >
                                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                        </svg>
                                        <div>
                                          <p className="text-sm font-medium">Processing Complete</p>
                                          <p className="text-xs mt-0.5">
                                            Text has been successfully extracted from your document
                                          </p>
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
                        {form.watch('textContent') && selectedFile && (
                          <div className="mt-6 border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-base font-semibold">Extracted Text</h3>
                              <p className="text-xs text-muted-foreground">
                                {(form.watch('textContent')?.length || 0).toLocaleString()} characters
                              </p>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto bg-muted/30 p-3 rounded text-sm text-muted-foreground whitespace-pre-wrap border">
                              {form.watch('textContent')?.substring(0, 500) || ''}
                              {(form.watch('textContent')?.length || 0) > 500 && (
                                <>
                                  <span>...</span>
                                  <p className="text-xs italic mt-2">
                                    (Showing first 500 characters only. Full text will be used to generate your concept
                                    map.)
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
                      <TabsContent value="handdrawn" className="pt-4">
                        <div className="text-center py-2 text-muted-foreground">
                          <p>Create a hand-drawn whiteboard that you can edit later.</p>
                        </div>
                        <div className="mt-4 border rounded-lg" style={{ height: '500px' }}>
                          <TLDrawWhiteboard 
                            onSave={(whiteboardContent) => {
                              console.log("Whiteboard saved, updating form values", {
                                hasContent: !!whiteboardContent,
                                contentSize: whiteboardContent ? JSON.stringify(whiteboardContent).length : 0
                              });
                              
                              // Update form with whiteboard content
                              form.setValue("whiteboardContent", whiteboardContent, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true
                              });
                              
                              // Set map type to handdrawn
                              form.setValue("mapType", "handdrawn", {
                                shouldDirty: true,
                                shouldTouch: true
                              });
                              
                              // Set content source to handdrawn
                              form.setValue("contentSource", "handdrawn", { 
                                shouldDirty: true, 
                                shouldTouch: true, 
                                shouldValidate: true 
                              });

                              // Show a success toast notification to confirm to the user
                              toast.success("Drawing saved!");
                            }}
                          />
                        </div>
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
                        <FormDescription>Allow other users to view this concept map</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="px-8"
                disabled={isCreating}
                variant={form.watch('contentSource') === 'file' && form.watch('textContent') ? 'default' : 'default'}
                onClick={() => {
                  // Ensure form data is up to date
                  const currentFormState = form.getValues();
                  console.log('Current form state before submit:', currentFormState);

                  // If we have drawing content but contentSource is still "empty", fix it
                  if (
                    currentFormState.contentSource === 'empty' &&
                    (currentFormState.svgContent || currentFormState.hasTLDrawContent)
                  ) {
                    console.log('Setting contentSource to drawing before submission');
                    form.setValue('contentSource', 'drawing', {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                  }

                  // Submit the form
                  form.handleSubmit(onSubmit)();
                }}
              >
                {isCreating
                  ? 'Creating...'
                  : form.watch('contentSource') === 'file' && form.watch('textContent')
                  ? 'Generate Map from Document'
                  : 'Create Map'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
