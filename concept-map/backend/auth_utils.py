from functools import wraps

import os
import requests
from authlib.jose import JsonWebToken
from flask import request, jsonify

from models import User, db

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "your-tenant.auth0.com")
API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE", "https://your-api-identifier")
JWKS_URL = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
JWKS = requests.get(JWKS_URL).json()

jwt = JsonWebToken(["RS256"])


def requires_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header missing or malformed"}), 401

        token = auth_header.split(" ")[1]

        try:
            claims = jwt.decode(
                token,
                key=JWKS,
                claims_options={
                    "iss": {"values": [f"https://{AUTH0_DOMAIN}/"]},
                    "aud": {"values": [API_AUDIENCE]},
                }
            )
            claims.validate()  # ✅ no args needed
            request.auth_user = claims
        except Exception as e:
            return jsonify({"error": "Token invalid", "message": str(e)}), 401

        return f(*args, **kwargs)

    return wrapper


def get_auth0_user():
    sub = request.auth_user.get("sub")
    token = request.headers.get("Authorization").split()[1]

    user = User.query.filter_by(auth0_id=sub).first()
    if user:
        return user

    # Fetch user info
    resp = requests.get(
        f"https://{AUTH0_DOMAIN}/userinfo",
        headers={"Authorization": f"Bearer {token}"}
    )

    if not resp.ok:
        raise Exception("Failed to fetch user info from Auth0")

    info = resp.json()
    email = info.get("email")
    name = info.get("name", "")
    picture = info.get("picture", "")

    user = User(
        auth0_id=sub,
        email=email,
        display_name=name,
        avatar_url=picture
    )
    db.session.add(user)
    db.session.commit()
    return user
