import {API_URL, useAuthFetch} from "./baseApi.ts";
import {mapNoteResponseToNoteItem, NoteItem} from "../types/notes.ts";
import {MapItem} from "../components/file-system.tsx";
import {mapResponseToMapItem} from "../types/concept_map.ts";

// 🔑 Token-injected fetch function (injected from useAuthFetch)
let authFetch: typeof fetch = () => {
    throw new Error("authFetch not initialized");
};
export const setAuthFetch = (fetchFn: typeof fetch) => {
    authFetch = fetchFn;
};

// Function to convert backend note to frontend format


// API service for notes
const notesApi = {
    // Get all notes for the current user
    getNotes: async (): Promise<NoteItem[]> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch notes');
            }

            const data = await response.json();
            return data.map(mapNoteResponseToNoteItem);
        } catch (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
    },

    // Get a specific note by ID
    getNote: async (noteId: number): Promise<NoteItem> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/${noteId}/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch note');
            }

            const data = await response.json();
            return mapNoteResponseToNoteItem(data);
        } catch (error) {
            console.error(`Error fetching note ${noteId}:`, error);
            throw error;
        }
    },

    // Create a new note
    createNote: async (noteData: {
        title: string;
        content: any;
        description?: string;
        tags?: string[];
        is_public?: boolean;
        is_favorite?: boolean;
    }): Promise<NoteItem> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noteData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create note');
            }

            const data = await response.json();
            return mapNoteResponseToNoteItem(data);
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    // Update a note
    updateNote: async (noteId: number, noteData: {
        title?: string;
        content?: any;
        description?: string;
        tags?: string[];
        is_public?: boolean;
        is_favorite?: boolean;
    }): Promise<NoteItem> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/${noteId}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(noteData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update note');
            }

            const data = await response.json();
            return mapNoteResponseToNoteItem(data);
        } catch (error) {
            console.error(`Error updating note ${noteId}:`, error);
            throw error;
        }
    },

    // Delete a note
    deleteNote: async (noteId: number): Promise<{ message: string }> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/${noteId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete note');
            }

            return await response.json();
        } catch (error) {
            console.error(`Error deleting note ${noteId}:`, error);
            throw error;
        }
    },

    // Convert a note to a concept map
    convertNoteToConceptMap: async (noteId: number): Promise<MapItem> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/${noteId}/convert/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to convert note to concept map');
            }

            const data = await response.json();
            return mapResponseToMapItem(data.concept_map);
        } catch (error) {
            console.error(`Error converting note ${noteId} to concept map:`, error);
            throw error;
        }
    },

    // Get recent notes
    getRecentNotes: async (userId: number): Promise<NoteItem[]> => {
        try {
            const response = await authFetch(`${API_URL}/api/users/${userId}/recent-notes/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch recent notes');
            }

            const data = await response.json();
            return data.map(mapNoteResponseToNoteItem);
        } catch (error) {
            console.error('Error fetching recent notes:', error);
            throw error;
        }
    },

    // Get favorite notes
    getFavoriteNotes: async (userId: number): Promise<NoteItem[]> => {
        try {
            const response = await authFetch(`${API_URL}/api/users/${userId}/favorite-notes/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch favorite notes');
            }

            const data = await response.json();
            return data.map(mapNoteResponseToNoteItem);
        } catch (error) {
            console.error('Error fetching favorite notes:', error);
            throw error;
        }
    },

    // Generate a share link for a note
    shareNote: async (noteId: number, options: { is_public?: boolean; regenerate?: boolean } = {}): Promise<{
        share_id: string;
        share_url: string;
        is_public: boolean
    }> => {
        try {
            const response = await authFetch(`${API_URL}/api/notes/${noteId}/share/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(options),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to share note');
            }

            return await response.json();
        } catch (error) {
            console.error(`Error sharing note ${noteId}:`, error);
            throw error;
        }
    },
};


export function useNotesApi() {
    const fetchWithAuth = useAuthFetch();
    setAuthFetch(fetchWithAuth as typeof fetch); // Add type assertion
    return notesApi;
}
