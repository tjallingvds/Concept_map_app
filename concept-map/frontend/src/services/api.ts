import { MapItem } from "../components/file-system";

// API base URL
const API_URL = "http://localhost:5001/api";

// Interface for the API response from the backend
interface ConceptMapResponse {
  id: number;
  name: string;
  nodes: any[];
  edges: any[];
  user_id: number;
  image?: string;
  format?: string;
  is_public?: boolean;
  share_id?: string;
  created_at?: string;
  updated_at?: string;
  input_text?: string;
}

// Function to convert backend concept map format to frontend MapItem format
const mapResponseToMapItem = (response: ConceptMapResponse): MapItem => {
  // Properly format the image data based on format
  let svgContent = undefined;
  try {
    if (response.image) {
      // Check if the image already has a data URL prefix
      if (response.image.startsWith('data:')) {
        svgContent = response.image;
        console.log('Using existing data URL from backend');
      } else {
        // Add the appropriate data URL prefix based on format
        const mimeType = response.format === 'svg' ? 'image/svg+xml' : 'image/png';
        svgContent = `data:${mimeType};base64,${response.image}`;
        console.log(`Created data URL with format: ${mimeType}, data length: ${response.image.length}`);
      }
    } else {
      console.log('No image data found in response');
    }
  } catch (error) {
    console.error('Error processing image data:', error);
  }
  
  // Debug the svgContent
  if (svgContent) {
    console.log('SVG Content type:', typeof svgContent);
    console.log('SVG Content prefix:', svgContent.substring(0, 30));
  }

  // Generate share URL if the map is public and has a share_id
  let shareUrl = undefined;
  if (response.is_public && response.share_id) {
    shareUrl = `/shared/${response.share_id}`;
  }

  // Get actual node count from nodes array
  const nodeCount = response.nodes ? response.nodes.length : 0;

  return {
    id: response.id,
    title: response.name,
    description: response.input_text || "Concept map",
    createdAt: response.created_at || new Date().toISOString(),
    lastEdited: response.updated_at || new Date().toISOString(),
    nodes: nodeCount,
    isPublic: response.is_public || false,
    isFavorite: false, // Default to not favorite, can be updated from backend later
    svgContent: svgContent,
    shareId: response.share_id,
    shareUrl: shareUrl,
    inputText: response.input_text || ""
  };
};

// API service for concept maps
const conceptMapsApi = {
  // Get all concept maps for the current user
  getMyMaps: async (): Promise<MapItem[]> => {
    try {
      const response = await fetch(`${API_URL}/concept-maps`, {
        method: "GET",
        credentials: "include", // Include cookies for auth
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch concept maps");
      }

      const data: ConceptMapResponse[] = await response.json();
      return data.map(mapResponseToMapItem);
    } catch (error) {
      console.error("Error fetching concept maps:", error);
      return [];
    }
  },

  // Create a new concept map
  createMap: async (mapData: { title: string, description?: string, isPublic?: boolean, useTemplate?: boolean, mapType?: string, text?: string }): Promise<MapItem | null> => {
    try {
      // First generate the concept map if text is provided
      let generatedMap = null;
      if (mapData.text && mapData.mapType) {
        const generateResponse = await fetch(`${API_URL}/concept-map/generate`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: mapData.text,
            mapType: mapData.mapType,
            title: mapData.title
          }),
        });

        if (!generateResponse.ok) {
          throw new Error("Failed to generate concept map");
        }

        generatedMap = await generateResponse.json();
      }

      // Then create the map entry
      const response = await fetch(`${API_URL}/concept-maps`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: mapData.title,
          description: mapData.description || "",
          is_public: mapData.isPublic || false,
          nodes: generatedMap ? generatedMap.nodes || [] : [],
          edges: generatedMap ? generatedMap.edges || [] : [],
          image: generatedMap ? `data:${generatedMap.format === 'svg' ? 'image/svg+xml' : 'image/png'};base64,${generatedMap.image}` : null,
          format: generatedMap ? generatedMap.format : null,
          input_text: mapData.text || ""
        }),
      });


      if (!response.ok) {
        throw new Error("Failed to create concept map");
      }

      const data: ConceptMapResponse = await response.json();
      return mapResponseToMapItem(data);
    } catch (error) {
      console.error("Error creating concept map:", error);
      return null;
    }
  },

  // Get a specific concept map by ID
  getMap: async (id: number): Promise<MapItem | null> => {
    try {
      const response = await fetch(`${API_URL}/concept-maps/${id}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch concept map with id ${id}`);
      }

      const data: ConceptMapResponse = await response.json();
      return mapResponseToMapItem(data);
    } catch (error) {
      console.error(`Error fetching concept map ${id}:`, error);
      return null;
    }
  },

  // Update a concept map
  updateMap: async (id: number, updatedData: Partial<{ name: string, nodes: any[], edges: any[] }>): Promise<MapItem | null> => {
    try {
      const response = await fetch(`${API_URL}/concept-maps/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update concept map with id ${id}`);
      }

      const data: ConceptMapResponse = await response.json();
      return mapResponseToMapItem(data);
    } catch (error) {
      console.error(`Error updating concept map ${id}:`, error);
      return null;
    }
  },

  // Delete a concept map
  deleteMap: async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/concept-maps/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete concept map with id ${id}`);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting concept map ${id}:`, error);
      return false;
    }
  },

  // Placeholder for getting public maps (not yet implemented in backend)
  getPublicMaps: async (): Promise<MapItem[]> => {
    // This will need to be implemented in the backend
    console.log("Getting public maps (not yet implemented in backend)");
    return [];
  },

  // Placeholder for favoriting a map (not yet implemented in backend)
  toggleFavorite: async (id: number): Promise<boolean> => {
    // This will need to be implemented in the backend
    console.log(`Toggling favorite status for map ${id} (not yet implemented in backend)`);
    return true;
  },

  // Share a concept map to generate a shareable link
  shareMap: async (id: number): Promise<{ shareUrl: string, shareId: string }> => {
    try {
      const response = await fetch(`${API_URL}/concept-maps/${id}/share`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to share concept map with id ${id}`);
      }

      const data = await response.json();
      return {
        shareUrl: `${window.location.origin}${data.share_url}`,
        shareId: data.share_id
      };
    } catch (error) {
      console.error(`Error sharing concept map ${id}:`, error);
      throw error;
    }
  },
  
  // Get a shared concept map by share ID
  getSharedMap: async (shareId: string): Promise<MapItem | null> => {
    try {
      const response = await fetch(`${API_URL}/shared/concept-maps/${shareId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch shared concept map with id ${shareId}`);
      }

      const data: ConceptMapResponse = await response.json();
      return mapResponseToMapItem(data);
    } catch (error) {
      console.error(`Error fetching shared concept map ${shareId}:`, error);
      return null;
    }
  },
  
  // Get all saved maps for the current user
  getSavedMaps: async (): Promise<MapItem[]> => {
    try {
      const user_id = sessionStorage.getItem('user_id'); // Assuming user_id is stored in session storage
      if (!user_id) {
        throw new Error("User not authenticated");
      }
      
      const response = await fetch(`${API_URL}/users/${user_id}/saved-maps`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch saved concept maps");
      }

      const data: ConceptMapResponse[] = await response.json();
      return data.map(mapResponseToMapItem);
    } catch (error) {
      console.error("Error fetching saved concept maps:", error);
      return [];
    }
  },

  // Process uploaded document and extract text
  processDocument: async (file: File): Promise<{ text: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_URL}/api/process-document`, {
        method: 'POST',
        credentials: "include",
        body: formData,
        // Don't set Content-Type header with FormData (browser sets it automatically with boundary)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process document');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
};

export default conceptMapsApi;