from flask import jsonify, Blueprint

from auth_utils import get_auth0_user, requires_auth
from concept_map_generation.crud_routes import concept_maps, users
from models import User

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route("/recent-maps", methods=["GET"])
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


@user_bp.route("/saved-maps", methods=["GET"])
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
        m
        for m in concept_maps
        if m.get("user_id") == user_id and not m.get("deleted", False)
    ]

    # Sort by updated_at if available
    user_maps.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

    return jsonify(user_maps), 200
