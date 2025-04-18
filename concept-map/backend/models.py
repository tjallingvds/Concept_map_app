"""
Models for the concept map application.
Currently using in-memory storage, but structured to easily migrate to a database.
"""
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

class User:
    """Model representing a user in the application."""
    
    def __init__(self, email, password, user_id=None, display_name=None, bio=None, avatar_url=None):
        self.id = user_id
        self.email = email
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256' )
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


class ConceptMap:
    """Model representing a concept map structure."""
    
    def __init__(self, name, nodes=None, edges=None, map_id=None, user_id=None, is_public=False, share_id=None, created_at=None, updated_at=None, image=None, format=None):
        self.id = map_id
        self.name = name
        self.nodes = nodes or []
        self.edges = edges or []
        self.user_id = user_id  # Add user_id to associate maps with users
        self.is_public = is_public  # Whether the map is publicly accessible
        self.share_id = share_id  # Unique ID for sharing the map
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        self.image = image  # Store the image representation
        self.format = format  # Format of the image (svg, png, etc.)
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "nodes": self.nodes,
            "edges": self.edges,
            "user_id": self.user_id,
            "is_public": self.is_public,
            "share_id": self.share_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "image": self.image,
            "format": self.format
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
            format=data.get("format")
        )


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