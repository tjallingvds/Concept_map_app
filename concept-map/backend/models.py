"""
Models for the concept map application.
Currently using in-memory storage, but structured to easily migrate to a database.
"""
from werkzeug.security import generate_password_hash, check_password_hash

class User:
    """Model representing a user in the application."""
    
    def __init__(self, email, password, user_id=None):
        self.id = user_id
        self.email = email
        self.password_hash = generate_password_hash(password)
    
    def verify_password(self, password):
        """Verify the user's password."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert the model to a dictionary representation (excluding password)."""
        return {
            "id": self.id,
            "email": self.email
        }
    
    @classmethod
    def from_dict(cls, data, user_id=None):
        """Create a User instance from a dictionary."""
        # Note: This should only be used for creating new users, not loading from DB
        # as the password would be hashed again
        return cls(
            email=data.get("email", ""),
            password=data.get("password", ""),
            user_id=user_id or data.get("id")
        )


class ConceptMap:
    """Model representing a concept map structure."""
    
    def __init__(self, name, nodes=None, edges=None, map_id=None, user_id=None):
        self.id = map_id
        self.name = name
        self.nodes = nodes or []
        self.edges = edges or []
        self.user_id = user_id  # Add user_id to associate maps with users
    
    def to_dict(self):
        """Convert the model to a dictionary representation."""
        return {
            "id": self.id,
            "name": self.name,
            "nodes": self.nodes,
            "edges": self.edges,
            "user_id": self.user_id
        }
    
    @classmethod
    def from_dict(cls, data, map_id=None):
        """Create a ConceptMap instance from a dictionary."""
        return cls(
            name=data.get("name", ""),
            nodes=data.get("nodes", []),
            edges=data.get("edges", []),
            map_id=map_id or data.get("id"),
            user_id=data.get("user_id")
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