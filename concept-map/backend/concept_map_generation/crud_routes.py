import secrets
import uuid
from datetime import datetime
from http import HTTPStatus

from flask import request, jsonify

from auth_utils import requires_auth, get_auth0_user
from concept_map_generation.generation_routes import concept_map_bp
from models import db, ConceptMap, Node, Edge, User

concept_maps = []
users = []  # List to store user objects
notes = []  # List to store note objects


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
    )

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
    for map in concept_maps:
        if (
                map.get("share_id") == share_id
                and map.get("is_public")
                and not map.get("deleted", False)
        ):
            return jsonify(map), HTTPStatus.OK

    return jsonify({"error": "Shared concept map not found or not public"}), HTTPStatus.NOT_FOUND


@concept_map_bp.route("/<int:map_id>/", methods=["PUT"])
@requires_auth
def update_concept_map(map_id):
    data = request.json
    user = get_auth0_user()

    for i, map in enumerate(concept_maps):
        if (
                map["id"] == map_id
                and map.get("user_id") == user.id
                and not map.get("deleted", False)
        ):
            # Get the new nodes or keep existing ones
            nodes = data.get("nodes", map["nodes"])

            # Update the map
            concept_maps[i] = {
                "id": map_id,
                "name": data.get("name", map["name"]),
                "nodes": nodes,
                "edges": data.get("edges", map["edges"]),
                "user_id": user.id,
                "is_public": data.get("is_public", map.get("is_public", False)),
                "is_favorite": data.get("is_favorite", map.get("is_favorite", False)),
                "share_id": map.get("share_id"),
                "image": data.get("image", map.get("image")),
                "format": data.get("format", map.get("format")),
                "created_at": map.get("created_at"),
                "updated_at": datetime.utcnow().isoformat(),
                "input_text": data.get(
                    "input_text", map.get("input_text", "")
                ),  # Preserve input text
                "description": data.get(
                    "description", map.get("description", "")
                ),  # Preserve description
                "learning_objective": data.get(
                    "learning_objective", map.get("learning_objective", "")
                ),  # Preserve learning objective
            }
            return jsonify(concept_maps[i]), HTTPStatus.OK

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

    # Find the map by ID and user ID
    for i, map in enumerate(concept_maps):
        if (
                map["id"] == map_id
                and map.get("user_id") == user.id
                and not map.get("deleted", False)
        ):
            # Update the map to be public
            concept_maps[i]["is_public"] = True
            concept_maps[i]["updated_at"] = datetime.utcnow().isoformat()

            # Return just the share_id, frontend will build complete URL
            return (
                jsonify(
                    {
                        "message": "Concept map shared successfully",
                        "share_url": "/shared/" + map["share_id"],
                        "share_id": map["share_id"],
                    }
                ),
                HTTPStatus.OK,
            )

    return jsonify({"error": "Concept map not found"}), HTTPStatus.NOT_FOUND
