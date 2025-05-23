"""
Script to run the Flask application.
"""
import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from app import app

if __name__ == '__main__':
    # Get port from environment variable or default to 5000
    port = int(os.environ.get('PORT', 5001))

    # Run the app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=(os.environ.get('FLASK_DEBUG', '0') == '1')
    )
