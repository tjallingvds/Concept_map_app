# Concept Map API Backend

This is the backend API for the Concept Map application. It's built using Flask, a lightweight WSGI web application framework in Python.

## Features

- RESTful API for concept maps management
- Endpoints for creating, reading, updating, and deleting concept maps
- CORS support for frontend integration

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

5. Run the server:
```bash
flask run
```

The API server will start at http://127.0.0.1:5000/

## API Endpoints

### Health Check
- `GET /api/health`: Check if API is running

### Concept Maps
- `GET /api/concept-maps`: Get all concept maps
- `POST /api/concept-maps`: Create a new concept map
- `GET /api/concept-maps/<id>`: Get a specific concept map
- `PUT /api/concept-maps/<id>`: Update a concept map
- `DELETE /api/concept-maps/<id>`: Delete a concept map

## Development

For development purposes, the application is configured to run in debug mode which enables:
- Auto-reload when code changes
- Detailed error messages

## Future Improvements

- Database integration (replacing in-memory storage)
- User authentication and authorization
- Advanced search and filtering
- Pagination support 