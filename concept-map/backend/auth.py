from functools import wraps
from flask import request, jsonify
from authlib.jose import JsonWebToken
import requests
import os

from models import User, db

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN")
API_AUDIENCE = os.environ.get("AUTH0_API_AUDIENCE")
JWKS_URL = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"

# Cache JWKS keys
jwks = requests.get(JWKS_URL).json()
jwt = JsonWebToken(["RS256"])

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", None)
        if not auth:
            return jsonify({"error": "Authorization header missing"}), 401

        parts = auth.split()
        if parts[0].lower() != "bearer" or len(parts) != 2:
            return jsonify({"error": "Invalid auth header"}), 401

        token = parts[1]
        try:
            claims = jwt.decode(token, jwks)
            claims.validate_audience(API_AUDIENCE)
            claims.validate_issuer(f"https://{AUTH0_DOMAIN}/")
            request.auth_user = claims
        except Exception as e:
            return jsonify({"error": "Token invalid", "message": str(e)}), 401

        return f(*args, **kwargs)

    return decorated


def get_auth0_user():
    sub = request.auth_user.get("sub")  # Auth0 ID
    email = request.auth_user.get("email")
    name = request.auth_user.get("name", "")
    picture = request.auth_user.get("picture", "")

    user = User.query.filter_by(auth0_id=sub).first()

    if not user:
        # Auto-create the user in your DB
        user = User(
            auth0_id=sub,
            email=email,
            display_name=name,
            avatar_url=picture,
        )
        db.session.add(user)
        db.session.commit()

    return user

