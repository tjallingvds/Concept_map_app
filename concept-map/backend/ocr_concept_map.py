import logging
import traceback
from PIL import Image
from io import BytesIO
import base64

# Import the text extraction function from mind_map module
from concept_map_generation.mind_map import extract_concept_map_from_text, generate_concept_map_svg

def process_drawing_for_concept_map(drawing_data, prompt=None, concept_map_params=None):
    """
    Process a drawing (SVG or image data URL) to extract concepts and generate a concept map.
    
    Args:
        drawing_data (str): SVG string or image data URL
        prompt (str, optional): Additional instructions for the AI model
        concept_map_params (dict, optional): Parameters for concept map generation
        
    Returns:
        dict: Dictionary containing the generated concept map data with nodes and edges
    """
    # ... existing code ...
    
    try:
        # For text-based input, we can directly use the input_text field
        if concept_map_params and 'input_text' in concept_map_params and concept_map_params['input_text']:
            # Process the text input to extract concepts and relationships
            logging.info("Processing concept map from text input")
            content = concept_map_params['input_text']
            
            # Parse the content to extract concepts and relationships
            concept_data = extract_concept_map_from_text(content)
            
            # Transform the data into the required format (nodes and edges)
            nodes = []
            edges = []
            
            # Process concepts into nodes
            for concept in concept_data.get("concepts", []):
                node = {
                    "id": concept.get("id", f"c{len(nodes)+1}"),
                    "label": concept.get("name", "Unnamed Concept"),
                    "description": concept.get("description", "")
                }
                nodes.append(node)
            
            # Process relationships into edges
            for relationship in concept_data.get("relationships", []):
                edge = {
                    "source": relationship.get("source", ""),
                    "target": relationship.get("target", ""),
                    "label": relationship.get("label", "relates to")
                }
                edges.append(edge)
            
            # Return the formatted data
            result = {
                "nodes": nodes,
                "edges": edges,
                "structure": concept_data.get("structure", {
                    "type": "hierarchical",
                    "root": nodes[0]["id"] if nodes else "c1"
                }),
                "image": drawing_data,  # Return the original drawing
                "rawText": content      # Return the raw text for debugging
            }
            
            return result
        
        # Handle other processing modes (OCR, etc.)
        # ... existing code ...
    
    except Exception as e:
        logging.error(f"Error in process_drawing_for_concept_map: {str(e)}")
        traceback.print_exc()
        return {"error": str(e), "image": drawing_data} 
