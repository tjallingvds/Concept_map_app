from flask import Flask, request, jsonify, session
from flask_cors import CORS
from models import User, ConceptMap
import os
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(16))
CORS(app, supports_credentials=True)  # Enable CORS for all routes with credentials

# In-memory storage (replace with database in production)
concept_maps = []
users = []  # List to store user objects

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
        user_id=len(users) + 1
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
    user = next((u for u in users if u.email == data['email']), None)
    
    # Check if user exists and password is correct
    if not user or not user.verify_password(data['password']):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Store user ID in session
    session['user_id'] = user.id
    
    return jsonify({"message": "Login successful", "user": user.to_dict()}), 200

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
    user = next((u for u in users if u.id == user_id), None)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    return jsonify(user.to_dict()), 200

# Concept Map routes
@app.route('/api/concept-maps', methods=['GET'])
def get_concept_maps():
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    # Filter maps by user_id
    user_maps = [m for m in concept_maps if m.get('user_id') == user_id]
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
    
    # Create a new concept map with a unique ID
    new_map = {
        "id": len(concept_maps) + 1,
        "name": data['name'],
        "nodes": data.get('nodes', []),
        "edges": data.get('edges', []),
        "user_id": user_id
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
        if map["id"] == map_id and map.get("user_id") == user_id:
            return jsonify(map), 200
    
    return jsonify({"error": "Concept map not found"}), 404

@app.route('/api/concept-maps/<int:map_id>', methods=['PUT'])
def update_concept_map(map_id):
    # Get the user ID from session
    user_id = session.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401
        
    data = request.json
    
    for i, map in enumerate(concept_maps):
        if map["id"] == map_id and map.get("user_id") == user_id:
            # Update the map
            concept_maps[i] = {
                "id": map_id,
                "name": data.get('name', map['name']),
                "nodes": data.get('nodes', map['nodes']),
                "edges": data.get('edges', map['edges']),
                "user_id": user_id
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
        if map["id"] == map_id and map.get("user_id") == user_id:
            # Remove the map
            deleted_map = concept_maps.pop(i)
            return jsonify({"message": f"Concept map '{deleted_map['name']}' deleted successfully"}), 200
    
    return jsonify({"error": "Concept map not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True) 