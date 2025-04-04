import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share2, Star, StarOff, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import conceptMapsApi from "../services/api";
import { MapItem } from "../components/file-system";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = React.useState<MapItem | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const svgContainerRef = React.useRef<HTMLDivElement>(null);

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

  // Render the SVG or PNG content when the map data is loaded
  React.useEffect(() => {
    if (map?.svgContent && svgContainerRef.current) {
      // Clear previous content
      svgContainerRef.current.innerHTML = '';
      
      // Check if the content is a data URL
      if (map.svgContent.startsWith('data:')) {
        // Determine if it's SVG or PNG
        const isSvg = map.svgContent.includes('image/svg+xml');
        const isPng = map.svgContent.includes('image/png');
        
        if (isSvg) {
          try {
            // Extract the base64 content from the data URL
            const base64Content = map.svgContent.split(',')[1];
            // Decode the base64 content
            const decodedContent = atob(base64Content);
            // Set the decoded content as innerHTML
            svgContainerRef.current.innerHTML = decodedContent;
            
            // Make the SVG responsive
            const svg = svgContainerRef.current.querySelector("svg");
            if (svg) {
              svg.setAttribute("width", "100%");
              svg.setAttribute("height", "100%");
              svg.style.maxHeight = "calc(100vh - 200px)";
            }
          } catch (error) {
            console.error('Error decoding SVG content:', error);
            // Fallback to using the content directly if decoding fails
            svgContainerRef.current.innerHTML = map.svgContent;
          }
        } else if (isPng) {
          // For PNG, create an image element
          const img = document.createElement('img');
          img.src = map.svgContent; // Use the data URL directly
          img.style.maxWidth = '100%';
          img.style.maxHeight = 'calc(100vh - 200px)';
          img.style.display = 'block';
          img.style.margin = '0 auto';
          svgContainerRef.current.appendChild(img);
        } else {
          // For other formats or if format detection fails
          // Try to display as image
          const img = document.createElement('img');
          img.src = map.svgContent;
          img.style.maxWidth = '100%';
          img.style.maxHeight = 'calc(100vh - 200px)';
          img.style.display = 'block';
          img.style.margin = '0 auto';
          svgContainerRef.current.appendChild(img);
        }
      } else {
        // If it's not a data URL, check if it's a base64 string without the data URL prefix
        try {
          // Try to determine if it's SVG or PNG based on the content
          const decodedSample = atob(map.svgContent.substring(0, 100));
          const isSvg = decodedSample.includes('<svg') || decodedSample.includes('<?xml');
          
          if (isSvg) {
            // It's likely an SVG without proper data URL prefix
            const dataUrl = `data:image/svg+xml;base64,${map.svgContent}`;
            try {
              // Extract the base64 content
              const decodedContent = atob(map.svgContent);
              // Set the decoded content as innerHTML
              svgContainerRef.current.innerHTML = decodedContent;
              
              // Make the SVG responsive
              const svg = svgContainerRef.current.querySelector("svg");
              if (svg) {
                svg.setAttribute("width", "100%");
                svg.setAttribute("height", "100%");
                svg.style.maxHeight = "calc(100vh - 200px)";
              }
            } catch (error) {
              console.error('Error decoding SVG content:', error);
              // Fallback to using the data URL
              const img = document.createElement('img');
              img.src = dataUrl;
              img.style.maxWidth = '100%';
              img.style.maxHeight = 'calc(100vh - 200px)';
              img.style.display = 'block';
              img.style.margin = '0 auto';
              svgContainerRef.current.appendChild(img);
            }
          } else {
            // Assume it's PNG data without proper data URL prefix
            const dataUrl = `data:image/png;base64,${map.svgContent}`;
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.maxWidth = '100%';
            img.style.maxHeight = 'calc(100vh - 200px)';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            svgContainerRef.current.appendChild(img);
          }
        } catch (error) {
          console.error('Error processing image content:', error);
          // If it's not base64, assume it's raw SVG content
          svgContainerRef.current.innerHTML = map.svgContent;
          
          // Make the SVG responsive
          const svg = svgContainerRef.current.querySelector("svg");
          if (svg) {
            svg.setAttribute("width", "100%");
            svg.setAttribute("height", "100%");
            svg.style.maxHeight = "calc(100vh - 200px)";
          }
        }
      }
    }
  }, [map]);

  // Handle downloading the SVG or PNG
  const handleDownload = () => {
    if (!map?.svgContent || !map.title) return;
    
    // Determine if it's SVG or PNG
    const isSvg = map.svgContent.includes('image/svg+xml');
    const isPng = map.svgContent.includes('image/png');
    const fileExtension = isSvg ? 'svg' : (isPng ? 'png' : 'svg'); // Default to svg if unknown
    const mimeType = isSvg ? 'image/svg+xml' : (isPng ? 'image/png' : 'image/svg+xml');
    
    // For data URLs, we can use them directly for download
    if (map.svgContent.startsWith('data:')) {
      // Create a link and trigger download
      const link = document.createElement("a");
      link.href = map.svgContent;
      link.download = `${map.title}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Map downloaded successfully");
      return;
    }
    
    // For raw SVG content (not a data URL)
    const blob = new Blob([map.svgContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${map.title}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Map downloaded successfully");
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
      const success = await conceptMapsApi.shareMap(map.id);
      if (success) {
        toast.success("Map shared successfully");
      }
    } catch (error) {
      console.error("Error sharing map:", error);
      toast.error("Failed to share map");
    }
  };

  // Handle saving changes to the map
  const handleSave = async () => {
    if (!map?.id) return;
    
    try {
      setSaving(true);
      // In a real implementation, you would collect the updated nodes and edges
      // from the editor interface and pass them to the API
      const updatedData = {
        name: map.title,
        // This is a placeholder - in a real implementation, you would get the actual updated nodes and edges
        nodes: [],
        edges: []
      };
      
      const updatedMap = await conceptMapsApi.updateMap(map.id, updatedData);
      if (updatedMap) {
        setMap(updatedMap);
        toast.success("Map saved successfully");
      } else {
        toast.error("Failed to save map");
      }
    } catch (error) {
      console.error("Error saving map:", error);
      toast.error("Failed to save map");
    } finally {
      setSaving(false);
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Description */}
      <Card className="p-4 mb-6">
        <p className="text-muted-foreground">{map?.description || "No description provided"}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <div>Nodes: {map?.nodes || 0}</div>
          <div>Created: {map?.createdAt ? new Date(map.createdAt).toLocaleDateString() : "Unknown"}</div>
          <div>Last edited: {map?.lastEdited ? new Date(map.lastEdited).toLocaleDateString() : "Unknown"}</div>
        </div>
      </Card>

      {/* SVG Container */}
      <Card className="p-6 overflow-auto bg-white">
        {map?.svgContent ? (
          <div ref={svgContainerRef} className="flex justify-center"></div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No visualization available for this concept map.</p>
          </div>
        )}
      </Card>
    </div>
  );
}