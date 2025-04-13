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

def split_text_into_chunks(text: str, max_length: int = 12000) -> List[str]:
    """
    Splits the input text into smaller chunks.
    
    Args:
        text (str): The input text.
        max_length (int): Maximum length of each chunk (in tokens or characters).
                         Default is now 12000 to leverage Gemini's large context window.
    
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
    
    prompt = f"""
Extract all key conceptual triples (Subject | Relation | Object) from the following text.
Return them in the format:

Subject | Relation | Object
(one per line, exactly as shown).

Text:
\"\"\"{text}\"\"\"
"""
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Parse the response lines for triple notation
        triples = []
        for line in response_text.strip().split("\n"):
            line = line.strip()
            if "|" in line:
                parts = [p.strip() for p in line.split("|")]
                if len(parts) == 3:
                    triples.append((parts[0], parts[1], parts[2]))
        
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
    Generates a unified concept map JSON structure from the extracted triples.
    
    Args:
        triples (List[Tuple[str, str, str]]): A list of subject-predicate-object triples.
        model (genai.GenerativeModel): An instance of the Gemini model.
    
    Returns:
        Dict[str, Any]: A JSON structure representing the unified concept map.
    """
    # Convert triples list to a textual format for the prompt
    triple_text = "\n".join([f"{s} | {r} | {o}" for s, r, o in triples])
    
    prompt = f"""
You have the following conceptual triples extracted from text:
{triple_text}

Your task:
1. Combine all references into a SINGLE integrated concept map, unifying duplicates.
2. If there are multiple seemingly unrelated root concepts, try to discover or create
   bridging relationships so that the final map is truly one big interconnected web
   (no isolated sub-maps).
3. Each concept may appear as a "Subject" in some triples and as an "Object" in others.
   If so, unify them into the same concept node.
4. Produce valid JSON with exactly one top-level key: "concept_map".
   Example minimal structure (showing the shape, not your data):

{{
  "concept_map": {{
    "Concept1": {{
      "RelationA": ["ChildA", "ChildB"],
      "RelationB": ["ChildC"]
    }},
    "Concept2": {{
      "RelationC": ["ChildD"]
    }}
  }}
}}

- No extra text or explanations.
- If bridging relationships are implied or can be logically inferred, add them.
- Return ONLY valid JSON.
"""
    
    try:
        response = model.generate_content(prompt)
        raw_response = response.text
        
        # Extract JSON content
        json_start = raw_response.find('```json')
        json_end = raw_response.rfind('```')
        
        if json_start != -1 and json_end != -1:
            raw_response = raw_response[json_start + 7:json_end].strip()
        
        # Clean out trailing commas, etc.
        raw_response = re.sub(r",\s*]", "]", raw_response)
        raw_response = re.sub(r",\s*}", "}", raw_response)
        
        # Try to parse the JSON, with fallback for malformed responses
        try:
            concept_map = json.loads(raw_response)
            
            # Validate the structure has the expected key
            if not isinstance(concept_map, dict) or 'concept_map' not in concept_map:
                raise ValueError("Missing 'concept_map' key in response")
            
            return concept_map
            
        except (json.JSONDecodeError, ValueError) as json_err:
            logger.error(f"Error parsing concept map JSON: {str(json_err)}. Raw response: {raw_response[:100]}...")
            
            # Create a basic concept map from the triples
            default_map = {"concept_map": {}}
            
            # If we have triples, create a simple tree structure
            if triples:
                root_concept = triples[0][0]
                default_map["concept_map"][root_concept] = {}
                
                for s, r, o in triples:
                    # If this is a new subject, add it to the map
                    if s not in default_map["concept_map"]:
                        default_map["concept_map"][s] = {}
                    
                    # Add the relation and object
                    if r not in default_map["concept_map"][s]:
                        default_map["concept_map"][s][r] = []
                    
                    default_map["concept_map"][s][r].append(o)
            else:
                default_map["concept_map"]["Error"] = {"occurred during": ["concept map generation"]}
            
            return default_map
            
    except Exception as e:
        logger.error(f"Error generating concept map JSON: {str(e)}")
        # Create a minimal valid concept map structure for error cases
        return {
            "concept_map": {
                "Error": {
                    "suggests": ["Please try again"]
                }
            }
        }


##############################################################################
#                    SVG Generation from Concept Map                       #
##############################################################################

def add_node(dot, node_id, added_nodes, node_type="default"):
    """
    Adds a node to the Graphviz graph if it hasn't already been added.
    Styles node based on its type.
    
    Args:
        dot: Graphviz graph object
        node_id: ID of the node to add
        added_nodes: Set of already added node IDs
        node_type: Type of node (central, primary, secondary, default)
    """
    if node_id not in added_nodes:
        # Define node styling based on type
        if node_type == "central":
            # Central concept - most prominent
            dot.node(node_id, node_id, 
                    shape="ellipse", 
                    style="filled", 
                    fillcolor="#FF5733", 
                    color="#000000", 
                    penwidth="2.0",
                    fontsize="18", 
                    fontname="Arial Bold",
                    margin="0.4,0.3",
                    height="1.2")
        elif node_type == "primary":
            # Primary concepts - important and direct relationships
            dot.node(node_id, node_id, 
                    shape="box", 
                    style="filled,rounded", 
                    fillcolor="#33A1DE", 
                    fontcolor="#FFFFFF",
                    fontsize="16", 
                    fontname="Arial",
                    margin="0.3,0.2")
        elif node_type == "secondary":
            # Secondary concepts
            dot.node(node_id, node_id, 
                    shape="box", 
                    style="filled,rounded", 
                    fillcolor="#50C878", 
                    fontsize="14", 
                    fontname="Arial",
                    margin="0.2,0.1")
        else:
            # Default styling for any other nodes
            dot.node(node_id, node_id, 
                    shape="box", 
                    style="filled,rounded", 
                    fillcolor="#E6E6E6", 
                    fontsize="14", 
                    fontname="Arial",
                    margin="0.2,0.1")
        added_nodes.add(node_id)

def generate_concept_map_svg(concept_map_json: Dict[str, Any], layout_style: str = "hierarchical") -> str:
    """
    Generate an SVG representation of a concept map from JSON data.
    
    Args:
        concept_map_json (Dict[str, Any]): The concept map data in JSON format
        layout_style (str): The layout algorithm to use ('hierarchical', 'radial', 'force')
        
    Returns:
        str: Base64 encoded SVG string
        
    Raises:
        ValueError: If the concept map data is invalid or cannot be processed
    """
    try:
        # Validate input data
        if not concept_map_json:
            raise ValueError("Empty concept map data")
            
        if not isinstance(concept_map_json, dict):
            raise ValueError("Concept map data must be a dictionary")
            
        # Validate required fields
        if 'nodes' not in concept_map_json or 'edges' not in concept_map_json:
            raise ValueError("Concept map data must contain 'nodes' and 'edges' fields")
            
        if not isinstance(concept_map_json['nodes'], list) or not isinstance(concept_map_json['edges'], list):
            raise ValueError("'nodes' and 'edges' must be lists")
            
        # Validate layout style
        if layout_style not in ['hierarchical', 'radial', 'network']:
            logger.warning(f"Invalid layout style '{layout_style}', defaulting to 'hierarchical'")
            layout_style = 'hierarchical'
            
        # Create a new directed graph
        dot = graphviz.Digraph(format="svg")
        dot.attr(rankdir="TB" if layout_style == "hierarchical" else "LR")
        
        # Track added nodes to avoid duplicates
        added_nodes = set()
        
        # Process nodes and edges
        try:
            # First pass: add all nodes
            for node in concept_map_json['nodes']:
                if not isinstance(node, dict):
                    logger.warning(f"Invalid node format: {node}")
                    continue
                    
                node_id = node.get('id')
                if not node_id:
                    logger.warning("Node missing 'id' field")
                    continue
                    
                add_node(dot, node_id, added_nodes)
                
            # Second pass: add all edges
            for edge in concept_map_json['edges']:
                if not isinstance(edge, dict):
                    logger.warning(f"Invalid edge format: {edge}")
                    continue
                    
                source = edge.get('source')
                target = edge.get('target')
                if not source or not target:
                    logger.warning("Edge missing 'source' or 'target' field")
                    continue
                    
                # Only add edge if both nodes exist
                if source in added_nodes and target in added_nodes:
                    dot.edge(
                        source,
                        target,
                        label=edge.get('label', ''),
                        color="#555555",
                        penwidth="1.0",
                        style="solid",
                        arrowhead="normal",
                        arrowsize="1.0",
                        fontcolor="#333333",
                        fontsize="11"
                    )
                else:
                    logger.warning(f"Edge references non-existent nodes: {source} -> {target}")
                    
        except Exception as e:
            logger.error(f"Error processing nodes and edges: {str(e)}")
            raise ValueError(f"Failed to process concept map structure: {str(e)}")
            
        try:
            # Render the graph to SVG
            svg_data = dot.pipe()
            if not svg_data:
                raise ValueError("Empty SVG output")
                
            # Convert to base64
            return base64.b64encode(svg_data).decode('utf-8')
        except Exception as e:
            logger.error(f"Error generating SVG: {str(e)}")
            raise ValueError(f"Failed to generate SVG: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error in concept map generation: {str(e)}")
        # Create a minimal error graph
        try:
            dot = graphviz.Digraph(format="svg")
            dot.attr(rankdir="TB")
            dot.node("Error", f"Error: {str(e)}", shape="box", style="filled", fillcolor="red", fontcolor="white")
            svg_data = dot.pipe()
            return base64.b64encode(svg_data).decode('utf-8')
        except:
            raise ValueError(f"Failed to generate concept map: {str(e)}")


##############################################################################
#                    Main Processing Pipeline                              #
##############################################################################

def generate_concept_map(input_text: str, model: genai.GenerativeModel, api_key: str, layout_style: str = "hierarchical") -> str:
    """
    Main processing pipeline for concept map generation using unified approach.
    
    Args:
        input_text (str): The input text to generate the concept map from.
        model (genai.GenerativeModel): An instance of the Gemini model.
        api_key (str): The Gemini API key.
        layout_style (str): The layout algorithm to use ('hierarchical', 'radial', 'force')
        
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
            chunks = split_text_into_chunks(input_text) if len(input_text) > 12000 else [input_text]
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

        # Generate the unified concept map
        concept_map = generate_concept_map_json(all_triples, model)
        # Convert to SVG with the specified layout style
        svg_b64 = generate_concept_map_svg(concept_map, layout_style)
        logger.info(f"Unified concept map generation successful with {layout_style} layout.")
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