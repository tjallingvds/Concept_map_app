"""
Models for the concept map application.
Currently using in-memory storage, but structured to easily migrate to a database.
"""
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy
db = SQLAlchemy()

class User(db.Model):
    """Model representing a user in the application."""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationship with concept maps
    concept_maps = db.relationship('ConceptMap', backref='user', lazy=True, cascade="all, delete-orphan")
    
    def __init__(self, email, password, user_id=None, display_name=None, bio=None, avatar_url=None):
        self.id = user_id
        self.email = email
        self.password_hash = generate_password_hash(password)
        self.display_name = display_name or email.split('@')[0]
        self.bio = bio
        self.avatar_url = avatar_url
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.is_active = True
    
    def verify_password(self, password):
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)
    
    def update_profile(self, display_name=None, bio=None, avatar_url=None):
        """Update the user's profile information."""
        if display_name:
            self.display_name = display_name
        if bio is not None:  # Allow empty string to clear bio
            self.bio = bio
        if avatar_url is not None:  # Allow setting to None to remove avatar
            self.avatar_url = avatar_url
        self.updated_at = datetime.utcnow()
    
    def deactivate(self):
        """Soft delete the user account by marking it as inactive."""
        self.is_active = False
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        """Convert the model to a dictionary representation (excluding password)."""
        return {
            "id": self.id,
            "email": self.email,
            "displayName": self.display_name,
            "bio": self.bio,
            "avatarUrl": self.avatar_url,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "isActive": self.is_active
        }
    
    @classmethod
    def from_dict(cls, data, user_id=None):
        """Create a User instance from a dictionary."""
        user = cls(
            email=data.get("email", ""),
            password=data.get("password", ""),
            user_id=user_id or data.get("id"),
            display_name=data.get("displayName"),
            bio=data.get("bio"),
            avatar_url=data.get("avatarUrl")
        )
        # Set timestamps if available
        if "createdAt" in data and data["createdAt"]:
            try:
                user.created_at = datetime.fromisoformat(data["createdAt"])
            except (ValueError, TypeError):
                pass
        
        if "updatedAt" in data and data["updatedAt"]:
            try:
                user.updated_at = datetime.fromisoformat(data["updatedAt"])
            except (ValueError, TypeError):
                pass
        
        if "isActive" in data:
            user.is_active = bool(data["isActive"])
            
        return user

# Node model for storing nodes in concept maps
class Node(db.Model):
    """Model representing a node in a concept map."""
    __tablename__ = 'nodes'
    
    id = db.Column(db.Integer, primary_key=True)
    concept_map_id = db.Column(db.Integer, db.ForeignKey('concept_maps.id', ondelete='CASCADE'), nullable=False)
    node_id = db.Column(db.String(50), nullable=False)  # ID within the concept map
    label = db.Column(db.String(100), nullable=False)
    position_x = db.Column(db.Float, nullable=True)
    position_y = db.Column(db.Float, nullable=True)
    properties = db.Column(db.JSON, nullable=True)
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.node_id,
            "label": self.label,
            "position": {"x": self.position_x, "y": self.position_y} if self.position_x is not None and self.position_y is not None else None,
            "properties": self.properties or {}
        }

# Edge model for storing edges in concept maps
class Edge(db.Model):
    """Model representing an edge in a concept map."""
    __tablename__ = 'edges'
    
    id = db.Column(db.Integer, primary_key=True)
    concept_map_id = db.Column(db.Integer, db.ForeignKey('concept_maps.id', ondelete='CASCADE'), nullable=False)
    edge_id = db.Column(db.String(50), nullable=False)  # ID within the concept map
    source = db.Column(db.String(50), nullable=False)
    target = db.Column(db.String(50), nullable=False)
    label = db.Column(db.String(100), nullable=True)
    properties = db.Column(db.JSON, nullable=True)
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.edge_id,
            "source": self.source,
            "target": self.target,
            "label": self.label,
            "properties": self.properties or {}
        }

class ConceptMap(db.Model):
    """Model representing a concept map structure."""
    __tablename__ = 'concept_maps'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_public = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    nodes = db.relationship('Node', backref='concept_map', lazy=True, cascade="all, delete-orphan")
    edges = db.relationship('Edge', backref='concept_map', lazy=True, cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "user_id": self.user_id,
            "is_public": self.is_public,
            "is_deleted": self.is_deleted,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges]
        } 