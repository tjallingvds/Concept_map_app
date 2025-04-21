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
}

// Function to convert backend concept map format to frontend MapItem format
export const mapResponseToMapItem = (response: ConceptMapResponse): MapItem => {
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
