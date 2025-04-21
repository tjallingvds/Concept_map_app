from http import HTTPStatus

from flask import jsonify, Blueprint

from templates.templates_utils import mock_template_structures

templates_bp = Blueprint("templates", __name__, url_prefix='/api/templates')


@templates_bp.route("/<string:template_id>/", methods=["GET"])
def get_template_data(template_id):
    """Get the structure (nodes/edges/info) of a specific template."""
    print(f"Received request for template ID: {template_id}")  # For debugging

    # Find the template data in our mock dictionary
    template_data = mock_template_structures.get(template_id)

    if not template_data:
        print(f"Template not found: {template_id}")
        return jsonify({"error": "Template not found"}), HTTPStatus.NOT_FOUND

    # Return the found template data as JSON
    print(f"Returning data for template: {template_id}")
    return jsonify(template_data), HTTPStatus.OK
