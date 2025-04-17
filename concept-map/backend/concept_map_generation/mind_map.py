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
#                 Step 1: Extract Triples (Subject | Relation | Object)      #
##############################################################################

def extract_triples_from_text(text: str, model: genai.GenerativeModel) -> List[Tuple[str, str, str]]:
    """
    Calls Gemini Flash 2.0 to extract (Subject | Relation | Object) triples from input text.
    
    Args:
        text (str): The input text to extract triples from.
        model (genai.GenerativeModel): An instance of the Gemini model.
    
    Returns:
        List[Tuple[str, str, str]]: A list of subject-predicate-object triples.
    """
    # Check if text is too short or empty
    if not text or len(text.strip()) < 10:
        logger.warning("Input text is too short for meaningful triple extraction")
        # Return a default triple for very short inputs
        return [("Concept", "is", "Empty or too short")]
    
    prompt = f"""
Your task is to generate a concept map from a given text chunk. The concept map should recursively decompose concepts into hierarchical structures, ensuring that each node is a noun and each edge represents a meaningful relationship. The number of hierarchy levels should not be fixed but should adapt based on the complexity of the information.

Extraction Rules:

Identify Core Concepts (Nouns as Nodes):

Extract key entities and ideas from the text.

If a concept contains multiple elements (e.g., "Water and Carbon Dioxide"), break it into separate child nodes.

Continue breaking down concepts recursively if subcomponents exist.

Define Relationships (Verbs/Phrases as Edges):

Establish explicit hierarchical relationships (e.g., "is part of", "is a type of", "requires", "produces").

Use associative links for cause-effect and dependencies (e.g., "converts", "leads to", "depends on").

Recursive Hierarchical Expansion:

Do not limit the number of hierarchy levels—if a concept can be decomposed further, continue breaking it down.

Each node should be as granular as possible while preserving meaning.

Structured Output Format:

Use triple notation (subject | relation | object) for relationships.

If a concept contains multiple elements, represent them as children nodes.

Output Format (Recursive Structure Example)

Input Text:
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
            main_topic = text.strip().split()[:3]
            main_topic = ' '.join(main_topic) if len(main_topic) <= 3 else text.strip()[:30]
            triples = [(main_topic, "is related to", "the topic of interest")]
            logger.info(f"Using fallback triple for text: {text[:50]}...")
        
        return triples
    except Exception as e:
        logger.error(f"Error extracting triples: {str(e)}")
        # Return a fallback triple even in case of errors
        if text.strip():
            main_topic = text.strip().split()[:3]
            main_topic = ' '.join(main_topic) if len(main_topic) <= 3 else text.strip()[:30]
            return [(main_topic, "is", "the main concept")]
        return [("Error", "occurred during", "triple extraction")]


##############################################################################
#          Step 2: Generate Hierarchical JSON Concept Map from Triples       #
##############################################################################

def generate_concept_map_json(triples: List[Tuple[str, str, str]], model: genai.GenerativeModel) -> Dict[str, Any]:
    """
    Calls Gemini to generate a hierarchical JSON concept map from triples.
    Ensures clean JSON parsing by trimming unwanted artifacts and fixing
    trailing commas if the LLM includes them.
    
    Args:
        triples (List[Tuple[str, str, str]]): A list of subject-predicate-object triples.
        model (genai.GenerativeModel): An instance of the Gemini model.
    
    Returns:
        Dict[str, Any]: A JSON structure representing the unified concept map.
    """
    triple_text = "\n".join([f"{s} | {r} | {o}" for s, r, o in triples])

    prompt = f"""
You have the following triples extracted from the text:
{triple_text}

Your task:
Generate structured concept maps from a given dataset. The text may contain recurring concepts, so ensure that each concept appears only once at its relevant breakdown level to avoid redundancy. Additionally, when multiple entities share the same relationship to a parent node, format them as an indented list under the relationship instead of grouping them in a single line.

Steps to Follow:

Detect Independent Concept Maps:
- Identify distinct root nodes to form separate maps.

Eliminate Duplicates:
- Each concept should only appear once in the hierarchy where it breaks down into sub-nodes.
- If a concept is referenced elsewhere, create a cross-reference instead of duplicating.

List Multiple Entities Under Shared Relationships:
- Instead of listing multiple entities in a single line, format them as an indented list under the relationship.

Return **only valid JSON format** (no explanations or extra text).

Expected JSON format:
{{
  "concept_maps": [
    {{
      "Root Concept": {{
        "Relation": ["Child1", "Child2"]
      }}
    }},
    ...
  ]
}}
"""
    try:
        response = model.generate_content(prompt)
        raw_response = response.text.strip()
        
        # 1) Remove unwanted Markdown artifacts (like ```json)
        raw_response = raw_response.replace("```json", "").replace("```", "").strip()
        
        # 2) Fix trailing commas that can break JSON
        raw_response = re.sub(r",\s*]", "]", raw_response)  # Remove comma before closing bracket
        raw_response = re.sub(r",\s*}", "}", raw_response)  # Remove comma before closing brace
        
        # 3) Parse as JSON
        try:
            concept_map = json.loads(raw_response)
            
            # Validate the structure has the expected key
            if not isinstance(concept_map, dict) or 'concept_maps' not in concept_map:
                logger.warning("Missing 'concept_maps' key in response, attempting to restructure")
                
                # Try to restructure or create a fallback structure
                if isinstance(concept_map, dict) and len(concept_map) > 0:
                    # If we got some JSON structure but not with the expected key
                    restructured = {"concept_maps": []}
                    
                    # Try to salvage the content
                    for key, value in concept_map.items():
                        if isinstance(value, dict):
                            restructured["concept_maps"].append({key: value})
                    
                    if restructured["concept_maps"]:
                        return restructured
                
                # Create a minimal fallback structure
                return {
                    "concept_maps": [
                        {
                            "Concept": {
                                "contains": triples[0][2] if triples else "information"
                            }
                        }
                    ]
                }
            
            return concept_map
            
        except json.JSONDecodeError as json_err:
            logger.error(f"Error parsing concept map JSON: {str(json_err)}. Raw response: {raw_response[:100]}...")
            
            # Create a basic concept map from the triples
            default_map = {"concept_maps": []}
            
            # If we have triples, create a simple tree structure
            if triples:
                # Group triples by subject
                subject_groups = {}
                for s, r, o in triples:
                    if s not in subject_groups:
                        subject_groups[s] = {}
                    
                    if r not in subject_groups[s]:
                        subject_groups[s][r] = []
                    
                    subject_groups[s][r].append(o)
                
                # Convert to the expected format
                for subject, relations in subject_groups.items():
                    concept_entry = {subject: relations}
                    default_map["concept_maps"].append(concept_entry)
            else:
                default_map["concept_maps"].append({"Error": {"occurred during": ["concept map generation"]}})
            
            return default_map
            
    except Exception as e:
        logger.error(f"Error generating concept map JSON: {str(e)}")
        # Create a minimal valid concept map structure for error cases
        return {
            "concept_maps": [
                {
                    "Error": {
                        "suggests": ["Please try again"]
                    }
                }
            ]
        }


##############################################################################
#   Step 3: Build Graph (With Subgraphs & Same-Rank Sibling Alignment)       #
##############################################################################

def add_node(dot, node_id, label=None, node_attrs=None, added_nodes=None):
    """
    Adds a node to the graph if it hasn't already been added.

    Parameters:
        dot (Digraph): The Graphviz Digraph object.
        node_id (str): Unique identifier for the node.
        label (str): Optional display label for the node.
        node_attrs (dict): Dictionary of node styling attributes.
        added_nodes (set): Set tracking nodes that have been added.
    """
    if added_nodes is None:
        added_nodes = set()
        
    if isinstance(node_id, dict):
        # Handle case where a node object is passed
        node_props = node_id
        actual_id = node_props.get('id', f"node_{len(added_nodes)}")
        label = node_props.get('label', 'Unknown')
        
        # Use importance if available
        importance = node_props.get('importance', 0.5)
        
        # Set node attrs based on importance
        if importance > 0.7:
            # More important nodes
            node_attrs = {
                "shape": "box",
                "style": "filled,rounded",
                "fillcolor": "#D6EAF8",
                "fontsize": "14",
                "fontname": "Arial Bold",
                "penwidth": "2"
            }
        else:
            # Regular nodes
            node_attrs = {
                "shape": "box",
                "style": "filled,rounded",
                "fillcolor": "#F5F5F5",
                "fontsize": "12",
                "fontname": "Arial"
            }
    else:
        # Simple string node ID
        actual_id = node_id
        
        # Default styling if none provided
        if node_attrs is None:
            node_attrs = {
                "shape": "box",  # Box shape for concepts
                "style": "filled,rounded",
                "fillcolor": "#F5F5F5",
                "fontsize": "12",
                "fontname": "Arial"
            }
    
    # Only add if not already present
    if actual_id not in added_nodes:
        dot.node(str(actual_id), label=label or actual_id, **node_attrs)
        added_nodes.add(actual_id)
        
    return actual_id

def build_graph(concept_data, layout_style="hierarchical"):
    """
    Build the concept map graph from the given concept data.
    Uses subgraphs to align sibling nodes at the same rank.
    
    Args:
        concept_data (list): List of concept map entries
        layout_style (str): The layout style to use (hierarchical, radial, network)
        
    Returns:
        graphviz.Digraph: The completed graph object
    """
    dot = graphviz.Digraph(format="svg")
    
    # Set graph attributes based on layout style
    if layout_style == "hierarchical":
        dot.attr(
            rankdir="TB",
            size="20",
            ranksep="2",
            nodesep="1",
            splines="polyline",
            concentrate="true"
        )
    elif layout_style == "radial":
        dot.attr(
            rankdir="LR",
            size="20",
            ranksep="1.5",
            nodesep="0.8",
            splines="curved",
            concentrate="true"
        )
    else:  # network layout
        dot.attr(
            size="20",
            overlap="false",
            splines="true",
            model="mds",
            K="1.0"
        )

    added_nodes = set()
    node_id_map = {}  # Maps concept names to unique IDs
    next_node_id = 1

    # First pass: Process all entries to create nodes with unique IDs
    for entry in concept_data:
        for parent, relations in entry.items():
            # Create parent node if it doesn't exist
            if parent not in node_id_map:
                parent_id = f"n{next_node_id}"
                next_node_id += 1
                node_id_map[parent] = parent_id
                
                # Add the parent node (more emphasis on root nodes)
                parent_attrs = {
                    "shape": "box",
                    "style": "filled,rounded",
                    "fillcolor": "#D6EAF8",  # Light blue for root
                    "fontsize": "14",
                    "fontname": "Arial Bold",
                    "penwidth": "2"
                }
                add_node(dot, parent_id, label=parent, node_attrs=parent_attrs, added_nodes=added_nodes)
            else:
                parent_id = node_id_map[parent]

            # Process relations
            if isinstance(relations, dict):
                for relation, children in relations.items():
                    child_ids = []
                    
                    # Process children (could be a list or another dict)
                    if isinstance(children, list):
                        for child in children:
                            # Create child node if needed
                            if child not in node_id_map:
                                child_id = f"n{next_node_id}"
                                next_node_id += 1
                                node_id_map[child] = child_id
                                
                                # Add the child node
                                child_attrs = {
                                    "shape": "box",
                                    "style": "filled,rounded",
                                    "fillcolor": "#F5F5F5",  # Light gray for child nodes
                                    "fontsize": "12",
                                    "fontname": "Arial"
                                }
                                add_node(dot, child_id, label=child, node_attrs=child_attrs, added_nodes=added_nodes)
                            else:
                                child_id = node_id_map[child]
                                
                            child_ids.append(child_id)
                    
                    # Add all child nodes to the same rank using a subgraph
                    if len(child_ids) > 1:
                        with dot.subgraph() as s:
                            s.attr(rank="same")
                            for child_id in child_ids:
                                s.node(child_id)
                    
                    # Connect parent to all children with this relation
                    for child_id in child_ids:
                        # Edge styling
                        edge_style = {
                            "color": "#555555",
                            "penwidth": "1.0",
                            "fontsize": "11",
                            "fontname": "Arial"
                        }
                        
                        # Special styling for certain relationship types
                        if any(rel in relation.lower() for rel in ["cause", "result", "lead to", "produce"]):
                            edge_style["color"] = "#E74C3C"  # Red for causation
                        elif any(rel in relation.lower() for rel in ["part", "component", "contain"]):
                            edge_style["style"] = "dashed"   # Dashed for composition
                            
                        dot.edge(parent_id, child_id, label=relation, **edge_style)

    return dot

def generate_concept_map_svg(concept_map_json: Dict[str, Any], layout_style: str = "hierarchical") -> str:
    """
    Generate an SVG representation of a concept map from JSON data.
    
    Args:
        concept_map_json (Dict[str, Any]): The concept map data in JSON format
        layout_style (str): The layout algorithm to use ('hierarchical', 'radial', 'network')
        
    Returns:
        str: Base64 encoded SVG string
    """
    try:
        # Check if the input contains the expected structure
        if not concept_map_json or not isinstance(concept_map_json, dict):
            logger.error("Invalid concept map data format")
            raise ValueError("Invalid concept map data format")
            
        # Extract concept_maps from the structure
        if 'concept_maps' not in concept_map_json:
            logger.error("Missing 'concept_maps' key in the data")
            raise ValueError("Missing 'concept_maps' key in the data")
            
        concept_data = concept_map_json['concept_maps']
        if not isinstance(concept_data, list) or not concept_data:
            logger.error("'concept_maps' must be a non-empty list")
            raise ValueError("'concept_maps' must be a non-empty list")
        
        # Build the graph
        dot = build_graph(concept_data, layout_style)
        
        # Render the graph to SVG
        svg_data = dot.pipe()
        if not svg_data:
            raise ValueError("Empty SVG output")
            
        # Convert to base64
        return base64.b64encode(svg_data).decode('utf-8')
        
    except Exception as e:
        logger.error(f"Error generating concept map SVG: {str(e)}")
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
    Main processing pipeline for concept map generation using the alternative approach.
    
    Args:
        input_text (str): The input text to generate the concept map from.
        model (genai.GenerativeModel): An instance of the Gemini model.
        api_key (str): The Gemini API key.
        layout_style (str): The layout algorithm to use ('hierarchical', 'radial', 'network')
        
    Returns:
        str: Base64 encoded SVG representation of the concept map.
    """
    try:
        # Setup Gemini API
        setup_gemini(api_key)
        
        # Create a model instance
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        # Handle empty or very short input
        if not input_text or len(input_text.strip()) < 5:
            logger.warning("Input text is empty or too short")
            # Create a simple fallback triple for empty input
            all_triples = [("Empty Input", "requires", "more content")]
        else:
            # Chunk the text for processing if needed
            chunks = split_text_into_chunks(input_text) if len(input_text) > 12000 else [input_text]
            
            # Process each chunk and collect triples
            all_triples = []
            for chunk in chunks:
                triples = extract_triples_from_text(chunk, model)
                all_triples.extend(triples)
            
            # If no triples were extracted, create a fallback
            if not all_triples:
                logger.warning("No triples extracted from input, using fallback")
                # Extract a title from the input (first few words)
                title_words = input_text.strip().split()[:3]
                title = ' '.join(title_words) if title_words else "Concept"
                # Create a simple fallback triple
                all_triples = [(title, "is related to", input_text[:50] + "...")]
        
        # Generate hierarchical JSON concept map
        concept_map = generate_concept_map_json(all_triples, model)
        
        # Generate SVG representation
        svg_b64 = generate_concept_map_svg(concept_map, layout_style)
        
        logger.info(f"Concept map generation successful with {layout_style} layout")
        return svg_b64
        
    except Exception as e:
        logger.exception("Concept map generation failed")
        # Return a simple error SVG
        try:
            # Create a simple error concept map
            error_triples = [("Error", "occurred during", "concept map generation")]
            concept_map = generate_concept_map_json(error_triples, model)
            return generate_concept_map_svg(concept_map)
        except:
            # If even that fails, raise the original exception
            raise RuntimeError(f"Concept map generation failed: {str(e)}") from e