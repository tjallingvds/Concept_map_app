// Interface for the API response from the backend
import {MapItem} from "../components/file-system.tsx";

export interface ConceptMapResponse {
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
    whiteboard_content?: any;
}

// Function to convert backend concept map format to frontend MapItem format
export const mapResponseToMapItem = (response: ConceptMapResponse): MapItem => {
    // Use sensible defaults for description
    let description = response.description;
    if (!description) {
        // Generate a default description based on the number of nodes/concepts
        const nodeCount = response.nodes ? response.nodes.length : 0;
        description = `This concept map contains ${nodeCount} concepts.`;
    }

    // Use sensible defaults for learning objective
    let learningObjective = response.learning_objective;
    
    // If we have a precomputed node count, use that; otherwise count the nodes
    let nodeCount = response.nodes ? response.nodes.length : 0;
    
    // Handle SVG content if present
    let svgContent: string | undefined;
    if (response.image && response.format === 'svg') {
        svgContent = response.image;
    }
    
    // Generate share URL if we have a share ID
    let shareUrl: string | undefined;
    if (response.share_id) {
        // Use environment variable for the base URL if available
        const baseUrl = import.meta.env.VITE_SHARE_URL_BASE || window.location.origin;
        shareUrl = `${baseUrl}/s/${response.share_id}`;
    }

    return {
        id: response.id,
        title: response.name,
        description: description,
        learningObjective: learningObjective,
        createdAt: response.created_at || new Date().toISOString(),
        lastEdited: response.updated_at || new Date().toISOString(),
        nodes: nodeCount,
        edges: response.edges,
        isPublic: response.is_public || false,
        isFavorite: response.is_favorite || false,
        svgContent: svgContent,
        shareId: response.share_id,
        shareUrl: shareUrl,
        inputText: response.input_text || "",
        format: response.format,
        whiteboardContent: response.whiteboard_content
    };
};
