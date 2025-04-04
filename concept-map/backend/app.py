from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from models import User, ConceptMap
import os
import secrets
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime, timedelta
from concept_map_generation.routes import concept_map_bp

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))

# Configure CORS with specific settings
CORS(app, 
     supports_credentials=True,
     origins=['http://localhost:5173'],  # Frontend development server
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type'],
     expose_headers=['Content-Type'])

# Configure session settings
app.config['SESSION_COOKIE_SECURE'] = True  # Only send cookie over HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Prevent JavaScript access to session cookie
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Protect against CSRF
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)  # Session expires in 7 days

# Register blueprints
app.register_blueprint(concept_map_bp)

# Configure upload folder for profile images
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# In-memory storage (replace with database in production)
concept_maps = []
users = []  # List to store user objects

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Flask backend is running"}), 200

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    
    # Basic validation
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Check if user already exists
    for user in users:
        if user.email == data['email']:
            return jsonify({"error": "Email already registered"}), 409
    
    # Create new user
    new_user = User(
        email=data['email'],
        password=data['password'],
        user_id=len(users) + 1,
        display_name=data.get('displayName')
    )
    
    users.append(new_user)
    
    # Don't return the password hash in the response
    return jsonify(new_user.to_dict()), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    
    # Basic validation
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Find user by email
    user = next((u for u in users if u.email == data['email'] and u.is_active), None)
    
    # Check if user exists and password is correct
    if not user or not user.verify_password(data['password']):
        return jsonify({"error": "Invalid email or password"}), 401
    
    try:
        # Set session as permanent and store user ID
        session.permanent = True
        session['user_id'] = user.id
        
        # Return user data and session info
        response = jsonify({
            "message": "Login successful",
            "user": user.to_dict()
        })
        
        return response, 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({"error": "An error occurred during login"}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    # Clear the session
    session.clear()
    return jsonify({"message": "Logout successful"}), 200

@app.route('/api/auth/current-user', methods=['GET'])
def current_user():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify(user.to_dict()), 200

@app.route('/api/auth/profile', methods=['PUT'])
def update_profile():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    data = request.json
    
    # Update user profile
    user.update_profile(
        display_name=data.get('displayName'),
        bio=data.get('bio')
    )
    
    return jsonify(user.to_dict()), 200

@app.route('/api/auth/profile/avatar', methods=['POST'])
def upload_avatar():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Check if the POST request has the file part
    if 'avatar' not in request.files:
        return jsonify({"error": "No file part"}), 400
        
    file = request.files['avatar']
    
    # If user does not select file, browser also submit an empty part without filename
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        # Use a unique filename to avoid collisions
        filename = str(uuid.uuid4()) + '.' + file.filename.rsplit('.', 1)[1].lower()
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save the file
        file.save(filepath)
        
        # Generate URL for the file
        file_url = f"/uploads/{filename}"
        
        # Update user's avatar URL
        user.update_profile(avatar_url=file_url)
        
        return jsonify({"message": "Avatar uploaded successfully", "avatarUrl": file_url}), 200
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/auth/profile/avatar', methods=['DELETE'])
def remove_avatar():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Delete the avatar file if it exists
    if user.avatar_url and user.avatar_url.startswith('/uploads/'):
        filename = user.avatar_url.split('/')[-1]
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    # Update user's avatar URL to None
    user.update_profile(avatar_url=None)
    
    return jsonify({"message": "Avatar removed successfully"}), 200

@app.route('/api/auth/account', methods=['DELETE'])
def delete_account():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
    
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Deactivate the user account (soft delete)
    user.deactivate()
    
    # Clean up user data
    
    # 1. Delete user's avatar if it exists
    if user.avatar_url and user.avatar_url.startswith('/uploads/'):
        filename = user.avatar_url.split('/')[-1]
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    # 2. Delete or anonymize user's concept maps
    for map in concept_maps:
        if map.get('user_id') == user_id:
            # Option 1: Delete maps
            # concept_maps.remove(map)
            
            # Option 2: Anonymize maps (mark as deleted)
            map['deleted'] = True
    
    # Clear the session
    session.clear()
    
    return jsonify({"message": "Account deleted successfully"}), 200

# Concept Map routes
@app.route('/api/concept-maps', methods=['GET'])
def get_concept_maps():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    # Filter maps by user_id and not deleted
    user_maps = [m for m in concept_maps if m.get('user_id') == user_id and not m.get('deleted', False)]
    return jsonify(user_maps), 200

@app.route('/api/concept-maps', methods=['POST'])
def create_concept_map():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    data = request.json
    
    # Basic validation
    if not data or 'name' not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    # Generate a unique share ID
    share_id = secrets.token_urlsafe(8)
    
    # Count the actual number of nodes
    nodes = data.get('nodes', [])
    node_count = len(nodes)
    
    # Create a new concept map with a unique ID
    new_map = {
        "id": len(concept_maps) + 1,
        "name": data['name'],
        "nodes": nodes,
        "edges": data.get('edges', []),
        "user_id": user_id,
        "image": data.get('image'),
        "format": data.get('format'),
        "is_public": data.get('is_public', False),
        "share_id": share_id,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "input_text": data.get('input_text', '')  # Store the original input text
    }
    
    concept_maps.append(new_map)
    return jsonify(new_map), 201

@app.route('/api/concept-maps/<int:map_id>', methods=['GET'])
def get_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    for map in concept_maps:
        if map["id"] == map_id and map.get("user_id") == user_id and not map.get('deleted', False):
            return jsonify(map), 200
    
    return jsonify({"error": "Concept map not found"}), 404

@app.route('/api/shared/concept-maps/<string:share_id>', methods=['GET'])
def get_shared_concept_map(share_id):
    # This endpoint is public and doesn't require authentication
    for map in concept_maps:
        if map.get("share_id") == share_id and map.get("is_public") and not map.get('deleted', False):
            return jsonify(map), 200
    
    return jsonify({"error": "Shared concept map not found or not public"}), 404

@app.route('/api/concept-maps/<int:map_id>', methods=['PUT'])
def update_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    data = request.json
    
    for i, map in enumerate(concept_maps):
        if map["id"] == map_id and map.get("user_id") == user_id and not map.get('deleted', False):
            # Get the new nodes or keep existing ones
            nodes = data.get('nodes', map['nodes'])
            
            # Update the map
            concept_maps[i] = {
                "id": map_id,
                "name": data.get('name', map['name']),
                "nodes": nodes,
                "edges": data.get('edges', map['edges']),
                "user_id": user_id,
                "is_public": data.get('is_public', map.get('is_public', False)),
                "share_id": map.get('share_id'),
                "image": data.get('image', map.get('image')),
                "format": data.get('format', map.get('format')),
                "created_at": map.get('created_at'),
                "updated_at": datetime.utcnow().isoformat(),
                "input_text": data.get('input_text', map.get('input_text', '')) # Preserve input text
            }
            return jsonify(concept_maps[i]), 200
    
    return jsonify({"error": "Concept map not found"}), 404

@app.route('/api/concept-maps/<int:map_id>', methods=['DELETE'])
def delete_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    for i, map in enumerate(concept_maps):
        if map["id"] == map_id and map.get("user_id") == user_id and not map.get('deleted', False):
            # Remove the map or mark as deleted
            deleted_map = concept_maps[i]
            deleted_map['deleted'] = True
            return jsonify({"message": f"Concept map '{deleted_map['name']}' deleted successfully"}), 200
    
    return jsonify({"error": "Concept map not found"}), 404

# Serve uploaded files
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/users/<int:user_id>/recent-maps', methods=['GET'])
def get_recent_maps(user_id):
    # Get the user ID from session
    session_user_id = session.get('user_id')
    
    if not session_user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    # Can only view own recent maps
    if session_user_id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
        
    # Find user by ID
    user = next((u for u in users if u.id == user_id and u.is_active), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # Get user's maps, sorted by most recent first (in a real app, this would be by last modified date)
    user_maps = [m for m in concept_maps if m.get('user_id') == user_id and not m.get('deleted', False)]
    
    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
    
    # Limit to 5 most recent maps and format for the response
    recent_maps = []
    for map in user_maps[:5]:
        recent_maps.append({
            "id": map["id"],
            "name": map["name"],
            "url": f"/maps/{map['id']}",
            "share_url": f"/shared/{map['share_id']}" if map.get('is_public') else None
        })
    
    return jsonify({"maps": recent_maps}), 200

@app.route('/api/users/<int:user_id>/saved-maps', methods=['GET'])
def get_saved_maps(user_id):
    # Get the user ID from session
    session_user_id = session.get('user_id')
    
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
    user_maps = [m for m in concept_maps if m.get('user_id') == user_id and not m.get('deleted', False)]
    
    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
    
    return jsonify(user_maps), 200

@app.route('/api/concept-maps/<int:map_id>/share', methods=['POST'])
def share_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    # Find the map by ID and user ID
    for i, map in enumerate(concept_maps):
        if map["id"] == map_id and map.get("user_id") == user_id and not map.get('deleted', False):
            # Update the map to be public
            concept_maps[i]["is_public"] = True
            concept_maps[i]["updated_at"] = datetime.utcnow().isoformat()
            
            # Generate share URL
            share_url = f"/shared/{map['share_id']}"
            
            return jsonify({
                "message": "Concept map shared successfully",
                "share_url": share_url,
                "share_id": map['share_id']
            }), 200
    
    return jsonify({"error": "Concept map not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)