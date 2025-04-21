import secrets
import uuid
from datetime import datetime
from http import HTTPStatus

from flask import request, jsonify

from auth_utils import requires_auth, get_auth0_user
from concept_map_generation.generation_routes import concept_map_bp
from models import db, ConceptMap, Node, Edge, User

# NOTE: This list is kept for backward compatibility but is no longer used.
# All data is now stored in the database.
concept_maps = []
users = []  # List to store user objects


# Concept Map routes
@concept_map_bp.route("/", methods=["GET"])
@requires_auth
def get_concept_maps():
    user = get_auth0_user()

    # Filter maps by user_id and not deleted
    user_maps = ConceptMap.query.filter_by(user_id=user.id, is_deleted=False).all()
    return jsonify([map.to_dict() for map in user_maps]), HTTPStatus.OK


@concept_map_bp.route("/", methods=["POST"])
@requires_auth
def create_concept_map():
    user = get_auth0_user()

    data = request.json

    # Basic validation
    if not data or "name" not in data:
        return jsonify({"error": "Missing required fields"}), HTTPStatus.BAD_REQUEST

    # Generate a unique share ID
    share_id = secrets.token_urlsafe(8)

    # Check if we need to process the input text to generate nodes and edges
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    # If nodes and edges are not provided but we have input text,
    # process it to generate nodes and edges
    if not nodes and not edges and "input_text" in data and data["input_text"]:
        try:
            # Import the text extraction function
            from concept_map_generation.mind_map import extract_concept_map_from_text

            # Process the input text
            concept_data = extract_concept_map_from_text(data["input_text"])

            # Convert the concepts and relationships to nodes and edges
            for concept in concept_data.get("concepts", []):
                node = {
                    "id": concept.get("id", f"c{len(nodes) + 1}"),
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

            # If we have nodes and edges generated, also create an SVG image
            if nodes and edges:
                try:
                    from concept_map_generation.mind_map import generate_concept_map_svg

                    # Create a concept map structure
                    concept_map_json = {"nodes": nodes, "edges": edges}

                    # Generate the SVG
                    svg_b64 = generate_concept_map_svg(concept_map_json, "hierarchical")
                    data["image"] = svg_b64
                    data["format"] = "svg"
                except Exception as img_error:
                    print(f"Error generating SVG for concept map: {str(img_error)}")

        except Exception as e:
            print(f"Error processing input text for concept map: {str(e)}")
            # Continue without generating nodes and edges

    # Create a new concept map using SQLAlchemy model
    new_map = ConceptMap(
        name=data["name"],
        user_id=user.id,
        image=data.get("image"),
        format=data.get("format", "mindmap"),
        is_public=data.get("is_public", False),
        is_favorite=data.get("is_favorite", False),
        share_id=share_id,
        input_text=data.get("input_text", ""),
        description=data.get("description", ""),
        learning_objective=data.get("learning_objective", ""),
        whiteboard_content=data.get("whiteboard_content"),
    )

    # For whiteboard maps, log that we're saving the content
    if data.get("format") == "handdrawn" and "whiteboard_content" in data:
        print(f"Creating whiteboard map with whiteboard content, size: {len(str(data['whiteboard_content']))}")

    # Add nodes if they exist
    if nodes:
        for node_data in nodes:
            node = Node(
                concept_map=new_map,
                label=node_data.get("label", ""),
                x=node_data.get("x", 0),
                y=node_data.get("y", 0),
            )
            db.session.add(node)

    # Add edges if they exist
    if edges:
        for edge_data in edges:
            edge = Edge(
                concept_map=new_map,
                source_id=edge_data.get("source"),
                target_id=edge_data.get("target"),
                label=edge_data.get("label", ""),
            )
            db.session.add(edge)

    # Add and commit everything to the database
    db.session.add(new_map)
    db.session.commit()

    # Return the newly created map
    return (
        jsonify(
            {
                "id": new_map.id,
                "name": new_map.name,
                "image": new_map.image,
                "format": new_map.format,
                "is_public": new_map.is_public,
                "is_favorite": new_map.is_favorite,
                "share_id": new_map.share_id,
                "created_at": new_map.created_at.isoformat(),
                "updated_at": new_map.updated_at.isoformat(),
                "input_text": new_map.input_text,
                "description": new_map.description,
                "learning_objective": new_map.learning_objective,
                "whiteboard_content": new_map.whiteboard_content,
                "nodes": [node.to_dict() for node in new_map.nodes],
                "edges": [edge.to_dict() for edge in new_map.edges],
            }
        ),
        HTTPStatus.CREATED,
    )

    # Create a new concept map
    new_map = ConceptMap(
        name=data["name"],
        description=data.get("description", ""),
        user_id=user_id,
        is_public=data.get("is_public", False),
    )

    db.session.add(new_map)
    db.session.commit()

    # Add nodes if provided
    if "nodes" in data and isinstance(data["nodes"], list):
        for node_data in data["nodes"]:
            node = Node(
                concept_map_id=new_map.id,
                node_id=node_data.get("id", str(uuid.uuid4())),
                label=node_data.get("label", ""),
                position_x=node_data.get("position", {}).get("x"),
                position_y=node_data.get("position", {}).get("y"),
                properties=node_data.get("properties", {}),
            )
            db.session.add(node)

    # Add edges if provided
    if "edges" in data and isinstance(data["edges"], list):
        for edge_data in data["edges"]:
            edge = Edge(
                concept_map_id=new_map.id,
                edge_id=edge_data.get("id", str(uuid.uuid4())),
                source=edge_data.get("source", ""),
                target=edge_data.get("target", ""),
                label=edge_data.get("label", ""),
                properties=edge_data.get("properties", {}),
            )
            db.session.add(edge)

    db.session.commit()

    return jsonify(new_map.to_dict()), HTTPStatus.CREATED


@concept_map_bp.route("/<int:map_id>/", methods=["GET"])
@requires_auth
def get_concept_map(map_id):
    # Find the concept map
    concept_map = ConceptMap.query.filter_by(id=map_id).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), HTTPStatus.NOT_FOUND
    return jsonify(concept_map.to_dict()), HTTPStatus.OK


@concept_map_bp.route("/<string:share_id>/", methods=["GET"])
def get_shared_concept_map(share_id):
    # This endpoint is public and doesn't require authentication
    
    # Find the concept map in the database by share_id
    concept_map = ConceptMap.query.filter_by(share_id=share_id, is_public=True, is_deleted=False).first()
    
    if not concept_map:
        return jsonify({"error": "Shared concept map not found or not public"}), HTTPStatus.NOT_FOUND
    
    return jsonify(concept_map.to_dict()), HTTPStatus.OK


@concept_map_bp.route("/<int:map_id>/", methods=["PUT"])
@requires_auth
def update_concept_map(map_id):
    data = request.json
    user = get_auth0_user()

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(
        id=map_id, user_id=user.id, is_deleted=False
    ).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), HTTPStatus.NOT_FOUND

    # Update the map properties
    if "name" in data:
        concept_map.name = data["name"]
    if "description" in data:
        concept_map.description = data["description"]
    if "is_public" in data:
        concept_map.is_public = data["is_public"]
    if "is_favorite" in data:
        concept_map.is_favorite = data["is_favorite"]
    if "image" in data:
        concept_map.image = data["image"]
    if "format" in data:
        concept_map.format = data["format"]
    if "input_text" in data:
        concept_map.input_text = data["input_text"]
    if "learning_objective" in data:
        concept_map.learning_objective = data["learning_objective"]
    # Save whiteboard content if provided
    if "whiteboard_content" in data:
        concept_map.whiteboard_content = data["whiteboard_content"]
        print(f"Updating whiteboard content for map {map_id}, size: {len(str(data['whiteboard_content']))}")

    # Update nodes if provided
    if "nodes" in data and isinstance(data["nodes"], list):
        # Delete existing nodes
        Node.query.filter_by(concept_map_id=map_id).delete()

        # Add new nodes
        for node_data in data["nodes"]:
            node = Node(
                concept_map_id=map_id,
                node_id=node_data.get("id", str(uuid.uuid4())),
                label=node_data.get("label", ""),
                position_x=node_data.get("position", {}).get("x"),
                position_y=node_data.get("position", {}).get("y"),
                properties=node_data.get("properties", {}),
            )
            db.session.add(node)

    # Update edges if provided
    if "edges" in data and isinstance(data["edges"], list):
        # Delete existing edges
        Edge.query.filter_by(concept_map_id=map_id).delete()

        # Add new edges
        for edge_data in data["edges"]:
            edge = Edge(
                concept_map_id=map_id,
                edge_id=edge_data.get("id", str(uuid.uuid4())),
                source=edge_data.get("source", ""),
                target=edge_data.get("target", ""),
                label=edge_data.get("label", ""),
                properties=edge_data.get("properties", {}),
            )
            db.session.add(edge)

    # Update the timestamp
    concept_map.updated_at = datetime.utcnow()
    
    # Commit changes to database
    db.session.commit()

    return jsonify(concept_map.to_dict()), HTTPStatus.OK


@concept_map_bp.route("/<int:map_id>/", methods=["DELETE"])
@requires_auth
def delete_concept_map(map_id):
    user = get_auth0_user()

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(
        id=map_id, user_id=user.id, is_deleted=False
    ).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), HTTPStatus.NOT_FOUND

    # Mark as deleted (soft delete)
    concept_map.is_deleted = True
    db.session.commit()

    return (
        jsonify({"message": f"Concept map '{concept_map.name}' deleted successfully"}),
        HTTPStatus.OK,
    )


@concept_map_bp.route("/<int:map_id>/share/", methods=["POST"])
@requires_auth
def share_concept_map(map_id):
    user = get_auth0_user()

    # Find the concept map in the database
    concept_map = ConceptMap.query.filter_by(id=map_id, user_id=user.id, is_deleted=False).first()
    
    if not concept_map:
        return jsonify({"error": "Concept map not found"}), HTTPStatus.NOT_FOUND
    
    # Update the map to be public
    concept_map.is_public = True
    concept_map.updated_at = datetime.utcnow()
    
    # Make sure there's a share_id
    if not concept_map.share_id:
        concept_map.share_id = secrets.token_urlsafe(8)
    
    # Save changes to the database
    db.session.commit()

    # Return just the share_id, frontend will build complete URL
    return (
        jsonify(
            {
                "message": "Concept map shared successfully",
                "share_url": "/shared/" + concept_map.share_id,
                "share_id": concept_map.share_id,
            }
        ),
        HTTPStatus.OK,
    )

# Add a route for shared maps
@concept_map_bp.route("/shared/concept-maps/<string:share_id>/", methods=["GET"])
def get_public_concept_map(share_id):
    """
    Get a public concept map by its share ID.
    This endpoint matches the frontend expectation at /api/shared/concept-maps/{share_id}/
    """
    # Find the concept map in the database by share_id
    concept_map = ConceptMap.query.filter_by(share_id=share_id, is_public=True, is_deleted=False).first()
    
    if not concept_map:
        return jsonify({"error": "Shared concept map not found or not public"}), HTTPStatus.NOT_FOUND
    
    return jsonify(concept_map.to_dict()), HTTPStatus.OK
