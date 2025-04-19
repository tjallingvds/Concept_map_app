"""
Models for the concept map application.
Currently using in-memory storage, but structured to easily migrate to a database.
"""

from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy
db = SQLAlchemy()


class User(db.Model):
    """Model representing a user in the application."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    auth0_id = db.Column(
        db.String(128),
        db.UniqueConstraint(name="uq_users_auth0_id"),  # ✅ give the constraint a name
        nullable=True
    )
    email = db.Column(db.String(120), unique=True, nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    is_active = db.Column(db.Boolean, default=True)

    # Relationship with concept maps
    concept_maps = db.relationship(
        "ConceptMap", backref="user", lazy=True, cascade="all, delete-orphan"
    )

    def __init__(
            self,
            email,
            user_id=None,
            auth0_id=None,
            display_name=None,
            bio=None,
            avatar_url=None,
    ):
        self.id = user_id
        self.auth0_id = auth0_id
        self.email = email
        self.display_name = display_name or email.split('@')[0]
        self.bio = bio
        self.avatar_url = avatar_url
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.is_active = True

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
            "isActive": self.is_active,
        }

    @classmethod
    def from_dict(cls, data, user_id=None):
        """Create a User instance from a dictionary."""
        user = cls(
            email=data.get("email", ""),
            user_id=user_id or data.get("id"),
            auth0_id=data.get("auth0Id"),
            display_name=data.get("displayName"),
            bio=data.get("bio"),
            avatar_url=data.get("avatarUrl"),
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

    __tablename__ = "nodes"

    id = db.Column(db.Integer, primary_key=True)
    concept_map_id = db.Column(
        db.Integer, db.ForeignKey("concept_maps.id", ondelete="CASCADE"), nullable=False
    )
    node_id = db.Column(db.String(50), nullable=False)  # ID within the concept map
    label = db.Column(db.String(100), nullable=False)
    position_x = db.Column(db.Float, nullable=True)
    position_y = db.Column(db.Float, nullable=True)
    properties = db.Column(db.JSON, nullable=True)

    # ConceptMap model is already defined above with SQLAlchemy

    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.node_id,
            "label": self.label,
            "position": (
                {"x": self.position_x, "y": self.position_y}
                if self.position_x is not None and self.position_y is not None
                else None
            ),
            "properties": self.properties or {},
        }


# Edge model for storing edges in concept maps
class Edge(db.Model):
    """Model representing an edge in a concept map."""

    __tablename__ = "edges"

    id = db.Column(db.Integer, primary_key=True)
    concept_map_id = db.Column(
        db.Integer, db.ForeignKey("concept_maps.id", ondelete="CASCADE"), nullable=False
    )
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
            "properties": self.properties or {},
        }


class ConceptMap(db.Model):
    """Model representing a concept map structure."""

    __tablename__ = "concept_maps"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE", name="fk_concept_maps_user_id"),
        nullable=False,
    )
    is_public = db.Column(db.Boolean, default=False)
    share_id = db.Column(db.String(50), nullable=True)
    is_favorite = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    image = db.Column(db.Text, nullable=True)
    format = db.Column(db.String(10), nullable=True)
    input_text = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    learning_objective = db.Column(db.Text, nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)

    # Relationships
    nodes = db.relationship(
        "Node", backref="concept_map", lazy=True, cascade="all, delete-orphan"
    )
    edges = db.relationship(
        "Edge", backref="concept_map", lazy=True, cascade="all, delete-orphan"
    )

    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "nodes": [node.to_dict() for node in self.nodes],
            "edges": [edge.to_dict() for edge in self.edges],
            "user_id": self.user_id,
            "is_public": self.is_public,
            "share_id": self.share_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "image": self.image,
            "format": self.format,
        }

    @classmethod
    def from_dict(cls, data, map_id=None):
        """Create a ConceptMap instance from a dictionary."""
        created_at = None
        if "created_at" in data and data["created_at"]:
            try:
                created_at = datetime.fromisoformat(data["created_at"])
            except (ValueError, TypeError):
                pass

        updated_at = None
        if "updated_at" in data and data["updated_at"]:
            try:
                updated_at = datetime.fromisoformat(data["updated_at"])
            except (ValueError, TypeError):
                pass

        return cls(
            name=data.get("name", ""),
            nodes=data.get("nodes", []),
            edges=data.get("edges", []),
            map_id=map_id or data.get("id"),
            user_id=data.get("user_id"),
            is_public=data.get("is_public", False),
            share_id=data.get("share_id"),
            created_at=created_at,
            updated_at=updated_at,
            image=data.get("image"),
            format=data.get("format"),
        )


class Note:
    """Model representing a user's note."""
    
    def __init__(self, title, content, note_id=None, user_id=None, is_public=False, 
                 share_id=None, created_at=None, updated_at=None, is_favorite=False, 
                 tags=None, description=None):
        self.id = note_id
        self.title = title
        self.content = content  # This would store the BlockNote editor content as JSON
        self.user_id = user_id  # To associate notes with users
        self.is_public = is_public  # Whether the note is publicly accessible
        self.share_id = share_id  # Unique ID for sharing the note
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.is_favorite = is_favorite  # Whether the note is marked as favorite
        self.tags = tags or []  # List of tags for the note
        self.description = description  # Brief description of the note
        self.is_deleted = False  # For soft deletion
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "user_id": self.user_id,
            "is_public": self.is_public,
            "share_id": self.share_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "is_favorite": self.is_favorite,
            "tags": self.tags,
            "description": self.description,
            "is_deleted": self.is_deleted
        }
    
    @classmethod
    def from_dict(cls, data, note_id=None):
        """Create a Note instance from a dictionary."""
        created_at = None
        if "created_at" in data and data["created_at"]:
            try:
                created_at = datetime.fromisoformat(data["created_at"])
            except (ValueError, TypeError):
                pass
                
        updated_at = None
        if "updated_at" in data and data["updated_at"]:
            try:
                updated_at = datetime.fromisoformat(data["updated_at"])
            except (ValueError, TypeError):
                pass
                
        note = cls(
            title=data.get("title", ""),
            content=data.get("content", {}),
            note_id=note_id or data.get("id"),
            user_id=data.get("user_id"),
            is_public=data.get("is_public", False),
            share_id=data.get("share_id"),
            created_at=created_at,
            updated_at=updated_at,
            is_favorite=data.get("is_favorite", False),
            tags=data.get("tags", []),
            description=data.get("description")
        )
        
        if "is_deleted" in data:
            note.is_deleted = bool(data["is_deleted"])
            
        return note


class Node:
    """Model representing a node in a concept map."""
    
    def __init__(self, node_id, label, position, properties=None):
        self.id = node_id
        self.label = label
        self.position = position
        self.properties = properties or {}
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "label": self.label,
            "position": self.position,
            "properties": self.properties
        }


class Edge:
    """Model representing an edge in a concept map."""
    
    def __init__(self, edge_id, source, target, label=None, properties=None):
        self.id = edge_id
        self.source = source
        self.target = target
        self.label = label
        self.properties = properties or {}
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "source": self.source,
            "target": self.target,
            "label": self.label,
            "properties": self.properties
        }