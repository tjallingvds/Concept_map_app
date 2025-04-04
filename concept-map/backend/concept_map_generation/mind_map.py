import json
import re
import logging
import graphviz
import google.generativeai as genai
import base64
from typing import List, Tuple, Dict, Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

##############################################################################
#                           GEMINI FLASH 2.0 API SETUP                       #
##############################################################################

def setup_gemini(api_key: str) -> None:
    """
    Configures Google Gemini API with the provided API key.
    """
    genai.configure(api_key=api_key)
    logger.info("Gemini API configured.")


##############################################################################
#                    Utility: Text Chunking (Optional)                     #
##############################################################################

def split_text_into_chunks(text: str, max_length: int = 800) -> List[str]:
    """
    Splits the input text into smaller chunks.
    
    Args:
        text (str): The input text.
        max_length (int): Maximum length of each chunk (in tokens or characters).
    
    Returns:
        List[str]: A list of text chunks.
    """
    # Here we use a simple split by sentences for demonstration.
    sentences = re.split(r'(?<=[.!?]) +', text)
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) > max_length:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks


##############################################################################
#                    Triple Extraction from Text                           #
##############################################################################

def extract_triples_from_text(text: str, model: genai.GenerativeModel) -> List[Tuple[str, str, str]]:
    """
    Extracts subject-predicate-object triples from the input text using Gemini API.
    
    Args:
        text (str): The input text.
        model (genai.GenerativeModel): An instance of the Gemini model.
    
    Returns:
        List[Tuple[str, str, str]]: A list of extracted triples.
    """
    # Check if text is too short or empty
    if not text or len(text.strip()) < 10:
        logger.warning("Input text is too short for meaningful triple extraction")
        # Return a default triple for very short inputs
        return [("Concept", "is", "Empty or too short")]
    
    prompt = """
    Extract subject-predicate-object triples from the following text. 
    Focus on key concepts and their relationships. 
    Format your response as a JSON array of arrays, where each inner array is a triple [subject, predicate, object].
    
    Even if the text is very short or simple, try to extract at least one meaningful triple.
    If the text only mentions a single concept, create a triple that relates that concept to its definition or property.
    
    For example:
    - If the text mentions "Photosynthesis converts sunlight into chemical energy", 
      one triple would be ["Photosynthesis", "converts", "sunlight into chemical energy"].
    - If the text only says "Artificial Intelligence", a triple could be ["Artificial Intelligence", "is", "a field of computer science"].
    - If the text is "Dogs are mammals", the triple would be ["Dogs", "are", "mammals"].
    
    Text: {}
    
    Output only the JSON array without any additional text or explanation.
    """.format(text)
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Extract JSON content (assuming it's enclosed in ```json and ```, or just as plain JSON)
        json_start = response_text.find('```json')
        json_end = response_text.rfind('```')
        
        if json_start != -1 and json_end != -1:
            json_content = response_text[json_start + 7:json_end].strip()
        else:
            # If not in code block, try to extract JSON directly
            json_content = response_text
        
        # Parse the JSON content
        triples_data = json.loads(json_content)
        
        # Validate the structure
        triples = []
        for triple in triples_data:
            if len(triple) == 3:
                triples.append((triple[0], triple[1], triple[2]))
        
        # If no valid triples were extracted, create a fallback triple
        if not triples and text.strip():
            # Extract the main topic from the text (first few words or the whole text if short)
            main_topic = text.strip().split()[0:3]
            main_topic = ' '.join(main_topic) if len(main_topic) <= 3 else text.strip()[:30]
            triples = [(main_topic, "is related to", "the topic of interest")]
            logger.info(f"Using fallback triple for text: {text[:50]}...")
        
        return triples
    except Exception as e:
        logger.error(f"Error extracting triples: {str(e)}")
        # Return a fallback triple even in case of errors
        if text.strip():
            main_topic = text.strip().split()[0:3]
            main_topic = ' '.join(main_topic) if len(main_topic) <= 3 else text.strip()[:30]
            return [(main_topic, "is", "the main concept")]
        return [("Error", "occurred during", "triple extraction")]


##############################################################################
#                    Concept Map JSON Generation                           #
##############################################################################

def generate_concept_map_json(triples: List[Tuple[str, str, str]], model: genai.GenerativeModel) -> Dict[str, Any]:
    """
    Generates a concept map JSON structure from the extracted triples.
    
    Args:
        triples (List[Tuple[str, str, str]]): A list of subject-predicate-object triples.
        model (genai.GenerativeModel): An instance of the Gemini model.
    
    Returns:
        Dict[str, Any]: A JSON structure representing the concept map.
    """
    # Format the triples for the prompt
    triples_text = "\n".join([f"['{s}', '{p}', '{o}']" for s, p, o in triples])
    
    prompt = """
    Convert the following subject-predicate-object triples into a concept map JSON structure.
    
    Triples:
    {}
    
    Generate a JSON with the following structure:
    {{"concept_maps": [{{"nodes": [...], "edges": [...], "central_concept": "...", "title": "..."}}]}}
    
    Where:
    - "nodes" is an array of objects, each with "id" (string), "label" (string), and "type" (string, one of: "central", "primary", "secondary")
    - "edges" is an array of objects, each with "source" (node id), "target" (node id), and "label" (the predicate)
    - "central_concept" is the most important concept in the map
    - "title" is a concise title for the concept map
    
    
    Ensure that:
    1. Each unique subject or object becomes a node
    2. The predicates become edge labels
    3. The most frequently mentioned concept becomes the central node
    4. Nodes directly connected to the central node are "primary" type
    5. Nodes connected to primary nodes are "secondary" type
    
    
    Output only the JSON without any additional text or explanation.
    
    """.format(triples_text)
    
    try:
        response = model.generate_content(prompt)
        raw_response = response.text
        
        # Extract JSON content
        json_start = raw_response.find('```json')
        json_end = raw_response.rfind('```')
        
        if json_start != -1 and json_end != -1:
            raw_response = raw_response[json_start + 7:json_end].strip()
        
        # Try to parse the JSON, with fallback for malformed responses
        try:
            concept_map = json.loads(raw_response)
            
            # Validate the structure has the expected keys
            if not isinstance(concept_map, dict) or 'concept_maps' not in concept_map:
                raise ValueError("Missing 'concept_maps' key in response")
                
            # Ensure there's at least one concept map
            if not concept_map['concept_maps'] or not isinstance(concept_map['concept_maps'], list):
                raise ValueError("'concept_maps' is empty or not a list")
                
            # Validate the first concept map has the required fields
            first_map = concept_map['concept_maps'][0]
            if not all(k in first_map for k in ['nodes', 'edges', 'central_concept', 'title']):
                raise ValueError("Concept map missing required fields")
                
            return concept_map
            
        except (json.JSONDecodeError, ValueError) as json_err:
            logger.error(f"Error parsing concept map JSON: {str(json_err)}. Raw response: {raw_response[:100]}...")
            
            # Create a basic concept map from the triples
            nodes = []
            edges = []
            node_ids = {}
            node_count = 0
            
            # Extract a title from the first triple
            title = triples[0][0] if triples else "Concept Map"
            central_concept = title
            
            # Create nodes and edges from triples
            for s, p, o in triples:
                if s not in node_ids:
                    node_ids[s] = f"node{node_count}"
                    nodes.append({"id": node_ids[s], "label": s, "type": "central" if node_count == 0 else "primary"})
                    node_count += 1
                    
                if o not in node_ids:
                    node_ids[o] = f"node{node_count}"
                    nodes.append({"id": node_ids[o], "label": o, "type": "secondary"})
                    node_count += 1
                    
                edges.append({"source": node_ids[s], "target": node_ids[o], "label": p})
            
            return {
                "concept_maps": [{
                    "nodes": nodes,
                    "edges": edges,
                    "central_concept": central_concept,
                    "title": title
                }]
            }
    except Exception as e:
        logger.error(f"Error generating concept map JSON: {str(e)}")
        # Create a minimal valid concept map structure for error cases
        error_title = "Error: Failed to generate concept map"
        return {
            "concept_maps": [{
                "nodes": [
                    {"id": "node0", "label": "Error", "type": "central"},
                    {"id": "node1", "label": "Please try again", "type": "primary"}
                ],
                "edges": [
                    {"source": "node0", "target": "node1", "label": "suggests"}
                ],
                "central_concept": "Error",
                "title": error_title
            }]
        }


##############################################################################
#                    SVG Generation from Concept Map                       #
##############################################################################

def generate_concept_map_svg(concept_map_json: Dict[str, Any]) -> str:
    """
    Generates an SVG visualization of the concept map using Graphviz.
    
    Args:
        concept_map_json (Dict[str, Any]): The JSON structure of the concept map.
    
    Returns:
        str: Base64 encoded SVG representation of the concept map.
    """
    try:
        if "concept_maps" not in concept_map_json:
            raise ValueError("Invalid JSON: 'concept_maps' key not found.")
        concept_data = concept_map_json["concept_maps"]
        
        if not concept_data or not isinstance(concept_data, list) or len(concept_data) == 0:
            raise ValueError("Invalid JSON: 'concept_maps' is empty or not a list.")
        
        # Get the first concept map
        concept_map = concept_data[0]
        
        # Create a new directed graph
        dot = graphviz.Digraph(format='svg')
        dot.attr(rankdir='TB', size='8,5', overlap='false', splines='true')
        
        # Add nodes
        for node in concept_map.get("nodes", []):
            node_id = str(node.get("id", ""))
            label = node.get("label", "")
            node_type = node.get("type", "")
            
            # Style based on node type
            if node_type == "central":
                dot.node(node_id, label, style="filled", fillcolor="#4CAF50", fontcolor="white", shape="ellipse", fontsize="16")
            elif node_type == "primary":
                dot.node(node_id, label, style="filled", fillcolor="#2196F3", fontcolor="white", shape="ellipse")
            else:  # secondary
                dot.node(node_id, label, style="filled", fillcolor="#FFC107", fontcolor="black", shape="ellipse")
        
        # Add edges
        for edge in concept_map.get("edges", []):
            source = str(edge.get("source", ""))
            target = str(edge.get("target", ""))
            label = edge.get("label", "")
            
            dot.edge(source, target, label=label, fontsize="10")
        
        # Render the graph to SVG
        svg_data = dot.pipe()
        
        # Convert to base64
        return base64.b64encode(svg_data).decode('utf-8')
    except Exception as e:
        logger.error(f"Error generating SVG: {str(e)}")
        raise


##############################################################################
#                    Main Processing Pipeline                              #
##############################################################################

def generate_concept_map(input_text: str, model: genai.GenerativeModel, api_key: str) -> str:
    """
    Main processing pipeline for concept map generation.
    
    Args:
        input_text (str): The input text to generate the concept map from.
        model (genai.GenerativeModel): An instance of the Gemini model.
        api_key (str): The Gemini API key.
        
    Returns:
        str: Base64 encoded SVG representation of the concept map.
    """
    try:
        setup_gemini(api_key)
        # Create a single model instance for reuse
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        # Handle empty or very short input
        if not input_text or len(input_text.strip()) < 5:
            logger.warning("Input text is empty or too short")
            # Create a simple fallback triple for empty input
            all_triples = [("Empty Input", "requires", "more content")]
        else:
            # Optionally, chunk the text if it's very long
            chunks = split_text_into_chunks(input_text) if len(input_text) > 800 else [input_text]
            all_triples = []
            for chunk in chunks:
                triples = extract_triples_from_text(chunk, model)
                all_triples.extend(triples)
            
            # If still no triples, create a simple concept map with the input text
            if not all_triples:
                logger.warning("No triples extracted from input, using fallback")
                # Extract a title from the input (first few words)
                title_words = input_text.strip().split()[:3]
                title = ' '.join(title_words) if title_words else "Concept"
                # Create a simple fallback triple
                all_triples = [(title, "is related to", input_text[:50] + "...")]

        concept_map = generate_concept_map_json(all_triples, model)
        svg_b64 = generate_concept_map_svg(concept_map)
        logger.info("Concept map generation successful.")
        return svg_b64
    except Exception as e:
        logger.exception("Concept map generation failed.")
        # Instead of re-raising, return a simple error SVG
        try:
            # Create a simple error concept map
            error_triples = [("Error", "occurred during", "concept map generation")]
            concept_map = generate_concept_map_json(error_triples, model)
            return generate_concept_map_svg(concept_map)
        except:
            # If even the error map fails, raise the original exception
            raise RuntimeError(f"Concept map generation failed: {str(e)}") from e