import os
import secrets
from datetime import timedelta

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_migrate import Migrate

from auth.routes import auth_bp
from concept_map_generation.generation_routes import concept_map_bp
from debug.routes import debug_bp
from models import db
from process.routes import process_bp

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(16))

# Configure CORS with specific settings
CORS(app, 
     supports_credentials=True,
     origins=[os.environ.get('FRONTEND_URL', 'http://localhost:5173')],  # Frontend server from env or default
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'Accept'],
     expose_headers=['Content-Type', 'Authorization'],
     max_age=3600)  # Cache preflight requests for 1 hour

# Configure session settings
app.config["SESSION_COOKIE_SECURE"] = True  # Only send cookie over HTTPS
app.config["SESSION_COOKIE_HTTPONLY"] = (
    True  # Prevent JavaScript access to session cookie
)
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # Protect against CSRF
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(
    days=7
)  # Session expires in 7 days

# Configure database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "sqlite:///concept_map.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize database
db.init_app(app)
migrate = Migrate(app, db)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size
app.register_blueprint(auth_bp)
app.register_blueprint(concept_map_bp)
app.register_blueprint(debug_bp)
app.register_blueprint(process_bp)
# Create uploads directory if it doesn't exist


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)


# Health check endpoint
@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy"}), 200


# Create database tables within application context
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(port=5001, debug=True)
