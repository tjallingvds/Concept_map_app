import os
import secrets
from datetime import datetime
from http import HTTPStatus

from flask import Blueprint, request, jsonify

from auth_utils import requires_auth, get_auth0_user
from concept_map_generation.crud_routes import concept_maps
from models import Note, ConceptMap

notes_bp = Blueprint("notes", __name__, url_prefix='/api/notes')
notes = []  # List to store note objects


# Notes routes
@notes_bp.route('/', methods=['GET'])
@requires_auth
def get_notes():
    """Get all notes for the current user."""
    user = get_auth0_user()
    user_id = user.id

    # Filter notes by user_id and not deleted
    user_notes = [n.to_dict() for n in notes if n.user_id == user_id and not n.is_deleted]
    return jsonify(user_notes), HTTPStatus.OK


@notes_bp.route('/', methods=['POST'])
@requires_auth
def create_note():
    """Create a new note."""
    user = get_auth0_user()
    user_id = user.id

    data = request.json

    # Basic validation
    if not data or 'title' not in data:
        return jsonify({"error": "Missing required fields"}), HTTPStatus.BAD_REQUEST

    # Generate a unique share ID
    share_id = secrets.token_urlsafe(8)

    # Create a new note with a unique ID
    new_note = Note(
        title=data.get('title', 'Untitled Note'),
        content=data.get('content', {}),
        note_id=len(notes) + 1,
        user_id=user_id,
        is_public=data.get('is_public', False),
        share_id=share_id,
        is_favorite=data.get('is_favorite', False),
        tags=data.get('tags', []),
        description=data.get('description', '')
    )

    notes.append(new_note)
    return jsonify(new_note.to_dict()), HTTPStatus.CREATED


@notes_bp.route('/<int:note_id>', methods=['GET'])
@requires_auth
def get_note(note_id):
    """Get a specific note by ID."""
    user = get_auth0_user()
    user_id = user.id

    note = next((n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), HTTPStatus.NOT_FOUND

    return jsonify(note.to_dict()), HTTPStatus.OK


@notes_bp.route('/<string:share_id>', methods=['GET'])
def get_shared_note(share_id):
    """Get a shared note by share ID."""
    # This endpoint is public and doesn't require authentication
    note = next((n for n in notes if n.share_id == share_id and n.is_public and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Shared note not found or not public"}), HTTPStatus.NOT_FOUND

    return jsonify(note.to_dict()), HTTPStatus.OK


@notes_bp.route('/<int:note_id>', methods=['PUT'])
@requires_auth
def update_note(note_id):
    """Update a specific note."""
    user = get_auth0_user()
    user_id = user.id

    data = request.json

    note = next((n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), HTTPStatus.NOT_FOUND

    # Update the note fields
    if 'title' in data:
        note.title = data['title']
    if 'content' in data:
        note.content = data['content']
    if 'is_public' in data:
        note.is_public = data['is_public']
    if 'is_favorite' in data:
        note.is_favorite = data['is_favorite']
    if 'tags' in data:
        note.tags = data['tags']
    if 'description' in data:
        note.description = data['description']

    # Update the timestamp
    note.updated_at = datetime.utcnow()

    return jsonify(note.to_dict()), HTTPStatus.OK


@notes_bp.route('/<int:note_id>', methods=['DELETE'])
@requires_auth
def delete_note(note_id):
    """Delete a specific note (soft delete)."""
    user = get_auth0_user()
    user_id = user.id

    note = next((n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), HTTPStatus.NOT_FOUND

    # Mark the note as deleted (soft delete)
    note.is_deleted = True
    note.updated_at = datetime.utcnow()

    return jsonify({"message": f"Note '{note.title}' deleted successfully"}), HTTPStatus.OK


@notes_bp.route('/<int:note_id>/share', methods=['POST'])
@requires_auth
def share_note(note_id):
    """Generate or update a sharing link for a note."""
    user = get_auth0_user()
    user_id = user.id

    note = next((n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), HTTPStatus.NOT_FOUND

    data = request.json or {}

    # Update the note's sharing settings
    note.is_public = data.get('is_public', True)

    # Generate a new share ID if requested or if one doesn't exist
    if data.get('regenerate', False) or not note.share_id:
        note.share_id = secrets.token_urlsafe(8)

    # Create the sharing URL
    share_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/shared/notes/{note.share_id}"

    return jsonify({
        "share_id": note.share_id,
        "share_url": share_url,
        "is_public": note.is_public
    }), HTTPStatus.OK


@notes_bp.route('/<int:note_id>/convert', methods=['POST'])
@requires_auth
def convert_note_to_concept_map(note_id):
    """Convert a note to a concept map."""
    user = get_auth0_user()
    user_id = user.id

    note = next((n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), HTTPStatus.NOT_FOUND

    try:
        # Extract text content from the BlockNote format
        # This is a simplified approach - in a real implementation, you'd need
        # to parse the BlockNote JSON structure and extract meaningful text
        content_text = ""
        if isinstance(note.content, dict) and "content" in note.content:
            for block in note.content["content"]:
                if "content" in block and block["content"]:
                    for item in block["content"]:
                        if "text" in item:
                            content_text += item["text"] + " "

        # Fall back to title if content extraction fails
        if not content_text.strip():
            content_text = note.title

        # Import the text extraction function
        from concept_map_generation.mind_map import extract_concept_map_from_text

        # Process the note content to generate concepts and relationships
        concept_data = extract_concept_map_from_text(content_text)

        # Prepare nodes and edges
        nodes = []
        edges = []

        # Convert the concepts and relationships to nodes and edges
        for concept in concept_data.get("concepts", []):
            node = {
                "id": concept.get("id", f"c{len(nodes) + 1}"),
                "label": concept.get("name", "Unnamed Concept"),
                "description": concept.get("description", "")
            }
            nodes.append(node)

        for relationship in concept_data.get("relationships", []):
            edge = {
                "source": relationship.get("source", ""),
                "target": relationship.get("target", ""),
                "label": relationship.get("label", "relates to")
            }
            edges.append(edge)

        # Create a new concept map
        share_id = secrets.token_urlsafe(8)

        # Generate SVG representation if possible
        image = None
        format_type = None

        if nodes and edges:
            try:
                from concept_map_generation.mind_map import generate_concept_map_svg

                # Create a concept map structure
                concept_map_json = {
                    "nodes": nodes,
                    "edges": edges
                }

                # Generate the SVG
                image = generate_concept_map_svg(concept_map_json, "hierarchical")
                format_type = "svg"
            except Exception as img_error:
                print(f"Error generating SVG for concept map: {str(img_error)}")

        # Create the new concept map
        new_map = ConceptMap(
            name=f"From note: {note.title}",
            nodes=nodes,
            edges=edges,
            map_id=len(concept_maps) + 1,
            user_id=user_id,
            is_public=False,
            share_id=share_id,
            image=image,
            format=format_type
        )

        concept_maps.append(new_map)

        return jsonify({
            "message": "Note converted to concept map successfully",
            "concept_map": new_map.to_dict()
        }), HTTPStatus.CREATED

    except Exception as e:
        print(f"Error converting note to concept map: {str(e)}")
        return jsonify({"error": f"Failed to convert note to concept map: {str(e)}"}), HTTPStatus.INTERNAL_SERVER_ERROR


@notes_bp.route('/api/users/<int:user_id>/recent-notes', methods=['GET'])
@requires_auth
def get_recent_notes(user_id):
    """Get the most recent notes for a user."""
    user = get_auth0_user()
    session_user_id = user.id

    # Check if the user is requesting their own notes
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), HTTPStatus.FORBIDDEN

    # Get recent notes, sorted by updated_at
    user_notes = [n.to_dict() for n in notes if n.user_id == user_id and not n.is_deleted]
    recent_notes = sorted(user_notes, key=lambda x: x.get('updated_at', ''), reverse=True)[:5]

    return jsonify(recent_notes), HTTPStatus.OK


@notes_bp.route('/<int:user_id>/favorite-notes', methods=['GET'])
@requires_auth
def get_favorite_notes(user_id):
    """Get the favorite notes for a user."""
    user = get_auth0_user()
    session_user_id = user.id

    # Check if the user is requesting their own notes
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), HTTPStatus.FORBIDDEN

    # Get favorite notes
    favorite_notes = [n.to_dict() for n in notes if n.user_id == user_id and n.is_favorite and not n.is_deleted]

    return jsonify(favorite_notes), HTTPStatus.OK
