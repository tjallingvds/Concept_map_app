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

// Add a function to directly visualize concept data
const visualizeConcepts = async (conceptData: any, mapType: string = 'mindmap'): Promise<any> => {
  try {
    console.log("API: Visualizing concepts directly");
    
    // Ensure we have valid data structure
    const concepts = conceptData.concepts || [];
    const relationships = conceptData.relationships || [];
    const structure = conceptData.structure || { 
      type: "hierarchical", 
      root: concepts.length > 0 ? concepts[0].id : "c1" 
    };
    
    // Validate concepts data
    if (!Array.isArray(concepts) || concepts.length === 0) {
      console.warn("API: Empty or invalid concepts array:", concepts);
      throw new Error("No valid concepts to visualize");
    }
    
    // Log request data for debugging
    console.log("API: Visualizing concepts with:", {
      conceptsCount: concepts.length,
      relationshipsCount: relationships.length,
      structureType: structure.type,
      structureRoot: structure.root,
      mapType
    });
    
    const response = await fetch(`${API_URL}/concept-map/debug/visualize-concepts`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        concepts: concepts,
        relationships: relationships,
        structure: structure,
        mapType
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API: Failed to visualize concepts:", errorText);
      throw new Error(`Failed to visualize concepts (${response.status}): ${errorText}`);
    }

    // Read response text first for debugging
    const responseText = await response.text();
    console.log("API: Visualization response received, length:", responseText.length);
    
    // Parse the response if it's not empty
    if (!responseText || responseText.trim() === '') {
      throw new Error("Empty response from visualization API");
    }
    
    const result = JSON.parse(responseText);
    console.log("API: Successfully visualized concepts, result has nodes:", result.nodes?.length || 0);
    
    return result;
  } catch (error) {
    console.error("API: Error visualizing concepts:", error);
    throw error;
  }
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
  createMap: async (mapData: { 
    title: string, 
    description?: string, 
    isPublic?: boolean, 
    useTemplate?: boolean, 
    mapType?: string, 
    text?: string,
    svgContent?: string,
    tldrawContent?: string,
    isDigitized?: boolean,
    conceptData?: any
  }): Promise<MapItem | null> => {
    try {
      // Check if this is a drawing type map
      const isDrawing = mapData.mapType === 'drawing';
      const hasDigitizedContent = mapData.isDigitized === true;
      
      console.log("API: Creating map with type:", mapData.mapType, 
        "isDrawing:", isDrawing, 
        "hasDigitizedContent:", hasDigitizedContent,
        "text length:", mapData.text?.length || 0,
        "svgContent length:", mapData.svgContent?.length || 0,
        "tldrawContent length:", mapData.tldrawContent?.length || 0,
        "has conceptData:", !!mapData.conceptData);
      
      // For drawings, SKIP the text generation step completely
      let generatedMap = null;
      
      // Special handling for digitized content with concept data
      if (isDrawing && hasDigitizedContent && mapData.conceptData) {
        try {
          console.log("API: Using digitized content - directly visualizing concepts", mapData.conceptData);
          
          // Ensure we have valid concepts data with proper structure
          const concepts = mapData.conceptData.concepts || [];
          const relationships = mapData.conceptData.relationships || [];
          const structure = mapData.conceptData.structure || { 
            type: "hierarchical", 
            root: concepts.length > 0 ? concepts[0].id : "c1" 
          };
          
          console.log("API: Concepts:", concepts);
          console.log("API: Relationships:", relationships);
          console.log("API: Structure:", structure);
          
          // Call the visualization endpoint directly
          generatedMap = await visualizeConcepts({
            concepts: concepts,
            relationships: relationships,
            structure: structure
          }, mapData.mapType);
          
          console.log("API: Got visualization result with image length:", generatedMap.image?.length || 0);
        } catch (error) {
          console.error("API: Failed to visualize concepts, falling back to synthetic map:", error);
          
          // Ensure we have valid concepts data
          const concepts = mapData.conceptData.concepts || [];
          const relationships = mapData.conceptData.relationships || [];
          
          // Fallback to synthetic map
          generatedMap = {
            nodes: concepts.map((concept: any) => ({
              id: concept.id,
              label: concept.name,
              description: concept.description || ""
            })),
            edges: relationships.map((rel: any) => ({
              source: rel.source,
              target: rel.target,
              label: rel.label || "relates to"
            })),
            format: "svg",
            image: mapData.svgContent
          };
        }
      }
      // Regular text-based generation 
      else if (mapData.text && mapData.text.trim() !== '' && !isDrawing) {
        console.log("API: Generating concept map from text via API");
        try {
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
            const errorText = await generateResponse.text();
            console.error("API: Failed to generate concept map:", errorText);
            throw new Error(`Failed to generate concept map visualization (${generateResponse.status}): ${errorText}`);
          }

          // Parse JSON safely
          try {
            const responseText = await generateResponse.text();
            if (!responseText || responseText.trim() === '') {
              throw new Error("Empty response from map generation API");
            }
            
            generatedMap = JSON.parse(responseText);
            console.log("API: Successfully generated map from text");
          } catch (error) {
            console.error("API: Error parsing response:", error);
            throw new Error("Invalid JSON response from server");
          }
        } catch (error) {
          console.error("API: Error in concept map generation:", error);
          throw error;
        }
      } else if (isDrawing) {
        console.log("API: Skipping text generation for drawing type map");
      }

      // For drawing type, use the provided SVG content
      let imageContent: string | null = null;
      
      if (isDrawing) {
        if (mapData.svgContent && hasDigitizedContent) {
          console.log("API: Using digitized SVG content for drawing");
          // Check if it's a PNG data URL
          if (mapData.svgContent.startsWith('data:image/png')) {
            console.log("API: Image is already in PNG format");
            imageContent = mapData.svgContent;
          } else {
            console.log("API: Converting SVG content to PNG for compatibility");
            try {
              // Convert to PNG if it's an SVG
              const img = new Image();
              // Store the SVG content to ensure it doesn't become undefined
              const originalSvgContent = mapData.svgContent || '';
              img.src = originalSvgContent;
              
              // Create a promise to wait for image loading
              const pngContent = await new Promise<string>((resolve, reject) => {
                img.onload = () => {
                  try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width || 800;
                    canvas.height = img.height || 600;
                    const ctx = canvas.getContext('2d', { alpha: false });
                    
                    if (ctx) {
                      // Draw with white background
                      ctx.fillStyle = 'white';
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(img, 0, 0);
                      
                      // Convert to PNG
                      const pngUrl = canvas.toDataURL('image/png', 1.0);
                      resolve(pngUrl);
                    } else {
                      // Fallback to original content
                      resolve(originalSvgContent);
                    }
                  } catch (error) {
                    console.error("API: Error converting to PNG:", error);
                    resolve(originalSvgContent); // Fallback to original
                  }
                };
                img.onerror = () => {
                  console.error("API: Failed to load image for conversion");
                  resolve(originalSvgContent); // Fallback to original
                };
              });
              
              imageContent = pngContent;
            } catch (error) {
              console.error("API: Error in PNG conversion:", error);
              imageContent = mapData.svgContent; // Fallback to original
            }
          }
        } else if (mapData.tldrawContent) {
          // Similar conversion for tldrawContent
          console.log("API: Using TLDraw content for drawing");
          imageContent = mapData.tldrawContent;
        } else {
          console.warn("API: No SVG content for drawing type");
          // Create a simple empty SVG as fallback
          imageContent = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="white"/><text x="50%" y="50%" font-family="Arial" font-size="20" text-anchor="middle">Empty Drawing</text></svg>')}`;
        }
      } else if (mapData.svgContent) {
        console.log("API: Using SVG content");
        imageContent = mapData.svgContent;
      } else if (generatedMap && generatedMap.image) {
        console.log("API: Using generated map image");
        imageContent = `data:${generatedMap.format === 'svg' ? 'image/svg+xml' : 'image/png'};base64,${generatedMap.image}`;
      } else {
        console.warn("API: No image content available");
      }
      
      if (imageContent) {
        console.log("API: Image content type:", typeof imageContent, 
          "length:", imageContent.length,
          "starts with:", imageContent.substring(0, 30));
      } else {
        console.warn("API: No image content to save");
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
          // Use nodes and edges from generatedMap or from concept data if available
          nodes: generatedMap && generatedMap.nodes && generatedMap.nodes.length > 0 ? generatedMap.nodes : 
                 (isDrawing && hasDigitizedContent && mapData.conceptData && mapData.conceptData.concepts) ? 
                   mapData.conceptData.concepts.map((c: any) => ({
                     id: c.id,
                     label: c.name,
                     description: c.description || ""
                   })) : [],
          edges: generatedMap && generatedMap.edges && generatedMap.edges.length > 0 ? generatedMap.edges : 
                 (isDrawing && hasDigitizedContent && mapData.conceptData && mapData.conceptData.relationships) ? 
                   mapData.conceptData.relationships.map((r: any) => ({
                     source: r.source,
                     target: r.target,
                     label: r.label || "relates to"
                   })) : [],
          image: imageContent,
          format: (isDrawing || mapData.svgContent) ? 'svg' : (generatedMap ? generatedMap.format : 'svg'),
          input_text: mapData.text || ""
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API: Failed to create concept map:", errorText);
        throw new Error("Failed to create concept map");
      }

      const data: ConceptMapResponse = await response.json();
      return mapResponseToMapItem(data);
    } catch (error) {
      console.error("API: Error creating concept map:", error);
      throw error;
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
  updateMap: async (id: number, updatedData: Partial<{ 
    name: string, 
    nodes: any[], 
    edges: any[],
    image?: string,
    format?: string,
    input_text?: string,
    is_public?: boolean
  }>): Promise<MapItem | null> => {
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