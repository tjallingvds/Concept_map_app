import os
from functools import wraps
from http import HTTPStatus

import requests
from authlib.jose import JsonWebToken
from flask import request, jsonify

from models import User, db

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "your-tenant.auth0.com")
API_AUDIENCE = os.getenv("AUTH0_API_AUDIENCE", "https://your-api-identifier")
JWKS_URL = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"

# Safely get JWKS with error handling
try:
    response = requests.get(JWKS_URL)
    if response.status_code != 200:
        print(f"Error fetching JWKS: HTTP {response.status_code}")
        print(f"Please check your AUTH0_DOMAIN environment variable (current: {AUTH0_DOMAIN})")
        JWKS = {"keys": []}  # Empty JWKS as fallback
    else:
        JWKS = response.json()
except requests.exceptions.RequestException as e:
    print(f"Network error fetching JWKS: {e}")
    print(f"Please check your AUTH0_DOMAIN environment variable (current: {AUTH0_DOMAIN})")
    print("Make sure you've set up the correct Auth0 domain in your .env file")
    JWKS = {"keys": []}  # Empty JWKS as fallback

jwt = JsonWebToken(["RS256"])


def requires_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header missing or malformed"}), HTTPStatus.UNAUTHORIZED

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
            return jsonify({"error": "Token invalid", "message": str(e)}), HTTPStatus.UNAUTHORIZED

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
