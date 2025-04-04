from flask import Blueprint, request, jsonify
import os
import google.generativeai as genai
from dotenv import load_dotenv
from .mind_map import generate_concept_map
from .word_cloud import process_text_for_wordcloud
from .bubble_chart import process_text_for_bubble_chart

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