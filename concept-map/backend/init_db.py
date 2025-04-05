from app import app, db

# The app is already configured to use the SQLite database file
# as defined in app.py with: app.config["SQLALCHEMY_DATABASE_URI"]

with app.app_context():
    db.create_all()
    print("Database tables created successfully!")
    print(f"Using database: {app.config['SQLALCHEMY_DATABASE_URI']}")
