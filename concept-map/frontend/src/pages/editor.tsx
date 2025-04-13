import * as React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Download, Share2, Star, StarOff, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { ConceptMapViewer } from "../components/concept-map-viewer";
import { TLDrawEditor } from "../components/tldraw-editor";
import conceptMapsApi from "../services/api";
import { MapItem } from "../components/file-system";

// Create a full type for the OCR result to avoid linter issues
interface OcrResult {
  image: string;
  format: string;
  concepts: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  relationships: Array<{
    source: string;
    target: string;
    label?: string;
  }>;
  structure?: {
    type: string;
    root?: string;
  };
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = React.useState<MapItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [inputText, setInputText] = React.useState<string>("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [showDigitizeDialog, setShowDigitizeDialog] = React.useState(false);
  const [currentMapType, setCurrentMapType] = React.useState<string>("mindmap");
  const [error, setError] = React.useState<string | null>(null);

  // Fetch the map data when the component mounts
  React.useEffect(() => {
    const fetchMap = async () => {
      if (!id) {
        toast.error("No map ID provided");
        navigate("/maps");
        return;
      }

      try {
        setLoading(true);
        const mapData = await conceptMapsApi.getMap(Number(id));
        if (mapData) {
          setMap(mapData);
          setIsFavorite(mapData.isFavorite || false);
          // Store the map content if available
          if (mapData.inputText) {
            setInputText(mapData.inputText);
          }
          // Determine the map type (you could store this in the map metadata or infer it)
          const mapType = determineMapType(mapData);
          setCurrentMapType(mapType);
        } else {
          setError("Map not found");
        }
      } catch (error) {
        setError("Error loading map");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [id, navigate]);

  // Helper function to determine map type from the map data
  const determineMapType = (mapData: any): string => {
    // You could have this stored in the map metadata or infer it
    // For now we'll use a simple heuristic based on SVG content
    if (mapData.svgContent && mapData.svgContent.includes("tldraw")) {
      return "drawing";
    }
    return "mindmap"; // Default
  };

  // Handle toggling favorite status
  const handleToggleFavorite = async () => {
    if (!map?.id) return;
    
    try {
      const success = await conceptMapsApi.toggleFavorite(map.id);
      if (success) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite status:", error);
      toast.error("Failed to update favorite status");
    }
  };

  // Handle sharing the map
  const handleShare = async () => {
    if (!map?.id) return;
    
    try {
      const { shareUrl, shareId } = await conceptMapsApi.shareMap(map.id);
      
      // Update the map in state with the share URL
      setMap(prevMap => {
        if (!prevMap) return null;
        return {
          ...prevMap,
          isPublic: true,
          shareId: shareId,
          shareUrl: shareUrl
        };
      });
      
      // Show success message and copy to clipboard
      toast.success("Map shared successfully");
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl)
        .then(() => toast.success("Link copied to clipboard"))
        .catch(() => toast.error("Failed to copy link"));
      
    } catch (error) {
      console.error("Error sharing map:", error);
      toast.error("Failed to share map");
    }
  };

  // Handle downloading the SVG or PNG
  const handleDownload = () => {
    if (!map?.svgContent || !map.title) return;
    
    // Create a link and trigger download
    const link = document.createElement("a");
    link.href = map.svgContent;
    link.download = `${map.title}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Map downloaded successfully");
  };

  // Handle saving the map
  const handleSave = async (svgContent: string) => {
    if (!map?.id) return;
    
    try {
      const updatedMap = await conceptMapsApi.updateMap(map.id, {
        name: map.title,
        image: svgContent,
        format: 'svg',
        nodes: map.nodes || [],
        edges: map.edges || []
      });
      
      if (updatedMap) {
        setMap(updatedMap);
        setIsEditing(false);
        toast.success("Map saved successfully");
      }
    } catch (error) {
      console.error("Error saving map:", error);
      toast.error("Failed to save map");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/maps")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{map?.title || "Concept Map"}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleToggleFavorite}>
            {isFavorite ? (
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-5 w-5" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-5 w-5" />
          </Button>
          {isEditing && currentMapType === "drawing" && (
            <Button 
              variant="outline" 
              size="icon" 
              title="Digitize drawing with OCR"
              onClick={() => setShowDigitizeDialog(true)}
            >
              <Wand2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="result" className="mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="result">Result</TabsTrigger>
          <TabsTrigger value="input">Input</TabsTrigger>
        </TabsList>
        
        <TabsContent value="result">
          {/* Concept Map Viewer */}
          <Card className="p-6 overflow-auto bg-white">
            {!isEditing ? (
              <>
                {map?.svgContent ? (
                  <ConceptMapViewer 
                    svgContent={map.svgContent} 
                    onSave={handleSave}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[600px] text-muted-foreground">
                    No preview available
                  </div>
                )}
              </>
            ) : (
              <div className="border rounded-lg overflow-hidden bg-white">
                <TLDrawEditor 
                  className="h-[600px]" 
                  onSave={handleSave}
                  enableOcr={showDigitizeDialog}
                  onOcrProcessed={async (result: OcrResult) => {
                    setShowDigitizeDialog(false);
                    
                    try {
                      // Save the digitized version
                      if (result && result.image) {
                        // Update the map with the digitized SVG
                        const mapId = map?.id ? Number(map.id) : 0;
                        
                        // Ensure we have valid arrays
                        const conceptNodes = Array.isArray(result.concepts) ? result.concepts : [];
                        const relationshipEdges = Array.isArray(result.relationships) ? result.relationships : [];
                        
                        const updatedMap = await conceptMapsApi.updateMap(mapId, {
                          name: map?.title || '',
                          image: result.image,
                          format: 'svg',
                          nodes: conceptNodes,
                          edges: relationshipEdges
                        });
                        
                        if (updatedMap) {
                          setMap(updatedMap);
                          setIsEditing(false);
                          setCurrentMapType("mindmap");
                          toast.success("Drawing successfully digitized!");
                        }
                      }
                    } catch (error) {
                      console.error("Error saving digitized map:", error);
                      toast.error("Failed to save digitized map");
                    }
                  }}
                />
              </div>
            )}
          </Card>
        </TabsContent>
        
        <TabsContent value="input">
          {/* Original Input */}
          <Card className="p-6 bg-white">
            <h3 className="text-lg font-medium mb-2">Original Input</h3>
            <Separator className="mb-4" />
            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-md border">
              {inputText || "No input text available for this concept map."}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="mt-4 flex justify-end">
        {isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}