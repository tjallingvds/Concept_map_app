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
}

// Function to convert backend concept map format to frontend MapItem format
const mapResponseToMapItem = (response: ConceptMapResponse): MapItem => {
  return {
    id: response.id,
    title: response.name,
    description: response.nodes.length > 0 ? `A concept map with ${response.nodes.length} nodes` : "Empty concept map",
    createdAt: new Date().toISOString(), // The backend doesn't provide these timestamps yet
    lastEdited: new Date().toISOString(),
    nodes: response.nodes.length,
    isPublic: false, // Default to private, can be updated from backend later
    isFavorite: false // Default to not favorite, can be updated from backend later
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
  createMap: async (mapData: { title: string, description?: string, isPublic?: boolean, useTemplate?: boolean }): Promise<MapItem | null> => {
    try {
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
          nodes: [],
          edges: []
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

  // Placeholder for sharing a map (not yet implemented in backend)
  shareMap: async (id: number): Promise<boolean> => {
    // This will need to be implemented in the backend
    console.log(`Sharing map ${id} (not yet implemented in backend)`);
    return true;
  }
};

export default conceptMapsApi; 