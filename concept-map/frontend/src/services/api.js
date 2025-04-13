// API functions for document processing
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

async function processDocument(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/api/process-document`, {
      method: 'POST',
      body: formData,
      credentials: 'include',  // Important! Include credentials for session cookie
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

// Add createMap function stub to match usage in create-map-dialog.tsx
async function createMap(mapData) {
  try {
    // Transform the data to match what the backend expects
    const transformedData = {
      name: mapData.title,
      input_text: mapData.text,
      is_public: mapData.isPublic,
      nodes: [],  // Will be generated on the backend
      edges: [],  // Will be generated on the backend
      format: mapData.mapType || "mindmap"
    };
    
    // Step 1: Create the map entry in the database
    const response = await fetch(`${API_URL}/api/concept-maps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transformedData),
      credentials: 'include'  // Important! Include credentials for session cookie
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create map');
    }
    
    const newMap = await response.json();
    
    // Step 2: Generate the concept map visualization
    const generateResponse = await fetch(`${API_URL}/api/concept-map/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: mapData.text,
        mapType: mapData.mapType || "mindmap",
        title: mapData.title
      }),
      credentials: 'include'
    });
    
    if (!generateResponse.ok) {
      console.error("Failed to generate concept map visualization");
      return newMap; // Return the map without visualization
    }
    
    const visualization = await generateResponse.json();
    
    // Format the SVG data properly for use in the frontend
    // Format the image data as a data URL if it's base64 encoded
    let formattedImage = "";
    if (visualization && (visualization.image || visualization.svg)) {
      const imageData = visualization.image || visualization.svg;
      formattedImage = imageData.startsWith('data:') 
        ? imageData 
        : `data:image/svg+xml;base64,${imageData}`;
    }
    
    // Step 3: Update the map with the visualization data
    if (formattedImage) {
      const updateResponse = await fetch(`${API_URL}/api/concept-maps/${newMap.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newMap,
          image: formattedImage,
          svgContent: formattedImage
        }),
        credentials: 'include'
      });
      
      if (updateResponse.ok) {
        const updatedMap = await updateResponse.json();
        return {
          ...updatedMap,
          svgContent: formattedImage
        };
      }
    }
    
    return {
      ...newMap,
      svgContent: formattedImage
    };
  } catch (error) {
    console.error('Error creating map:', error);
    throw error;
  }
}

// Get all maps for the current user
async function getMyMaps() {
  try {
    const response = await fetch(`${API_URL}/api/concept-maps`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch maps');
    }
    
    const maps = await response.json();
    
    // Transform the API response to match the expected MapItem format
    return maps.map(map => ({
      id: map.id,
      title: map.name,
      description: map.description || '',
      createdAt: map.created_at,
      lastEdited: map.updated_at,
      nodes: map.nodes?.length || 0,
      isFavorite: map.is_favorite || false,
      isPublic: map.is_public || false,
      shareId: map.share_id,
      shareUrl: map.share_id ? `${window.location.origin}/shared/${map.share_id}` : null
    }));
  } catch (error) {
    console.error('Error fetching maps:', error);
    throw error;
  }
}

// Get a specific map by ID
async function getMap(mapId) {
  try {
    const response = await fetch(`${API_URL}/api/concept-maps/${mapId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch map');
    }
    
    const mapData = await response.json();
    
    // Format SVG content if it exists but isn't already formatted as a data URL
    let formattedSvg = mapData.svgContent || mapData.image || "";
    if (formattedSvg && !formattedSvg.startsWith('data:')) {
      formattedSvg = `data:image/svg+xml;base64,${formattedSvg}`;
    }
    
    // Map backend field names to frontend expected fields
    return {
      ...mapData,
      // Ensure both field naming conventions are available
      inputText: mapData.input_text || "",  // Map backend field to frontend expected field
      input_text: mapData.input_text || "",  // Keep original field
      svgContent: formattedSvg  // Ensure SVG is properly formatted
    };
  } catch (error) {
    console.error(`Error fetching map ${mapId}:`, error);
    throw error;
  }
}

// Toggle favorite status for a map
async function toggleFavorite(mapId) {
  try {
    const map = await getMap(mapId);
    
    const response = await fetch(`${API_URL}/api/concept-maps/${mapId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...map,
        is_favorite: !map.is_favorite
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to toggle favorite');
    }
    
    return true;
  } catch (error) {
    console.error(`Error toggling favorite for map ${mapId}:`, error);
    throw error;
  }
}

// Share a map by making it public
async function shareMap(mapId) {
  try {
    const response = await fetch(`${API_URL}/api/concept-maps/${mapId}/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to share map');
    }
    
    const result = await response.json();
    
    // Add the frontend domain to the share URL to make it a complete URL
    const frontendOrigin = window.location.origin;
    const fullShareUrl = `${frontendOrigin}${result.share_url}`;
    
    console.log('Share response from backend:', result);
    console.log('Constructed full share URL:', fullShareUrl);
    
    return {
      shareId: result.share_id,
      shareUrl: fullShareUrl
    };
  } catch (error) {
    console.error(`Error sharing map ${mapId}:`, error);
    throw error;
  }
}

// Delete a map
async function deleteMap(mapId) {
  try {
    const response = await fetch(`${API_URL}/api/concept-maps/${mapId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete map');
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting map ${mapId}:`, error);
    throw error;
  }
}

// Get a shared map by share ID (for public viewing)
async function getSharedMap(shareId) {
  try {
    console.log(`Fetching shared map with ID: ${shareId}`);
    const response = await fetch(`${API_URL}/api/shared/concept-maps/${shareId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
      // No credentials needed for public maps
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch shared map');
    }
    
    const mapData = await response.json();
    console.log('Shared map data received:', mapData);
    
    // Format SVG content if it exists but isn't already formatted as a data URL
    let formattedSvg = mapData.image || "";
    if (formattedSvg && !formattedSvg.startsWith('data:')) {
      const format = mapData.format || 'svg';
      const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';
      formattedSvg = `data:${mimeType};base64,${formattedSvg}`;
    }
    
    // Transform to match frontend expected format
    return {
      id: mapData.id,
      title: mapData.name,
      description: mapData.input_text || "",
      createdAt: mapData.created_at,
      lastEdited: mapData.updated_at,
      nodes: mapData.nodes?.length || 0,
      svgContent: formattedSvg,
      inputText: mapData.input_text || "",
      isPublic: true,
      shareId: mapData.share_id,
      shareUrl: mapData.share_id ? `${window.location.origin}/shared/${mapData.share_id}` : null
    };
  } catch (error) {
    console.error(`Error fetching shared map ${shareId}:`, error);
    throw error;
  }
}

// Export an object with all API functions
export default {
  processDocument,
  createMap,
  getMyMaps,
  getMap,
  toggleFavorite,
  shareMap,
  deleteMap,
  getSharedMap
};