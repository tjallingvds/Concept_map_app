import os
import secrets

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate

from auth.routes import auth_bp
from concept_map_generation.generation_routes import concept_map_bp
from debug.routes import debug_bp
from models import db
from process.routes import process_bp
import concept_map_generation.crud_routes # noqa
from user.routes import user_bp

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

# Configure CORS with specific settings
CORS(app,
     origins=[os.environ.get('FRONTEND_URL', 'http://localhost:5173')],  # Frontend server from env or default
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'Accept'],
     expose_headers=['Content-Type', 'Authorization'],
     max_age=3600)  # Cache preflight requests for 1 hour

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///concept_map.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size
app.register_blueprint(auth_bp)
app.register_blueprint(concept_map_bp)
app.register_blueprint(debug_bp)
app.register_blueprint(process_bp)
app.register_blueprint(user_bp)


# Health check endpoint
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"}), 200


# Create database tables within application context
with app.app_context():
    db.create_all()
