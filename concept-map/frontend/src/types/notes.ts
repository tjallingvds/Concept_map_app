// Interface for note responses
import {MapItem} from "../components/file-system.tsx";

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


export const mapNoteResponseToNoteItem = (response: NoteResponse): NoteItem => {
    // Generate share URL if the note is public and has a share_id
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
        tags: response.tags || []
    };
};


// Convert NoteItem to MapItem format for the FileSystem component
export const convertNoteToMapItem = (note: NoteItem): MapItem => {
    return {
        id: note.id,
        title: note.title,
        description: note.description || "",
        createdAt: note.createdAt,
        lastEdited: note.lastEdited,
        nodes: 0, // Notes don't have nodes count
        author: "Me",
        isFavorite: note.isFavorite,
        isPublic: note.isPublic,
        shareId: note.shareId,
        shareUrl: note.shareUrl
    }
}