import http
import os
import uuid
from http import HTTPStatus

from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

from auth_utils import requires_auth, get_auth0_user
from models import db

auth_bp = Blueprint("auth", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}


@auth_bp.route("/uploads/<filename>/")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


# User profile routes
@auth_bp.route("/api/auth/profile/", methods=["GET"])
@requires_auth
def get_profile():
    user = get_auth0_user()
    return jsonify(user.to_dict()), HTTPStatus.OK


@auth_bp.route("/api/auth/profile/", methods=["PUT"])
@requires_auth
def update_profile():
    user = get_auth0_user()
    data = request.json
    user.update_profile(display_name=data.get("displayName"), bio=data.get("bio"))
    db.session.commit()
    return jsonify(user.to_dict()), HTTPStatus.OK


@auth_bp.route("/api/auth/profile/avatar/", methods=["POST"])
@requires_auth
def upload_avatar():
    user = get_auth0_user()

    if "avatar" not in request.files:
        return jsonify({"error": "No file part"}), HTTPStatus.BAD_REQUEST

    file = request.files["avatar"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), HTTPStatus.BAD_REQUEST

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(filepath)

        avatar_url = f"{request.host_url.rstrip('/')}/uploads/{unique_filename}"
        user.update_profile(avatar_url=avatar_url)
        db.session.commit()

        return jsonify({"message": "Avatar uploaded", "avatarUrl": avatar_url}), HTTPStatus.OK

    return jsonify({"error": "Invalid file type"}), HTTPStatus.BAD_REQUEST


@auth_bp.route("/api/auth/profile/avatar/", methods=["DELETE"])
@requires_auth
def remove_avatar():
    user = get_auth0_user()

    # Delete the avatar file if it exists
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        filename = user.avatar_url.split("/")[-1]
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

    # Remove avatar reference from DB
    user.update_profile(avatar_url=None)
    db.session.commit()

    return jsonify({"message": "Avatar removed successfully"}), http.HTTPStatus.OK


@auth_bp.route("/api/auth/account/", methods=["DELETE"])
@requires_auth
def delete_account():
    user = get_auth0_user()

    # Delete avatar
    if user.avatar_url and user.avatar_url.startswith("/uploads/"):
        filepath = os.path.join(UPLOAD_FOLDER, user.avatar_url.split("/")[-1])
        if os.path.exists(filepath):
            os.remove(filepath)

    # Mark as inactive and soft delete maps
    user.deactivate()
    for m in user.concept_maps:
        m.is_deleted = True
    db.session.commit()

    return jsonify({"message": "Account deleted"}), HTTPStatus.OK
