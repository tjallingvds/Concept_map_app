import os
import secrets
from http import HTTPStatus

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate

# Concept map logic imports
import concept_map_generation.crud_routes  # noqa
# Blueprint routes
from auth.routes import auth_bp
from concept_map_generation.generation_routes import concept_map_bp
from debug.routes import debug_bp
from models import db
from notes.routes import notes_bp
from process.routes import process_bp
from templates.routes import templates_bp
from user.routes import user_bp

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

# Configure CORS
CORS(
    app,
    origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///concept_map.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size

# Initialize extensions
db.init_app(app)
migrate = Migrate(app, db)
with app.app_context():
    db.create_all()

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(concept_map_bp)
app.register_blueprint(debug_bp)
app.register_blueprint(process_bp)
app.register_blueprint(user_bp)
app.register_blueprint(notes_bp)
app.register_blueprint(templates_bp)


# Health check endpoint
@app.route("/api/health/")
def health_check():
    return jsonify({"status": "healthy"}), HTTPStatus.OK
