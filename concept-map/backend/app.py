from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from models import db, User, ConceptMap, Node, Edge
import os
import secrets
from werkzeug.utils import secure_filename
import uuid
from flask_migrate import Migrate

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))
CORS(app, supports_credentials=True)  # Enable CORS for all routes with credentials

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///concept_map.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

# Configure upload folder for profile images
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


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

    # Store user ID in session
    session["user_id"] = user.id

    return jsonify({"message": "Login successful", "user": user.to_dict()}), 200


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

    # Check if the user has access to this map
    if concept_map.user_id != user_id and not concept_map.is_public:
        return jsonify({"error": "Unauthorized"}), 403

    return jsonify(concept_map.to_dict()), 200


@app.route("/api/concept-maps/<int:map_id>", methods=["PUT"])
def update_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json

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

    # Get user's maps, sorted by most recent first
    user_maps = (
        ConceptMap.query.filter_by(user_id=user_id, is_deleted=False)
        .order_by(ConceptMap.updated_at.desc())
        .limit(5)
        .all()
    )

    # Format for the response
    recent_maps = []
    for map in user_maps:
        recent_maps.append({"id": map.id, "name": map.name, "url": f"/maps/{map.id}"})

    return jsonify({"maps": recent_maps}), 200


# Health check endpoint
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"}), 200


# Create database tables within application context
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(port=5001, debug=True)
