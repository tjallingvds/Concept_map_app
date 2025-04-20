from flask import Blueprint, request, jsonify

debug_bp = Blueprint("debug", __name__)


@debug_bp.route("/api/debug/process-drawing", methods=["POST"])
def debug_process_drawing():
    """Debug endpoint for drawing processing that always returns valid data"""
    print("DEBUG: Process drawing API called")
    data = request.json

    # Log received data
    image_content = None
    svg_content = None

    if data:
        if "imageContent" in data:
            image_content = data["imageContent"]
            content_preview = (
                image_content[:50] + "..." if len(image_content) > 50 else image_content
            )
            print(f"DEBUG: Received image content length: {len(image_content)}")
            print(f"DEBUG: Image content preview: {content_preview}")

            # For compatibility with our mock response, create a minimal SVG wrapper
            svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><image href="{image_content}" width="800" height="600"/></svg>'
        elif "svgContent" in data:
            svg_content = data["svgContent"]
            content_preview = (
                svg_content[:100] + "..." if len(svg_content) > 100 else svg_content
            )
            print(f"DEBUG: Received SVG content length: {len(svg_content)}")
            print(f"DEBUG: SVG content preview: {content_preview}")
        else:
            print("DEBUG: No image or SVG content received")
            return jsonify({"error": "No image or SVG content provided"}), 400
    else:
        print("DEBUG: No data received")
        return jsonify({"error": "No data provided"}), 400

    # Create a mock OCR response
    mock_response = {
        "concepts": [
            {
                "id": "c1",
                "name": "Mock Concept 1",
                "description": "This is a mock concept",
            },
            {
                "id": "c2",
                "name": "Mock Concept 2",
                "description": "Another mock concept",
            },
        ],
        "relationships": [{"source": "c1", "target": "c2", "label": "relates to"}],
        "image": svg_content,  # Return the original SVG content
        "format": "svg",
        "structure": {"type": "hierarchical", "root": "c1"},
    }

    # Return the mock response for testing
    print("DEBUG: Returning mock OCR response")
    return jsonify(mock_response)


# Add debug endpoint to list available Gemini models
@debug_bp.route("/api/debug/list-models", methods=["GET"])
def list_models():
    """Debug endpoint to list available Gemini models"""
    import google.generativeai as genai

    try:
        print("DEBUG: Listing available Gemini models")
        models = genai.list_models()
        model_info = []

        for model in models:
            model_info.append(
                {
                    "name": model.name,
                    "display_name": model.display_name,
                    "description": model.description,
                    "input_text": "text" in model.supported_generation_methods,
                    "input_image": hasattr(model, "input_image") and model.input_image,
                }
            )

        return jsonify({"models": model_info, "count": len(model_info)})
    except Exception as e:
        print(f"DEBUG: Error listing models: {str(e)}")
        return jsonify({"error": f"Failed to list models: {str(e)}"}), 500
