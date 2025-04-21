from http import HTTPStatus

from flask import jsonify, Blueprint

from auth_utils import get_auth0_user, requires_auth
from concept_map_generation.crud_routes import concept_maps, users
from models import User, ConceptMap
from notes.routes import notes

user_bp = Blueprint('user', __name__, url_prefix='/api/user')


@user_bp.route("/recent-maps/", methods=["GET"])
@requires_auth
def get_recent_maps():
    # TODO: maybe it is better to just remove the user_id parameter?
    user = get_auth0_user()
    user_id = user.id

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    # Get user's maps, sorted by most recent first (in a real app, this would be by last modified date)
    user_maps = [
        m
        for m in concept_maps
        if m.get("user_id") == user_id and not m.get("deleted", False)
    ]

    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    # Limit to 5 most recent maps and format for the response

    # Get user's maps, sorted by most recent first
    user_maps = (
        ConceptMap.query.filter_by(user_id=user_id, is_deleted=False)
        .order_by(ConceptMap.updated_at.desc())
        .limit(5)
        .all()
    )

    # Format for the response
    recent_maps = []
    for map in user_maps[:5]:
        recent_maps.append(
            {
                "id": map["id"],
                "name": map["name"],
                "url": f"/maps/{map['id']}",
                "share_url": (
                    f"/shared/{map['share_id']}" if map.get("is_public") else None
                ),
            }
        )

    for map in user_maps:
        recent_maps.append({"id": map.id, "name": map.name, "url": f"/maps/{map.id}"})

    return jsonify({"maps": recent_maps}), HTTPStatus.OK


@user_bp.route("/saved-maps/", methods=["GET"])
@requires_auth
def get_saved_maps():
    user = get_auth0_user()
    user_id = user.id
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)

    if not user:
        return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND

    # Get all user's maps that aren't deleted
    user_maps = [
        m
        for m in concept_maps
        if m.get("user_id") == user_id and not m.get("deleted", False)
    ]

    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    return jsonify(user_maps), HTTPStatus.OK


@user_bp.route("/<int:user_id>/recent-notes/", methods=["GET"])
@requires_auth
def get_recent_notes(user_id):
    """Get the most recent notes for a user."""
    user = get_auth0_user()

    if user.id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), 403

    user_notes = [n.to_dict() for n in notes if n.user_id == user_id and not n.is_deleted]
    recent_notes = sorted(user_notes, key=lambda x: x.get("updated_at", ""), reverse=True)[:5]

    return jsonify(recent_notes), 200


@user_bp.route("/<int:user_id>/favorite-notes/", methods=["GET"])
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
