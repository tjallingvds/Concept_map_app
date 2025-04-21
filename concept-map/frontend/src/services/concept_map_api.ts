import { MapItem } from '../components/file-system';
import { API_URL, useAuthFetch } from './baseApi.ts';

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
  whiteboard_content?: any;
}

// Interface for note responses
interface NoteResponse {
  id: number;
  title: string;
  content: any;
  user_id: number;
  is_public: boolean;
  share_id?: string;
  created_at?: string;
  updated_at?: string;
  is_favorite: boolean;
  tags: string[];
  description?: string;
  is_deleted: boolean;
}

// Interface for frontend note items
export interface NoteItem {
  id: number;
  title: string;
  content: any;
  description?: string;
  createdAt: string;
  lastEdited: string;
  isPublic: boolean;
  isFavorite: boolean;
  shareId?: string;
  shareUrl?: string;
  tags: string[];
}

// Function to convert backend note to frontend format
const mapNoteResponseToNoteItem = (response: NoteResponse): NoteItem => {
  let shareUrl = undefined;
  if (response.is_public && response.share_id) {
    shareUrl = `${window.location.origin}/shared/notes/${response.share_id}`;
  }

  return {
    id: response.id,
    title: response.title,
    content: response.content,
    description: response.description,
    createdAt: response.created_at || new Date().toISOString(),
    lastEdited: response.updated_at || new Date().toISOString(),
    isPublic: response.is_public || false,
    isFavorite: response.is_favorite || false,
    shareId: response.share_id,
    shareUrl: shareUrl,
    tags: response.tags || [],
  };
};

// Add a function to directly visualize concept data
const visualizeConcepts = async (conceptData: any, mapType: string = 'mindmap'): Promise<any> => {
  try {
    const concepts = conceptData.concepts || [];
    const relationships = conceptData.relationships || [];
    const structure = conceptData.structure || {
      type: 'hierarchical',
      root: concepts.length > 0 ? concepts[0].id : 'c1',
    };

    if (!Array.isArray(concepts) || concepts.length === 0) {
      console.warn('API: Empty or invalid concepts array:', concepts);
      throw new Error('No valid concepts to visualize');
    }

    const response = await fetch(`${API_URL}/api/concept-map/debug/visualize-concepts`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ concepts, relationships, structure, mapType }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API: Failed to visualize concepts:', errorText);
      throw new Error(`Failed to visualize concepts (${response.status}): ${errorText}`);
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from visualization API');
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('API: Error visualizing concepts:', error);
    throw error;
  }
};

// Placeholder for additional note and concept map API functions...

let authFetch: (url: string, options?: RequestInit) => Promise<Response> = () => {
  throw new Error('authFetch not initialized');
};

export const setAuthFetch = (fetchFn: typeof fetch) => {
  authFetch = fetchFn;
};

/**
 * Hook to use the concept maps API with authentication
 */
export function useConceptMapsApi() {
  const fetchWithAuth = useAuthFetch();
  setAuthFetch(fetchWithAuth as typeof fetch);
  return {
    visualizeConcepts,
    // Add other concept map API methods here
  };
}

/**
 * Hook to use the notes API with authentication
 */
export function useNotesApi() {
  const fetchWithAuth = useAuthFetch();
  setAuthFetch(fetchWithAuth as typeof fetch);
  return {
    // Add notes-related API methods here
  };
}

export { visualizeConcepts };
export default { visualizeConcepts };
