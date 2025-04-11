import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share2, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { ConceptMapViewer } from "../components/concept-map-viewer";
import conceptMapsApi from "../services/api";
import { MapItem } from "../components/file-system";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = React.useState<MapItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [inputText, setInputText] = React.useState<string>("");

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
        if (!mapData) {
          toast.error("Failed to load map");
          navigate("/maps");
          return;
        }
        setMap(mapData);
        setIsFavorite(mapData.isFavorite || false);
        
        // Set the input text from the map data
        if (mapData.input_text && mapData.input_text.trim() !== '') {
          setInputText(mapData.input_text);
        } else {
          // Fallback to description if no input text
          setInputText(mapData.description || "");
        }
      } catch (error) {
        console.error("Error fetching map:", error);
        toast.error("Failed to load map");
        navigate("/maps");
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [id, navigate]);

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
            {map?.svgContent ? (
              <ConceptMapViewer svgContent={map.svgContent} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No visualization available for this concept map.</p>
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
    </div>
  );
}