from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from models import db, User, ConceptMap, Node, Edge
import os
import secrets
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime, timedelta
from concept_map_generation.routes import concept_map_bp
from document_processor import DocumentProcessor
from flask_migrate import Migrate

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

# Configure CORS with specific settings
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:5173"],  # Frontend development server
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)  # Cache preflight requests for 1 hour

# Configure session settings
app.config["SESSION_COOKIE_SECURE"] = True  # Only send cookie over HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = (
    True  # Prevent JavaScript access to session cookie
)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # Protect against CSRF
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(
    days=7
)  # Session expires in 7 days

# Register blueprints
app.register_blueprint(concept_map_bp)

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///concept_map.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# Initialize document processor
document_processor = None


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Authentication routes
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json

    # Basic validation
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Check if user already exists
    existing_user = User.query.filter_by(email=data["email"]).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 409

    # Create new user
    new_user = User(
        email=data["email"],
        password=data["password"],
        display_name=data.get("displayName"),
    )

    db.session.add(new_user)
    db.session.commit()

    # Don't return the password hash in the response
    return jsonify(new_user.to_dict()), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json

    # Basic validation
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Find user by email
    user = User.query.filter_by(email=data["email"], is_active=True).first()

    # Check if user exists and password is correct
    if not user or not user.verify_password(data["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    try:
        # Set session as permanent and store user ID
        session.permanent = True
        session["user_id"] = user.id

        # Return user data and session info
        response = jsonify({"message": "Login successful", "user": user.to_dict()})

        return response, 200

    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "An error occurred during login"}), 500


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    # Clear the session
    session.clear()
    return jsonify({"message": "Logout successful"}), 200


# User profile routes
@app.route("/api/auth/profile", methods=["GET"])
def get_profile():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.to_dict()), 200


@app.route("/api/auth/profile", methods=["PUT"])
def update_profile():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.json

    # Update user profile
    user.update_profile(display_name=data.get("displayName"), bio=data.get("bio"))

    db.session.commit()

    return jsonify(user.to_dict()), 200


@app.route("/api/auth/profile/avatar", methods=["POST"])
def upload_avatar():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Check if the POST request has the file part
    if "avatar" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["avatar"]

    # If user does not select file, browser also submit an empty part without filename
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        # Generate a secure filename with a UUID to avoid collisions
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)

        # Save the file
        file.save(filepath)

        # Update user's avatar URL
        avatar_url = f"/uploads/{unique_filename}"
        user.update_profile(avatar_url=avatar_url)

        db.session.commit()

        return (
            jsonify(
                {"message": "Avatar uploaded successfully", "avatarUrl": avatar_url}
            ),
            200,
        )

    return jsonify({"error": "File type not allowed"}), 400


@app.route("/api/auth/profile/avatar", methods=["DELETE"])
def remove_avatar():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Delete the avatar file if it exists
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        filename = user.avatar_url.split("/")[-1]
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    # Update user's avatar URL to None
    user.update_profile(avatar_url=None)

    db.session.commit()

    return jsonify({"message": "Avatar removed successfully"}), 200


@app.route("/api/auth/account", methods=["DELETE"])
def delete_account():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Deactivate the user account (soft delete)
    user.deactivate()

    # Clean up user data

    # 1. Delete user's avatar if it exists
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        filename = user.avatar_url.split("/")[-1]
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    # 2. Mark user's concept maps as deleted
    for concept_map in user.concept_maps:
        concept_map.is_deleted = True

    db.session.commit()

    # Clear the session
    session.clear()

    return jsonify({"message": "Account deleted successfully"}), 200


# Concept Map routes
@app.route("/api/concept-maps", methods=["GET"])
def get_concept_maps():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Filter maps by user_id and not deleted
    user_maps = ConceptMap.query.filter_by(user_id=user_id, is_deleted=False).all()
    return jsonify([map.to_dict() for map in user_maps]), 200


@app.route("/api/concept-maps", methods=["POST"])
def create_concept_map():
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json

    # Basic validation
    if not data or "name" not in data:
        return jsonify({"error": "Missing required fields"}), 400

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
        user_id=user_id,
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
        201,
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

    return jsonify(new_map.to_dict()), 201


@app.route("/api/concept-maps/<int:map_id>", methods=["GET"])
def get_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(id=map_id).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), 404


@app.route("/api/shared/concept-maps/<string:share_id>", methods=["GET"])
def get_shared_concept_map(share_id):
    # This endpoint is public and doesn't require authentication
    for map in concept_maps:
        if (
            map.get("share_id") == share_id
            and map.get("is_public")
            and not map.get("deleted", False)
        ):
            return jsonify(map), 200

    return jsonify({"error": "Shared concept map not found or not public"}), 404


@app.route("/api/concept-maps/<int:map_id>", methods=["PUT"])
def update_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json

    for i, map in enumerate(concept_maps):
        if (
            map["id"] == map_id
            and map.get("user_id") == user_id
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
                "user_id": user_id,
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
            return jsonify(concept_maps[i]), 200

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(
        id=map_id, user_id=user_id, is_deleted=False
    ).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), 404

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

    return jsonify(concept_map.to_dict()), 200


@app.route("/api/concept-maps/<int:map_id>", methods=["DELETE"])
def delete_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(
        id=map_id, user_id=user_id, is_deleted=False
    ).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), 404

    # Mark as deleted (soft delete)
    concept_map.is_deleted = True
    db.session.commit()

    return (
        jsonify({"message": f"Concept map '{concept_map.name}' deleted successfully"}),
        200,
    )


# Serve uploaded files
@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/api/users/<int:user_id>/recent-maps", methods=["GET"])
def get_recent_maps(user_id):
    # Get the user ID from session
    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Check if the user is requesting their own data
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

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

    return jsonify({"maps": recent_maps}), 200


@app.route("/api/users/<int:user_id>/saved-maps", methods=["GET"])
def get_saved_maps(user_id):
    # Get the user ID from session
    session_user_id = session.get("user_id")

    if not session_user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Can only view own saved maps
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403

    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get all user's maps that aren't deleted
    user_maps = [
        m
        for m in concept_maps
        if m.get("user_id") == user_id and not m.get("deleted", False)
    ]

    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    return jsonify(user_maps), 200


@app.route("/api/concept-maps/<int:map_id>/share", methods=["POST"])
def share_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Find the map by ID and user ID
    for i, map in enumerate(concept_maps):
        if (
            map["id"] == map_id
            and map.get("user_id") == user_id
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
                200,
            )

    return jsonify({"error": "Concept map not found"}), 404


@app.route("/api/process-document", methods=["POST"])
def process_document():
    """
    Process uploaded document and extract text content
    """
    global document_processor

    # Initialize document processor on first request
    if document_processor is None:
        document_processor = DocumentProcessor()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    file_ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""

    # Check if file type is supported
    if file_ext not in ["pdf", "jpg", "jpeg", "png"]:
        return (
            jsonify(
                {"error": "Unsupported file type. Please upload a PDF or image file."}
            ),
            400,
        )

    try:
        # Read file content
        file_content = file.read()

        # Check if financial document processing is requested
        doc_type = request.form.get("doc_type", "standard")

        # Process document based on document type
        if doc_type == "financial":
            extracted_text = document_processor.process_financial_document(
                file_content, file_ext
            )
        else:
            extracted_text = document_processor.process_document(file_content, file_ext)

        return jsonify({"success": True, "text": extracted_text})

    except Exception as e:
        print(f"Error processing document: {str(e)}")
        return jsonify({"error": f"Failed to process document: {str(e)}"}), 500


@app.route("/api/process-financial-document", methods=["POST"])
def process_financial_document():
    """
    Process uploaded financial document with specialized OCR
    """
    global document_processor

    # Initialize document processor on first request
    if document_processor is None:
        document_processor = DocumentProcessor()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    file_ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""

    # Check if file type is supported
    if file_ext not in ["pdf", "jpg", "jpeg", "png"]:
        return (
            jsonify(
                {"error": "Unsupported file type. Please upload a PDF or image file."}
            ),
            400,
        )

    try:
        # Read file content
        file_content = file.read()

        # Process document with financial document specific processing
        extracted_text = document_processor.process_financial_document(
            file_content, file_ext
        )

        return jsonify({"success": True, "text": extracted_text})

    except Exception as e:
        print(f"Error processing financial document: {str(e)}")
        return (
            jsonify({"error": f"Failed to process financial document: {str(e)}"}),
            500,
        )


# Add debug endpoint for concept map processing
@app.route("/api/debug/process-drawing", methods=["POST"])
def debug_process_drawing():
    """Debug endpoint for drawing processing that always returns valid data"""
    print("DEBUG: Process drawing API called")
    data = request.json

    # Log received data
    image_content = None
    svg_content = None

    if data:
        if "imageContent" in data:
            image_content = data["imageContent"]
            content_preview = (
                image_content[:50] + "..." if len(image_content) > 50 else image_content
            )
            print(f"DEBUG: Received image content length: {len(image_content)}")
            print(f"DEBUG: Image content preview: {content_preview}")

            # For compatibility with our mock response, create a minimal SVG wrapper
            svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><image href="{image_content}" width="800" height="600"/></svg>'
        elif "svgContent" in data:
            svg_content = data["svgContent"]
            content_preview = (
                svg_content[:100] + "..." if len(svg_content) > 100 else svg_content
            )
            print(f"DEBUG: Received SVG content length: {len(svg_content)}")
            print(f"DEBUG: SVG content preview: {content_preview}")
        else:
            print("DEBUG: No image or SVG content received")
            return jsonify({"error": "No image or SVG content provided"}), 400
    else:
        print("DEBUG: No data received")
        return jsonify({"error": "No data provided"}), 400

    # Create a mock OCR response
    mock_response = {
        "concepts": [
            {
                "id": "c1",
                "name": "Mock Concept 1",
                "description": "This is a mock concept",
            },
            {
                "id": "c2",
                "name": "Mock Concept 2",
                "description": "Another mock concept",
            },
        ],
        "relationships": [{"source": "c1", "target": "c2", "label": "relates to"}],
        "image": svg_content,  # Return the original SVG content
        "format": "svg",
        "structure": {"type": "hierarchical", "root": "c1"},
    }

    # Return the mock response for testing
    print("DEBUG: Returning mock OCR response")
    return jsonify(mock_response)


# Add debug endpoint to list available Gemini models
@app.route("/api/debug/list-models", methods=["GET"])
def list_models():
    """Debug endpoint to list available Gemini models"""
    import google.generativeai as genai

    try:
        print("DEBUG: Listing available Gemini models")
        models = genai.list_models()
        model_info = []

        for model in models:
            model_info.append(
                {
                    "name": model.name,
                    "display_name": model.display_name,
                    "description": model.description,
                    "input_text": "text" in model.supported_generation_methods,
                    "input_image": hasattr(model, "input_image") and model.input_image,
                }
            )

        return jsonify({"models": model_info, "count": len(model_info)})
    except Exception as e:
        print(f"DEBUG: Error listing models: {str(e)}")
        return jsonify({"error": f"Failed to list models: {str(e)}"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)


# Health check endpoint
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"}), 200


# Create database tables within application context
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(port=5001, debug=True)
