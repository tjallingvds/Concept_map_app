import os

import google.generativeai as genai
from dotenv import load_dotenv
from flask import Blueprint, request, jsonify

from .bubble_chart import process_text_for_bubble_chart
from .mind_map import generate_concept_map
from .ocr_concept_map import process_drawing_for_concept_map
from .word_cloud import process_text_for_wordcloud

# Load environment variables
load_dotenv()

# Get API key from environment variables
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")
# Ensure API key is str type
GEMINI_API_KEY = str(GEMINI_API_KEY)

# Create a blueprint for concept map generation routes
concept_map_bp = Blueprint('concept_map', __name__, url_prefix='/api/concept-map')


# Initialize Gemini model
def get_gemini_model():
    """Initialize and return a Gemini model instance"""
    genai.configure(api_key=GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-2.0-flash")


@concept_map_bp.route('/generate', methods=['POST'])
def generate_map():
    """Generate a concept map based on input text and map type"""
    try:
        data = request.json

        # Validate request data
        if not data or 'text' not in data or 'mapType' not in data:
            return jsonify({
                'error': 'Missing required fields: text and mapType'
            }), 400

        text = data['text']
        map_type = data['mapType']
        title = data.get('title', 'Concept Map')

        # Check if text is provided
        if not text.strip():
            return jsonify({
                'error': 'Text content cannot be empty'
            }), 400

        # Initialize Gemini model
        try:
            model = get_gemini_model()
        except ValueError as e:
            return jsonify({
                'error': str(e)
            }), 500

        # Generate the appropriate visualization based on map type
        if map_type == 'mindmap':
            result = generate_concept_map(text, model, GEMINI_API_KEY)
            # Ensure we're returning a properly formatted response
            # The frontend expects either a data URL or a base64 string with format
            return jsonify({
                'image': result,  # This is already base64 encoded from generate_concept_map
                'format': 'svg'
            })

        elif map_type == 'wordcloud':
            result = process_text_for_wordcloud(text, model, GEMINI_API_KEY)
            return jsonify({
                'image': result['word_cloud'],
                'concepts': result['concepts'],
                'format': 'png'
            })

        elif map_type == 'bubblechart':
            result = process_text_for_bubble_chart(text, model)
            return jsonify({
                'image': result['bubble_chart'],
                'concepts': result['concepts'],
                'format': 'png'
            })

        else:
            return jsonify({
                'error': f'Unsupported map type: {map_type}'
            }), 400

    except Exception as e:
        return jsonify({
            'error': f'Error generating concept map: {str(e)}'
        }), 500


@concept_map_bp.route('/extract-concepts', methods=['POST'])
def extract_concepts():
    """Extract key concepts from input text without generating a visualization"""
    try:
        data = request.json

        # Validate request data
        if not data or 'text' not in data:
            return jsonify({
                'error': 'Missing required field: text'
            }), 400

        text = data['text']

        # Check if text is provided
        if not text.strip():
            return jsonify({
                'error': 'Text content cannot be empty'
            }), 400

        # Initialize Gemini model
        try:
            model = get_gemini_model()
        except ValueError as e:
            return jsonify({
                'error': str(e)
            }), 500

        # Extract concepts using the word cloud module's function
        from .word_cloud import extract_concepts_from_text
        concepts = extract_concepts_from_text(text, model)

        return jsonify({
            'concepts': concepts
        })

    except Exception as e:
        return jsonify({
            'error': f'Error extracting concepts: {str(e)}'
        }), 500


@concept_map_bp.route('/process-drawing', methods=['POST'])
def process_drawing():
    """Process a drawing (SVG or PNG) to extract concepts and generate a digital concept map"""
    try:
        print("*** Process Drawing API called ***")
        data = request.json

        # Validate request data - accept either svgContent or imageContent
        if not data:
            print("Missing request data")
            return jsonify({
                'error': 'Missing request data'
            }), 400

        # Check if we have image content (PNG, JPEG, etc.)
        if 'imageContent' in data:
            image_content = data['imageContent']
            print(f"Received image content length: {len(image_content)}")

            # Check if content is provided
            if not image_content.strip():
                print("Image content is empty")
                return jsonify({
                    'error': 'Image content cannot be empty'
                }), 400

            # Check if format parameters are provided
            image_format = data.get('format', '').lower()
            prevent_jpeg = data.get('preventJpegConversion', False)

            print(f"Image format: {image_format}, Prevent JPEG conversion: {prevent_jpeg}")

            # For PNG data URLs, we can now pass them directly to the OCR function
            if image_content.startswith('data:image/png') or image_format == 'png':
                print("Direct PNG processing")
                svg_content = image_content  # Pass the PNG data URL directly
            else:
                # For compatibility, convert image data URL to SVG format our backend expects
                print("Creating SVG wrapper for image")
                svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><image href="{image_content}" width="800" height="600"/></svg>'

            print(f"Prepared content for processing, length: {len(svg_content)}")

        # Check for SVG content (backwards compatibility)
        elif 'svgContent' in data:
            svg_content = data['svgContent']
            print(f"Received SVG content length: {len(svg_content)}")

            # Check if content is provided
            if not svg_content.strip():
                print("SVG content is empty")
                return jsonify({
                    'error': 'SVG content cannot be empty'
                }), 400
        else:
            print("Missing required field: imageContent or svgContent")
            return jsonify({
                'error': 'Missing required field: imageContent or svgContent'
            }), 400

        # Initialize Gemini model
        try:
            print("Initializing Gemini model")
            model = get_gemini_model()
        except ValueError as e:
            print(f"Error initializing Gemini model: {str(e)}")
            return jsonify({
                'error': str(e)
            }), 500

        # Process the drawing with OCR and generate concept map
        print("Processing drawing with OCR")
        result = process_drawing_for_concept_map(svg_content, model)

        # Check if there was an error during processing
        if 'error' in result:
            print(f"Error processing drawing: {result['error']}")
            return jsonify({
                'error': result['error']
            }), 500

        print(f"OCR processing successful with {len(result.get('concepts', []))} concepts")
        return jsonify(result)

    except Exception as e:
        print(f"Exception in process_drawing route: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Error processing drawing: {str(e)}'
        }), 500


# Add a debug endpoint to visualize concept data directly
@concept_map_bp.route('/debug/visualize-concepts', methods=['POST'])
def debug_visualize_concepts():
    """Debug endpoint to visualize concept data directly without OCR"""
    try:
        data = request.json
        if not data or 'concepts' not in data or 'relationships' not in data:
            return jsonify({'error': 'Missing required fields: concepts and relationships'}), 400

        # Get map style
        style = data.get('mapType', 'mindmap')

        # Import the function to generate SVG
        from .mind_map import generate_concept_map_svg

        # Build the concept map structure
        concept_map = {
            "nodes": [],
            "edges": []
        }

        # Add nodes from the provided concepts
        for concept in data['concepts']:
            concept_map["nodes"].append({
                "id": concept.get("id"),
                "label": concept.get("name"),
                "description": concept.get("description", "")
            })

        # Add edges from the provided relationships
        for rel in data['relationships']:
            concept_map["edges"].append({
                "source": rel.get("source"),
                "target": rel.get("target"),
                "label": rel.get("label", "relates to")
            })

        # Generate the SVG
        layout_style = data.get('structure', {}).get('type', 'hierarchical')
        if layout_style not in ['hierarchical', 'radial', 'network']:
            layout_style = 'hierarchical'

        # Debug the concept map structure
        print("DEBUG: Concept map structure before SVG generation:")
        print(f"DEBUG: Type of concept_map: {type(concept_map)}")
        print(f"DEBUG: Keys in concept_map: {concept_map.keys()}")
        print(f"DEBUG: Number of nodes: {len(concept_map['nodes'])}")
        print(f"DEBUG: Number of edges: {len(concept_map['edges'])}")
        if concept_map['nodes']:
            print(f"DEBUG: First node: {concept_map['nodes'][0]}")
        if concept_map['edges']:
            print(f"DEBUG: First edge: {concept_map['edges'][0]}")

        # Ensure the concept map structure is valid
        if not concept_map['nodes'] or not concept_map['edges']:
            print("WARNING: Empty nodes or edges list, creating placeholder")
            # Add placeholder node and edge if needed
            if not concept_map['nodes']:
                concept_map['nodes'].append({
                    "id": "placeholder",
                    "label": "Placeholder Node",
                    "description": "No valid nodes found"
                })
            if not concept_map['edges'] and len(concept_map['nodes']) >= 2:
                concept_map['edges'].append({
                    "source": concept_map['nodes'][0]['id'],
                    "target": concept_map['nodes'][1]['id'],
                    "label": "placeholder"
                })

        # Generate the SVG
        svg_b64 = generate_concept_map_svg(concept_map, layout_style)

        # Return the visualization result
        return jsonify({
            "image": svg_b64,
            "format": "svg",
            "nodes": concept_map["nodes"],
            "edges": concept_map["edges"]
        })

    except Exception as e:
        print(f"Error visualizing concepts: {str(e)}")
        return jsonify({'error': f'Failed to visualize concepts: {str(e)}'}), 500
