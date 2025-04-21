import os
import secrets
import uuid
import json
import base64
from datetime import datetime, timedelta
from http import HTTPStatus

import google.generativeai as genai
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from werkzeug.utils import secure_filename

from models import ConceptMap, Edge, Node, Note, User, db
from auth_utils import get_auth0_user, requires_auth

# Concept map logic imports
from concept_map_generation.bubble_chart import process_text_for_bubble_chart
from concept_map_generation.mind_map import generate_concept_map
from concept_map_generation.ocr_concept_map import process_drawing_for_concept_map
from concept_map_generation.word_cloud import process_text_for_wordcloud
from document_processor import DocumentProcessor
import concept_map_generation.crud_routes  # noqa

# Blueprint routes
from auth.routes import auth_bp
from concept_map_generation.generation_routes import concept_map_bp
from debug.routes import debug_bp
from process.routes import process_bp
from notes.routes import notes_bp
from user.routes import user_bp

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

# Configure CORS
CORS(
    app,
    origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///concept_map.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(concept_map_bp)
app.register_blueprint(debug_bp)
app.register_blueprint(process_bp)
app.register_blueprint(user_bp)
app.register_blueprint(notes_bp)


@app.route("/api/test/concept-maps", methods=["GET"])
def test_get_concept_maps():
    if os.environ.get("FLASK_ENV") == "production":
        return jsonify({"error": "Test route disabled in production"}), 403
    try:
        return jsonify([
            {
                "id": 1,
                "name": "Test Map",
                "user_id": 1,
                "is_public": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "nodes": [],
                "edges": [],
                "format": "mindmap",
            }
        ]), 200
    except Exception as e:
        print(f"Error in test_get_concept_maps: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {str(e)}")

    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "true").lower() == "true")

# Health check endpoint
@app.route("/api/health/")
def health_check():
    return jsonify({"status": "healthy"}), HTTPStatus.OK


# Create database tables within application context
with app.app_context():
    db.create_all()


# Notes routes
@app.route("/api/notes", methods=["GET"])
@requires_auth
def get_notes():
    """Get all notes for the current user."""
    user = get_auth0_user()

    # Filter notes by user_id and not deleted
    user_notes = [n.to_dict() for n in notes if n.user_id == user.id and not n.is_deleted]
    return jsonify(user_notes), 200


@app.route("/api/notes", methods=["POST"])
@requires_auth
def create_note():
    """Create a new note."""
    user = get_auth0_user()

    data = request.json

    # Basic validation
    if not data or "title" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Generate a unique share ID
    share_id = secrets.token_urlsafe(8)

    # Create a new note with a unique ID
    new_note = Note(
        title=data.get("title", "Untitled Note"),
        content=data.get("content", {}),
        note_id=len(notes) + 1,
        user_id=user.id,
        is_public=data.get('is_public', False),
        share_id=share_id,
        is_favorite=data.get("is_favorite", False),
        tags=data.get("tags", []),
        description=data.get("description", ""),
    )

    notes.append(new_note)
    return jsonify(new_note.to_dict()), 201


@app.route("/api/notes/<int:note_id>", methods=["GET"])
@requires_auth
def get_note(note_id):
    """Get a specific note by ID."""
    user = get_auth0_user()       
    note = next((n for n in notes if n.id == note_id and n.user_id == user.id and not n.is_deleted), None)
    

    if not note:
        return jsonify({"error": "Note not found"}), 404

    return jsonify(note.to_dict()), 200


@app.route("/api/shared/notes/<string:share_id>", methods=["GET"])
def get_shared_note(share_id):
    """Get a shared note by share ID."""
    # This endpoint is public and doesn't require authentication
    note = next(
        (n for n in notes if n.share_id == share_id and n.is_public and not n.is_deleted), None
    )

    if not note:
        return jsonify({"error": "Shared note not found or not public"}), 404

    return jsonify(note.to_dict()), 200


@app.route("/api/notes/<int:note_id>", methods=["PUT"])
@requires_auth
def update_note(note_id):
    """Update a specific note."""
    user = get_auth0_user()
data = request.json

note = next((n for n in notes if n.id == note_id and n.user_id == user.id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), 404

    # Update the note fields
    if "title" in data:
        note.title = data["title"]
    if "content" in data:
        note.content = data["content"]
    if "is_public" in data:
        note.is_public = data["is_public"]
    if "is_favorite" in data:
        note.is_favorite = data["is_favorite"]
    if "tags" in data:
        note.tags = data["tags"]
    if "description" in data:
        note.description = data["description"]

    # Update the timestamp
    note.updated_at = datetime.utcnow()

    return jsonify(note.to_dict()), 200


@app.route("/api/notes/<int:note_id>", methods=["DELETE"])
@requires_auth
def delete_note(note_id):
    """Delete a specific note (soft delete)."""
    user = get_auth0_user()
note = next((n for n in notes if n.id == note_id and n.user_id == user.id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), 404

    # Mark the note as deleted (soft delete)
    note.is_deleted = True
    note.updated_at = datetime.utcnow()

    return jsonify({"message": f"Note '{note.title}' deleted successfully"}), 200


@app.route("/api/notes/<int:note_id>/share", methods=["POST"])
@requires_auth
def share_note(note_id):
    """Generate or update a sharing link for a note."""
    user = get_auth0_user()
note = next((n for n in notes if n.id == note_id and n.user_id == user.id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), 404

    data = request.json or {}

    # Update the note's sharing settings
    note.is_public = data.get("is_public", True)

    # Generate a new share ID if requested or if one doesn't exist
    if data.get("regenerate", False) or not note.share_id:
        note.share_id = secrets.token_urlsafe(8)

    # Create the sharing URL
    share_url = (
        f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/shared/notes/{note.share_id}"
    )

    return (
        jsonify({"share_id": note.share_id, "share_url": share_url, "is_public": note.is_public}),
        200,
    )


@app.route("/api/notes/<int:note_id>/convert", methods=["POST"])
@requires_auth
def convert_note_to_concept_map(note_id):
    """Convert a note to a concept map."""
    user = get_auth0_user()
note = next((n for n in notes if n.id == note_id and n.user_id == user.id and not n.is_deleted), None)

    if not note:
        return jsonify({"error": "Note not found"}), 404

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
                "id": concept.get("id", f"c{len(nodes)+1}"),
                "label": concept.get("name", "Unnamed Concept"),
                "description": concept.get("description", ""),
            }
            nodes.append(node)

        for relationship in concept_data.get("relationships", []):
            edge = {
                "source": relationship.get("source", ""),
                "target": relationship.get("target", ""),
                "label": relationship.get("label", "relates to"),
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
                concept_map_json = {"nodes": nodes, "edges": edges}

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
            user_id=user.id,
            is_public=False,
            share_id=share_id,
            image=image,
            format=format_type,
        )

        concept_maps.append(new_map)

        return (
            jsonify(
                {
                    "message": "Note converted to concept map successfully",
                    "concept_map": new_map.to_dict(),
                }
            ),
            201,
        )

    except Exception as e:
        print(f"Error converting note to concept map: {str(e)}")
        return jsonify({"error": f"Failed to convert note to concept map: {str(e)}"}), 500

@app.route("/api/users/<int:user_id>/recent-notes", methods=["GET"])
@requires_auth
def get_recent_notes(user_id):
    """Get the most recent notes for a user."""
    user = get_auth0_user()

    if user.id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), 403

    user_notes = [n.to_dict() for n in notes if n.user_id == user_id and not n.is_deleted]
    recent_notes = sorted(user_notes, key=lambda x: x.get("updated_at", ""), reverse=True)[:5]

    return jsonify(recent_notes), 200


@app.route("/api/users/<int:user_id>/favorite-notes", methods=["GET"])
@requires_auth
def get_favorite_notes(user_id):
    """Get the favorite notes for a user."""
    user = get_auth0_user()

    if user.id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), 403

    favorite_notes = [
        n.to_dict() for n in notes if n.user_id == user_id and n.is_favorite and not n.is_deleted
    ]

    return jsonify(favorite_notes), 200


# TODO: store templates in a database
mock_template_structures = {
    "simple": {
        "id": "simple",
        "name": "Simple Flowchart",
        "description": "A basic template for linear processes.",
        "nodes": [
            {"id": "n1", "label": "Start", "position": {"x": 100, "y": 50}},
            {"id": "n2", "label": "Process Step 1", "position": {"x": 100, "y": 150}},
            {"id": "n3", "label": "End", "position": {"x": 100, "y": 250}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "target": "n2", "label": "next"},
            {"id": "e2", "source": "n2", "target": "n3", "label": "finish"},
        ],
        "input_text": "Make a list of steps to complete the process.",
    },
    "mindmap": {
        "id": "mindmap",
        "name": "Mind Map Basic",
        "description": "Ideal for brainstorming and idea generation.",
        "nodes": [
            {"id": "center", "label": "Main Idea", "position": {"x": 400, "y": 300}},
            {"id": "branch1", "label": "Branch 1", "position": {"x": 200, "y": 200}},
            {"id": "branch2", "label": "Branch 2", "position": {"x": 600, "y": 200}},
            {"id": "branch3", "label": "Branch 3", "position": {"x": 400, "y": 450}},
        ],
        "edges": [
            {
                "id": "e1",
                "source": "center",
                "target": "branch1",
            },
            {"id": "e2", "source": "center", "target": "branch2"},
            {"id": "e3", "source": "center", "target": "branch3"},
        ],
        "input_text": "Central topic: Main Idea\nBranch: Branch 1\nBranch: Branch 2\nBranch: Branch 3",  # Optional simple text representation
    },
    "academic": {
        "id": "academic",
        "name": "Academic Study Map",
        "description": "Structured for organizing study notes and concepts.",
        "nodes": [
            {"id": "topic", "label": "Main Topic", "position": {"x": 300, "y": 100}},
            {"id": "sub1", "label": "Subtopic 1", "position": {"x": 100, "y": 250}},
            {"id": "sub2", "label": "Subtopic 2", "position": {"x": 500, "y": 250}},
            {"id": "detail1", "label": "Detail A", "position": {"x": 100, "y": 400}},
        ],
        "edges": [
            {"id": "e1", "source": "topic", "target": "sub1", "label": "includes"},
            {"id": "e2", "source": "topic", "target": "sub2", "label": "includes"},
            {"id": "e3", "source": "sub1", "target": "detail1", "label": "example"},
        ],
        "input_text": "Main Topic: [Your Topic Here]\nSubtopic 1: [First Subtopic]\nDetail A: [Detail for Subtopic 1]\nSubtopic 2: [Second Subtopic]",
    },
    "timeline": {
        "id": "timeline",
        "name": "Timeline",
        "description": "Visualize events or steps in chronological order.",
        "nodes": [
            {"id": "ev1", "label": "Event 1 (Date)", "position": {"x": 100, "y": 100}},
            {"id": "ev2", "label": "Event 2 (Date)", "position": {"x": 300, "y": 100}},
            {"id": "ev3", "label": "Event 3 (Date)", "position": {"x": 500, "y": 100}},
        ],
        "edges": [
            {"id": "e1", "source": "ev1", "target": "ev2", "label": "leads to"},
            {"id": "e2", "source": "ev2", "target": "ev3", "label": "leads to"},
        ],
        "input_text": "List the events in chronological order.",
    },
    "hierarchy": {
        "id": "hierarchy",
        "name": "Organizational Chart",
        "description": "Represent hierarchical structures easily.",
        "nodes": [
            {"id": "root", "label": "Top Level", "position": {"x": 300, "y": 50}},
            {"id": "mid1", "label": "Mid Level 1", "position": {"x": 150, "y": 150}},
            {"id": "mid2", "label": "Mid Level 2", "position": {"x": 450, "y": 150}},
            {"id": "leaf1", "label": "Leaf 1", "position": {"x": 150, "y": 250}},
        ],
        "edges": [
            {"id": "e1", "source": "root", "target": "mid1"},
            {"id": "e2", "source": "root", "target": "mid2"},
            {"id": "e3", "source": "mid1", "target": "leaf1"},
        ],
        "input_text": "Organize the information in a hierarchical structure.",
    },
}


@app.route("/api/templates/<string:template_id>", methods=["GET"])
def get_template_data(template_id):
    """Get the structure (nodes/edges/info) of a specific template."""
    print(f"Received request for template ID: {template_id}")  # For debugging

    # Find the template data in our mock dictionary
    template_data = mock_template_structures.get(template_id)

    if not template_data:
        print(f"Template not found: {template_id}")
        return jsonify({"error": "Template not found"}), 404

    # Return the found template data as JSON
    print(f"Returning data for template: {template_id}")
    return jsonify(template_data), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

