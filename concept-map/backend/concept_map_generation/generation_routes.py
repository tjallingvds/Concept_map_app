import os

from dotenv import load_dotenv
from flask import Blueprint, jsonify, request

from .bubble_chart import process_text_for_bubble_chart
from .mind_map import generate_concept_map
from .ocr_concept_map import process_drawing_for_concept_map
from .word_cloud import process_text_for_wordcloud

# Load environment variables
load_dotenv()


# Create a blueprint for concept map generation routes
concept_map_bp = Blueprint("concept_map", __name__, url_prefix="/api/concept-map")


# Initialize Gemini model


# Add a debug endpoint to visualize concept data directly
@concept_map_bp.route("/debug/visualize-concepts", methods=["POST"])
def debug_visualize_concepts():
    """Debug endpoint to visualize concept data directly without OCR"""
    try:
        data = request.json
        if not data or "concepts" not in data or "relationships" not in data:
            return jsonify({"error": "Missing required fields: concepts and relationships"}), 400

        # Get map style
        style = data.get("mapType", "mindmap")

        # Import the function to generate SVG
        from .mind_map import generate_concept_map_svg

        # Build the concept map structure
        concept_map = {"nodes": [], "edges": []}

        # Add nodes from the provided concepts
        for concept in data["concepts"]:
            concept_map["nodes"].append(
                {
                    "id": concept.get("id"),
                    "label": concept.get("name"),
                    "description": concept.get("description", ""),
                }
            )

        # Add edges from the provided relationships
        for rel in data["relationships"]:
            concept_map["edges"].append(
                {
                    "source": rel.get("source"),
                    "target": rel.get("target"),
                    "label": rel.get("label", "relates to"),
                }
            )

        # Generate the SVG
        layout_style = data.get("structure", {}).get("type", "hierarchical")
        if layout_style not in ["hierarchical", "radial", "network"]:
            layout_style = "hierarchical"

        # Debug the concept map structure
        print("DEBUG: Concept map structure before SVG generation:")
        print(f"DEBUG: Type of concept_map: {type(concept_map)}")
        print(f"DEBUG: Keys in concept_map: {concept_map.keys()}")
        print(f"DEBUG: Number of nodes: {len(concept_map['nodes'])}")
        print(f"DEBUG: Number of edges: {len(concept_map['edges'])}")
        if concept_map["nodes"]:
            print(f"DEBUG: First node: {concept_map['nodes'][0]}")
        if concept_map["edges"]:
            print(f"DEBUG: First edge: {concept_map['edges'][0]}")

        # Ensure the concept map structure is valid
        if not concept_map["nodes"] or not concept_map["edges"]:
            print("WARNING: Empty nodes or edges list, creating placeholder")
            # Add placeholder node and edge if needed
            if not concept_map["nodes"]:
                concept_map["nodes"].append(
                    {
                        "id": "placeholder",
                        "label": "Placeholder Node",
                        "description": "No valid nodes found",
                    }
                )
            if not concept_map["edges"] and len(concept_map["nodes"]) >= 2:
                concept_map["edges"].append(
                    {
                        "source": concept_map["nodes"][0]["id"],
                        "target": concept_map["nodes"][1]["id"],
                        "label": "placeholder",
                    }
                )

        # Generate the SVG
        svg_b64 = generate_concept_map_svg(concept_map, layout_style)

        # Return the visualization result
        return jsonify(
            {
                "image": svg_b64,
                "format": "svg",
                "nodes": concept_map["nodes"],
                "edges": concept_map["edges"],
            }
        )

    except Exception as e:
        print(f"Error visualizing concepts: {str(e)}")
        return jsonify({"error": f"Failed to visualize concepts: {str(e)}"}), 500
