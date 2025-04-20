import os
import secrets
import uuid
from datetime import datetime, timedelta

import google.generativeai as genai
from auth_utils import get_auth0_user, requires_auth
from concept_map_generation.bubble_chart import process_text_for_bubble_chart
from concept_map_generation.mind_map import generate_concept_map
from concept_map_generation.ocr_concept_map import process_drawing_for_concept_map
from concept_map_generation.word_cloud import process_text_for_wordcloud
from document_processor import DocumentProcessor
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate
from models import ConceptMap, Edge, Node, Note, User, db
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

# Configure CORS with specific settings
CORS(
    app,
    supports_credentials=True,
    origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:5173")
    ],  # Frontend server from env or default
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)  # Cache preflight requests for 1 hour

# Configure session settings
app.config["SESSION_COOKIE_SECURE"] = True  # Only send cookie over HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = True  # Prevent JavaScript access to session cookie
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # Protect against CSRF
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)  # Session expires in 7 days

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///concept_map.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")
# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# In-memory storage (replace with database in production)
concept_maps = []
users = []  # List to store user objects
notes = []  # List to store note objects


# Initialize document processor
document_processor = None

# Get API key from environment variables
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")
# Ensure API key is str type
GEMINI_API_KEY = str(GEMINI_API_KEY)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_gemini_model():
    """Initialize and return a Gemini model instance"""
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.0-flash")


# User profile routes
@app.route("/api/auth/profile", methods=["GET"])
@requires_auth
def get_profile():
    user = get_auth0_user()
    return jsonify(user.to_dict()), 200


@app.route("/api/auth/profile", methods=["PUT"])
@requires_auth
def update_profile():
    user = get_auth0_user()
    data = request.json
    user.update_profile(display_name=data.get("displayName"), bio=data.get("bio"))
    db.session.commit()
    return jsonify(user.to_dict()), 200


@app.route("/api/auth/profile/avatar", methods=["POST"])
@requires_auth
def upload_avatar():
    user = get_auth0_user()

    if "avatar" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["avatar"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_filename)
        file.save(filepath)

        avatar_url = f"{request.host_url.rstrip('/')}/uploads/{unique_filename}"
        user.update_profile(avatar_url=avatar_url)
        db.session.commit()

        return jsonify({"message": "Avatar uploaded", "avatarUrl": avatar_url}), 200

    return jsonify({"error": "Invalid file type"}), 400


@app.route("/api/auth/profile/avatar", methods=["DELETE"])
@requires_auth
def remove_avatar():
    user = get_auth0_user()

    # Delete the avatar file if it exists
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        filename = user.avatar_url.split("/")[-1]
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    # Remove avatar reference from DB
    user.update_profile(avatar_url=None)
    db.session.commit()

    return jsonify({"message": "Avatar removed successfully"}), 200


@app.route("/api/auth/account", methods=["DELETE"])
@requires_auth
def delete_account():
    user = get_auth0_user()

    # Delete avatar
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], user.avatar_url.split("/")[-1])
        if os.path.exists(filepath):
            os.remove(filepath)

    # Mark as inactive and soft delete maps
    user.deactivate()
    for m in user.concept_maps:
        m.is_deleted = True
    db.session.commit()

    return jsonify({"message": "Account deleted"}), 200


# Concept Map routes
@app.route("/api/concept-maps", methods=["GET"])
@requires_auth
def get_concept_maps():
    user = get_auth0_user()

    # Filter maps by user_id and not deleted
    user_maps = ConceptMap.query.filter_by(user_id=user.id, is_deleted=False).all()
    return jsonify([map.to_dict() for map in user_maps]), 200


@app.route("/api/concept-maps", methods=["POST"])
@requires_auth
def create_concept_map():
    user = get_auth0_user()

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
                concept_map_id=new_map.id,
                node_id=node_data.get("id", str(uuid.uuid4())),
                label=node_data.get("label", ""),
                position_x=node_data.get("position", {}).get("x"),
                position_y=node_data.get("position", {}).get("y"),
                properties=node_data.get("properties", {}),
            )
            db.session.add(node)

    # Add edges if they exist
    if edges:
        for edge_data in edges:
            edge = Edge(
                concept_map_id=new_map.id,
                edge_id=edge_data.get("id", str(uuid.uuid4())),
                source=edge_data.get("source", ""),
                target=edge_data.get("target", ""),
                label=edge_data.get("label", ""),
                properties=edge_data.get("properties", {}),
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


@app.route("/api/concept-maps/generate", methods=["POST"])
def generate_map():
    """Generate a concept map based on input text and map type"""
    try:
        data = request.json

        # Validate request data
        if not data or "text" not in data or "mapType" not in data:
            return jsonify({"error": "Missing required fields: text and mapType"}), 400

        text = data["text"]
        map_type = data["mapType"]
        title = data.get("title", "Concept Map")

        # Check if text is provided
        if not text.strip():
            return jsonify({"error": "Text content cannot be empty"}), 400

        # Initialize Gemini model
        try:
            model = get_gemini_model()
        except ValueError as e:
            return jsonify({"error": str(e)}), 500

        # Generate the appropriate visualization based on map type
        if map_type == "mindmap":
            result = generate_concept_map(text, model, GEMINI_API_KEY)
            # Ensure we're returning a properly formatted response
            # The frontend expects either a data URL or a base64 string with format
            return jsonify(
                {
                    "image": result,  # This is already base64 encoded from generate_concept_map
                    "format": "svg",
                }
            )

        elif map_type == "wordcloud":
            result = process_text_for_wordcloud(text, model, GEMINI_API_KEY)
            return jsonify(
                {"image": result["word_cloud"], "concepts": result["concepts"], "format": "png"}
            )

        elif map_type == "bubblechart":
            result = process_text_for_bubble_chart(text, model)
            return jsonify(
                {"image": result["bubble_chart"], "concepts": result["concepts"], "format": "png"}
            )

        else:
            return jsonify({"error": f"Unsupported map type: {map_type}"}), 400

    except Exception as e:
        return jsonify({"error": f"Error generating concept map: {str(e)}"}), 500


@app.route("/api/concept-maps/extract-concepts", methods=["POST"])
def extract_concepts():
    """Extract key concepts from input text without generating a visualization"""
    try:
        data = request.json

        # Validate request data
        if not data or "text" not in data:
            return jsonify({"error": "Missing required field: text"}), 400

        text = data["text"]

        # Check if text is provided
        if not text.strip():
            return jsonify({"error": "Text content cannot be empty"}), 400

        # Initialize Gemini model
        try:
            model = get_gemini_model()
        except ValueError as e:
            return jsonify({"error": str(e)}), 500

        # Extract concepts using the word cloud module's function
        from .word_cloud import extract_concepts_from_text

        concepts = extract_concepts_from_text(text, model)

        return jsonify({"concepts": concepts})

    except Exception as e:
        return jsonify({"error": f"Error extracting concepts: {str(e)}"}), 500


@app.route("/api/concept-maps/process-drawing", methods=["POST"])
def process_drawing():
    """Process a drawing (SVG or PNG) to extract concepts and generate a digital concept map"""
    try:
        print("*** Process Drawing API called ***")
        data = request.json

        # Validate request data - accept either svgContent or imageContent
        if not data:
            print("Missing request data")
            return jsonify({"error": "Missing request data"}), 400

        # Check if we have image content (PNG, JPEG, etc.)
        if "imageContent" in data:
            image_content = data["imageContent"]
            print(f"Received image content length: {len(image_content)}")

            # Check if content is provided
            if not image_content.strip():
                print("Image content is empty")
                return jsonify({"error": "Image content cannot be empty"}), 400

            # Check if format parameters are provided
            image_format = data.get("format", "").lower()
            prevent_jpeg = data.get("preventJpegConversion", False)

            print(f"Image format: {image_format}, Prevent JPEG conversion: {prevent_jpeg}")

            # For PNG data URLs, we can now pass them directly to the OCR function
            if image_content.startswith("data:image/png") or image_format == "png":
                print("Direct PNG processing")
                svg_content = image_content  # Pass the PNG data URL directly
            else:
                # For compatibility, convert image data URL to SVG format our backend expects
                print("Creating SVG wrapper for image")
                svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><image href="{image_content}" width="800" height="600"/></svg>'

            print(f"Prepared content for processing, length: {len(svg_content)}")

        # Check for SVG content (backwards compatibility)
        elif "svgContent" in data:
            svg_content = data["svgContent"]
            print(f"Received SVG content length: {len(svg_content)}")

            # Check if content is provided
            if not svg_content.strip():
                print("SVG content is empty")
                return jsonify({"error": "SVG content cannot be empty"}), 400
        else:
            print("Missing required field: imageContent or svgContent")
            return jsonify({"error": "Missing required field: imageContent or svgContent"}), 400

        # Initialize Gemini model
        try:
            print("Initializing Gemini model")
            model = get_gemini_model()
        except ValueError as e:
            print(f"Error initializing Gemini model: {str(e)}")
            return jsonify({"error": str(e)}), 500

        # Process the drawing with OCR and generate concept map
        print("Processing drawing with OCR")
        result = process_drawing_for_concept_map(svg_content, model)

        # Check if there was an error during processing
        if "error" in result:
            print(f"Error processing drawing: {result['error']}")
            return jsonify({"error": result["error"]}), 500

        print(f"OCR processing successful with {len(result.get('concepts', []))} concepts")
        return jsonify(result)

    except Exception as e:
        print(f"Exception in process_drawing route: {str(e)}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Error processing drawing: {str(e)}"}), 500


@app.route("/api/concept-maps/<int:map_id>", methods=["GET"])
@requires_auth
def get_concept_map(map_id):

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(id=map_id).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), 404

    return jsonify(concept_map.to_dict()), 200


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
@requires_auth
def update_concept_map(map_id):
    data = request.json
    user = get_auth0_user()

    # Find the concept map in database
    concept_map = ConceptMap.query.filter_by(id=map_id, user_id=user.id, is_deleted=False).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), 404

    # Update the map with new data
    concept_map.name = data.get("name", concept_map.name)
    concept_map.is_public = data.get("is_public", concept_map.is_public)
    concept_map.is_favorite = data.get("is_favorite", concept_map.is_favorite)
    concept_map.image = data.get("image", concept_map.image)
    concept_map.format = data.get("format", concept_map.format)
    concept_map.input_text = data.get("input_text", concept_map.input_text)
    concept_map.description = data.get("description", concept_map.description)
    concept_map.learning_objective = data.get("learning_objective", concept_map.learning_objective)
    concept_map.updated_at = datetime.utcnow()

    # Update nodes if provided
    if "nodes" in data:
        # Delete existing nodes
        Node.query.filter_by(concept_map_id=map_id).delete()

        # Add new nodes
        for node_data in data["nodes"]:
            node = Node(
                concept_map=concept_map,
                label=node_data.get("label", ""),
                x=node_data.get("x", 0),
                y=node_data.get("y", 0),
            )
            db.session.add(node)

    # Update edges if provided
    if "edges" in data:
        # Delete existing edges
        Edge.query.filter_by(concept_map_id=map_id).delete()

        # Add new edges
        for edge_data in data["edges"]:
            edge = Edge(
                concept_map=concept_map,
                source_id=edge_data.get("source"),
                target_id=edge_data.get("target"),
                label=edge_data.get("label", ""),
            )
            db.session.add(edge)

    # Commit changes to database
    db.session.commit()

    return jsonify(concept_map.to_dict()), 200
    # Find the concept map
    concept_map = ConceptMap.query.filter_by(id=map_id, user_id=user.id, is_deleted=False).first()

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
@requires_auth
def delete_concept_map(map_id):
    user = get_auth0_user()

    # Find the concept map
    concept_map = ConceptMap.query.filter_by(id=map_id, user_id=user.id, is_deleted=False).first()

    if not concept_map:
        return jsonify({"error": "Concept map not found"}), 404

    # Mark as deleted (soft delete)
    concept_map.is_deleted = True
    db.session.commit()

    return (
        jsonify({"message": f"Concept map '{concept_map.name}' deleted successfully"}),
        200,
    )


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@app.route("/api/user/recent-maps", methods=["GET"])
@requires_auth
def get_recent_maps():
    # TODO: maybe it is better to just remove the user_id parameter?
    user = get_auth0_user()
    user_id = user.id

    # Find user by ID
    user = User.query.filter_by(id=user_id, is_active=True).first()

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get user's maps, sorted by most recent first (in a real app, this would be by last modified date)
    user_maps = [
        m for m in concept_maps if m.get("user_id") == user_id and not m.get("deleted", False)
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
                "share_url": (f"/shared/{map['share_id']}" if map.get("is_public") else None),
            }
        )

    for map in user_maps:
        recent_maps.append({"id": map.id, "name": map.name, "url": f"/maps/{map.id}"})

    return jsonify({"maps": recent_maps}), 200


@app.route("/api/user/saved-maps", methods=["GET"])
@requires_auth
def get_saved_maps():
    user = get_auth0_user()
    user_id = user.id
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get all user's maps that aren't deleted
    user_maps = [
        m for m in concept_maps if m.get("user_id") == user_id and not m.get("deleted", False)
    ]

    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    return jsonify(user_maps), 200


@app.route("/api/concept-maps/<int:map_id>/share", methods=["POST"])
@requires_auth
def share_concept_map(map_id):
    user = get_auth0_user()

    # Find the map by ID and user ID
    for i, map in enumerate(concept_maps):
        if map["id"] == map_id and map.get("user_id") == user.id and not map.get("deleted", False):
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
            jsonify({"error": "Unsupported file type. Please upload a PDF or image file."}),
            400,
        )

    try:
        # Read file content
        file_content = file.read()

        # Check if financial document processing is requested
        doc_type = request.form.get("doc_type", "standard")

        # Process document based on document type
        if doc_type == "financial":
            extracted_text = document_processor.process_financial_document(file_content, file_ext)
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
            jsonify({"error": "Unsupported file type. Please upload a PDF or image file."}),
            400,
        )

    try:
        # Read file content
        file_content = file.read()

        # Process document with financial document specific processing
        extracted_text = document_processor.process_financial_document(file_content, file_ext)

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
            content_preview = svg_content[:100] + "..." if len(svg_content) > 100 else svg_content
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


# Health check endpoint
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"}), 200


# Create database tables within application context
with app.app_context():
    db.create_all()


# Notes routes
@app.route("/api/notes", methods=["GET"])
@requires_auth
def get_notes():
    """Get all notes for the current user."""
    user = get_auth0_user()
    user_id = user.id

    # Filter notes by user_id and not deleted
    user_notes = [n.to_dict() for n in notes if n.user_id == user_id and not n.is_deleted]
    return jsonify(user_notes), 200


@app.route("/api/notes", methods=["POST"])
@requires_auth
def create_note():
    """Create a new note."""
    user = get_auth0_user()
    user_id = user.id

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
        user_id=user_id,
        is_public=data.get("is_public", False),
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
    user_id = user.id

    note = next(
        (n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None
    )

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
    user_id = user.id

    data = request.json

    note = next(
        (n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None
    )

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
    user_id = user.id

    note = next(
        (n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None
    )

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
    user_id = user.id

    note = next(
        (n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None
    )

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
    user_id = user.id

    note = next(
        (n for n in notes if n.id == note_id and n.user_id == user_id and not n.is_deleted), None
    )

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
            user_id=user_id,
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
    session_user_id = user.id

    # Check if the user is requesting their own notes
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), 403

    # Get recent notes, sorted by updated_at
    user_notes = [n.to_dict() for n in notes if n.user_id == user_id and not n.is_deleted]
    recent_notes = sorted(user_notes, key=lambda x: x.get("updated_at", ""), reverse=True)[:5]

    return jsonify(recent_notes), 200


@app.route("/api/users/<int:user_id>/favorite-notes", methods=["GET"])
@requires_auth
def get_favorite_notes(user_id):
    """Get the favorite notes for a user."""
    user = get_auth0_user()
    session_user_id = user.id

    # Check if the user is requesting their own notes
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized to access these notes"}), 403

    # Get favorite notes
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
