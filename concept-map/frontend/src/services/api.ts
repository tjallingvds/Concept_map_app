import {MapItem} from "../components/file-system";
import {API_URL, authFetch, useAuthFetch} from "./baseApi.ts";


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
    is_favorite?: boolean;
    share_id?: string;
    share_url?: string;
    created_at?: string;
    updated_at?: string;
    input_text?: string;
    svgContent?: string;
    description?: string;
    learning_objective?: string;
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
            } else {
                // Add the appropriate data URL prefix based on format
                const mimeType = response.format === 'svg' ? 'image/svg+xml' : 'image/png';
                svgContent = `data:${mimeType};base64,${response.image}`;
            }
        } else if (response.svgContent) {
            // Use svgContent if available
            svgContent = response.svgContent;
        }
    } catch (error) {
        console.error('Error processing image data:', error);
    }

    // Generate share URL if the map is public and has a share_id
    let shareUrl = undefined;
    if (response.is_public && response.share_id) {
        shareUrl = response.share_url || `${window.location.origin}/shared/${response.share_id}`;
    }

    // Get actual node count from nodes array
    const nodeCount = response.nodes ? response.nodes.length : 0;

    // Extract learning objective from response
    let description = response.description || "";

    // Sanitize description if it contains HTML or SVG
    if (description && (description.includes('<') || description.includes('svg]') || description.includes('[&amp;_svg]'))) {
        description = description
            .replace(/<[^>]*>/g, '')  // Remove HTML tags
            .replace(/svg\]:[^>]*>/g, '') // Remove svg attribute content
            .replace(/\[&amp;_svg\][^<]*/g, '') // Remove more svg content
            .trim();
    }

    // Prioritize the dedicated learning_objective field
    let learningObjective = response.learning_objective || undefined;

    // Sanitize learning objective if it exists
    if (learningObjective) {
        // Comprehensive sanitization for HTML tags and svg-related content
        learningObjective = learningObjective
            .replace(/<[^>]*>/g, '')  // Remove HTML tags
            .replace(/svg\]:[^>]*>/g, '') // Remove svg attribute content
            .replace(/\[&amp;_svg\][^<]*/g, '') // Remove more svg content
            .trim();
    }

    // If learning objective is not available, try to extract it from the description or input text
    if (!learningObjective) {
        // First try from description
        if (description) {
            // Check if description has learning objective format (with delimiter)
            const parts = description.split(' - ');
            if (parts.length > 1) {
                learningObjective = parts[0].trim();
                description = parts.slice(1).join(' - ').trim();
            }
        }

        // If still no learning objective, try from input text as last resort
        if (!learningObjective && response.input_text) {
            const inputLines = response.input_text.split('\n').filter(line => line.trim().length > 0);
            if (inputLines.length > 0) {
                const firstLine = inputLines[0].trim();
                if (firstLine.length < 100) { // Only use it if reasonably short
                    learningObjective = firstLine;
                }
            }
        }
    }

    return {
        id: response.id,
        title: response.name,
        description: description,
        learningObjective: learningObjective,
        createdAt: response.created_at || new Date().toISOString(),
        lastEdited: response.updated_at || new Date().toISOString(),
        nodes: nodeCount,
        isPublic: response.is_public || false,
        isFavorite: response.is_favorite || false,
        svgContent: svgContent,
        shareId: response.share_id,
        shareUrl: shareUrl,
        inputText: response.input_text || ""
    };
};

// Add a function to directly visualize concept data
const visualizeConcepts = async (conceptData: any, mapType: string = 'mindmap'): Promise<any> => {
    try {
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

        const response = await fetch(`${API_URL}/api/concept-map/debug/visualize-concepts`, {
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

        // Parse the response if it's not empty
        if (!responseText || responseText.trim() === '') {
            throw new Error("Empty response from visualization API");
        }

        const result = JSON.parse(responseText);

        return result;
    } catch (error) {
        console.error("API: Error visualizing concepts:", error);
        throw error;
    }
};


// 🔑 Token-injected fetch function (injected from useAuthFetch)
let authFetch: typeof fetch = () => {
    throw new Error("authFetch not initialized");
};

// ✅ One-time setter to be called from useConceptMapsApi
export const setAuthFetch = (fetchFn: typeof fetch) => {
    authFetch = fetchFn;
};


// API service for concept maps
const conceptMapsApi = {
    // Process uploaded document and extract text
    processDocument: async (file: File): Promise<{ text: string }> => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/process-document`, {
                method: 'POST',
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
    },

    // Get all concept maps for the current user
    getMyMaps: async (): Promise<MapItem[]> => {
        try {
            const response = await authFetch(`${API_URL}/api/concept-maps`, {
                method: "GET",
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
        learningObjective?: string,
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
            const hasTextInput = mapData.text && mapData.text.length > 0;

            // For drawings, SKIP the text generation step completely
            let generatedMap = null;
            let imageContent = null;

            // Special handling for digitized content with concept data
            if (isDrawing && hasDigitizedContent && mapData.conceptData) {
                // Use the SVG content if available
                imageContent = mapData.svgContent;
            }
            // For text input where we want to generate a mind map
            else if (hasTextInput && !isDrawing) {
                try {
                    // Generate the concept map from text
                    //TODO: I can not find this endpoint on backend
                    const genResponse = await authFetch(`${API_URL}/api/concept-map/generate`, {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            text: mapData.text,
                            mapType: mapData.mapType || "mindmap",
                            title: mapData.title,
                        }),
                    });

                    if (genResponse.ok) {
                        generatedMap = await genResponse.json();
                        if (generatedMap && generatedMap.image) {
                            // Format SVG content as data URL if needed
                            if (generatedMap.format === 'svg' && !generatedMap.image.startsWith('data:')) {
                                imageContent = `data:image/svg+xml;base64,${generatedMap.image}`;
                            } else {
                                imageContent = generatedMap.image;
                            }
                        }
                    } else {
                        console.error("API: Failed to generate mind map from text");
                    }
                } catch (genError) {
                    console.error("API: Error generating mind map:", genError);
                    // Continue without the generated map
                }
            }

            // Then create the map entry
            const requestBody = {
                name: mapData.title,
                description: mapData.description || "",
                learning_objective: mapData.learningObjective || "",
                input_text: mapData.text || "",
                is_public: mapData.isPublic || false,
                // Include nodes and edges from conceptData if available
                ...(isDrawing && hasDigitizedContent && mapData.conceptData ? {
                    // Properly extract nodes and edges from conceptData
                    nodes: mapData.conceptData.nodes || [],
                    edges: mapData.conceptData.edges || []
                } : {
                    // Otherwise fall back to generated map data or empty arrays
                    nodes: generatedMap?.nodes || [],
                    edges: generatedMap?.edges || []
                }),
                image: imageContent,
                format: (isDrawing || mapData.svgContent) ? 'svg' : (generatedMap ? generatedMap.format : 'svg')
            };

            const response = await authFetch(`${API_URL}/api/concept-maps`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody)
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
            const response = await authFetch(`${API_URL}/api/concept-maps/${id}`, {
                method: "GET",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch concept map with id ${id}`);
            }

            const mapData: ConceptMapResponse = await response.json();

            // Format SVG content if it exists but isn't already formatted as a data URL
            if (mapData.image && !mapData.image.startsWith('data:')) {
                const format = mapData.format || 'svg';
                const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';
                mapData.image = `data:${mimeType};base64,${mapData.image}`;
            }

            return mapResponseToMapItem(mapData);
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
            const response = await authFetch(`${API_URL}/api/concept-maps/${id}`, {
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
            const response = await authFetch(`${API_URL}/api/concept-maps/${id}`, {
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

    // Get all public maps
    getPublicMaps: async (): Promise<MapItem[]> => {
        // This will need to be implemented in the backend
        console.log("Getting public maps (not yet implemented in backend)");
        return [];
    },

    // Toggle favorite status for a map
    toggleFavorite: async (id: number): Promise<boolean> => {
        try {
            const map = await conceptMapsApi.getMap(id);
            if (!map) {
                throw new Error(`Map with id ${id} not found`);
            }

            const response = await authFetch(`${API_URL}/api/concept-maps/${id}`, {
                method: "PUT",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    is_favorite: !map.isFavorite
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to toggle favorite status for map with id ${id}`);
            }

            return true;
        } catch (error) {
            console.error(`Error toggling favorite for map ${id}:`, error);
            return false;
        }
    },

    // Share a concept map to generate a shareable link
    shareMap: async (id: number): Promise<{ shareUrl: string, shareId: string }> => {
        try {
            const response = await authFetch(`${API_URL}/api/concept-maps/${id}/share`, {
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

            // Construct full URL with origin
            const fullShareUrl = data.share_url ?
                (data.share_url.startsWith('http') ? data.share_url : `${window.location.origin}${data.share_url}`) :
                `${window.location.origin}/shared/${data.share_id}`;

            return {
                shareUrl: fullShareUrl,
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
            const response = await authFetch(`${API_URL}/api/shared/concept-maps/${shareId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                // No credentials needed for public maps
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch shared concept map with id ${shareId}`);
            }

            const mapData: ConceptMapResponse = await response.json();

            // Format SVG content if it exists but isn't already formatted as a data URL
            if (mapData.image && !mapData.image.startsWith('data:')) {
                const format = mapData.format || 'svg';
                const mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';
                mapData.image = `data:${mimeType};base64,${mapData.image}`;
            }

            return mapResponseToMapItem({
                ...mapData,
                is_public: true
            });
        } catch (error) {
            console.error(`Error fetching shared concept map ${shareId}:`, error);
            return null;
        }
    },

    // Get all saved maps for the current user
    getSavedMaps: async (): Promise<MapItem[]> => {
        try {
            const response = await authFetch(`${API_URL}/api/user/saved-maps`, {
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

    // Direct access to the visualization function
    visualizeConcepts
};

export function useConceptMapsApi() {
    const authFetch = useAuthFetch();
    setAuthFetch(authFetch); // 🔥 inject the token-enabled fetch

    return conceptMapsApi;
}