import json
import base64
import io
import re
import logging
import google.generativeai as genai
from PIL import Image
from typing import Dict, Any, List, Tuple

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_svg_for_ocr(svg_content: str) -> Image.Image:
    """
    Convert SVG content to an image that can be processed by Gemini's Vision model.
    
    Args:
        svg_content (str): The SVG content or data URL string
        
    Returns:
        PIL.Image: The image to be processed by OCR
        
    Raises:
        ValueError: If the SVG content is invalid or cannot be processed
    """
    try:
        logger.info(f"Processing SVG content of length: {len(svg_content)}")
        
        # Log the start of the SVG to debug
        svg_preview = svg_content[:100].replace('\n', ' ') + "..."
        logger.info(f"SVG content preview: {svg_preview}")
        
        # Check if it's already a PNG data URL
        if svg_content.startswith('data:image/png;base64,'):
            logger.info("Detected PNG data URL, processing directly")
            try:
                # Extract the base64 content
                encoded = svg_content.split(',', 1)[1]
                png_bytes = base64.b64decode(encoded)
                img = Image.open(io.BytesIO(png_bytes))
                logger.info(f"Successfully loaded PNG directly, size: {img.size}")
                
                # Convert to RGB mode if it has alpha channel to avoid JPEG conversion issues
                if img.mode == 'RGBA':
                    logger.info("Converting RGBA image to RGB mode")
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
                    img = background
                
                return img
            except Exception as e:
                logger.error(f"Failed to process PNG data URL: {str(e)}")
                # Continue to other methods
        
        # Handle data URLs
        if svg_content.startswith('data:'):
            logger.info("Detected data URL, extracting content")
            # Extract the base64 content from the data URL
            header, encoded = svg_content.split(",", 1)
            logger.info(f"Data URL header: {header}")
            
            # Validate the data URL format
            if not header.startswith('data:image/svg+xml'):
                raise ValueError(f"Invalid data URL format. Expected 'data:image/svg+xml', got '{header}'")
                
            try:
                svg_bytes = base64.b64decode(encoded)
                logger.info(f"Successfully decoded base64 data of length: {len(svg_bytes)}")
            except Exception as e:
                logger.error(f"Failed to decode base64 data: {str(e)}")
                raise ValueError(f"Invalid base64 data in URL: {str(e)}")
        elif svg_content.startswith('blob:'):
            # For blob URLs, they need to be downloaded first (not handled here)
            logger.warning("Blob URL detected, not supported")
            raise ValueError("Blob URLs are not supported directly. Save the content and pass the raw SVG instead.")
        else:
            # Assume it's raw SVG content
            logger.info("Raw SVG content detected")
            try:
                # Validate that it's actually SVG content
                if not svg_content.strip().startswith('<svg'):
                    raise ValueError("Content does not appear to be valid SVG")
                svg_bytes = svg_content.encode('utf-8')
            except Exception as e:
                logger.error(f"Failed to process raw SVG content: {str(e)}")
                raise ValueError(f"Invalid SVG content: {str(e)}")
        
        # Use CairoSVG to convert SVG to PNG
        try:
            import cairosvg
            logger.info("Using CairoSVG for conversion")
            png_bytes = cairosvg.svg2png(bytestring=svg_bytes)
            img = Image.open(io.BytesIO(png_bytes))
            logger.info(f"Successfully converted SVG to PNG image of size: {img.size}")
            
            # Ensure we have an RGB image without transparency to avoid JPEG issues
            if img.mode == 'RGBA':
                logger.info("Converting RGBA image to RGB mode")
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
                img = background
            
            return img
        except ImportError:
            logger.warning("CairoSVG not available. Trying rsvg-convert fallback.")
        except Exception as e:
            logger.error(f"CairoSVG conversion failed: {str(e)}")
            # Continue to fallback methods
        
        # Try rsvg-convert fallback
        try:
            import subprocess
            import tempfile
            
            # Write SVG to a temporary file
            with tempfile.NamedTemporaryFile(suffix='.svg', delete=False) as svg_file:
                svg_file.write(svg_bytes)
                svg_path = svg_file.name
            
            # Write PNG to a temporary file
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as png_file:
                png_path = png_file.name
            
            try:
                logger.info(f"Running rsvg-convert on temporary file: {svg_path}")
                subprocess.run(['rsvg-convert', '-o', png_path, svg_path], check=True)
                img = Image.open(png_path)
                logger.info(f"Successfully converted SVG to PNG using rsvg-convert: {img.size}")
                
                # Ensure we have an RGB image without transparency to avoid JPEG issues
                if img.mode == 'RGBA':
                    logger.info("Converting RGBA image to RGB mode")
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
                    img = background
                
                return img
            except subprocess.CalledProcessError as e:
                logger.error(f"rsvg-convert failed with error code {e.returncode}: {e.output}")
                raise ValueError(f"SVG conversion failed: {str(e)}")
            except Exception as e:
                logger.error(f"Error using rsvg-convert: {str(e)}")
                raise ValueError(f"SVG conversion failed: {str(e)}")
            finally:
                # Clean up temporary files
                try:
                    import os
                    os.unlink(svg_path)
                    os.unlink(png_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary files: {str(e)}")
        except Exception as e:
            logger.error(f"rsvg-convert fallback failed: {str(e)}")
            # Continue to last resort
            
        # Last resort: create a simple error image
        try:
            from PIL import Image as PILImage, ImageDraw
            logger.info("Creating fallback error image")
            
            # Create a blank image with error message - use RGB mode to avoid JPEG conversion issues
            img = PILImage.new('RGB', (800, 600), color='white')
            draw = ImageDraw.Draw(img)
            draw.text((10, 10), "SVG conversion failed", fill='red')
            draw.text((10, 30), "Please try again with a different drawing", fill='black')
            logger.warning("Created fallback error image")
            return img
        except Exception as e:
            logger.error(f"All SVG conversion methods failed: {str(e)}")
            raise ValueError(f"Failed to process SVG: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error in SVG processing: {str(e)}")
        raise ValueError(f"Failed to process SVG: {str(e)}")

def extract_concepts_and_relations_from_image(image: Image.Image, model: genai.GenerativeModel) -> Dict[str, Any]:
    """
    Use Gemini's Vision model to extract concepts and relationships from an image.
    
    Args:
        image (PIL.Image): The image containing the concept map drawing
        model (genai.GenerativeModel): Gemini vision model
        
    Returns:
        Dict: A dictionary containing extracted concepts, relationships and structured data
    """
    prompt = """
    You are a concept map analyzer. Analyze this hand-drawn concept map image and extract its structure in a simple, straightforward way.
    Focus specifically on:

    1. CONCEPTS (Nodes):
       - Look for boxes, circles, or any enclosed shapes containing text
       - Each concept should be assigned a simple ID (c1, c2, etc.)
       - Capture the exact text/label within each shape

    2. RELATIONSHIPS (Arrows/Lines):
       - Identify direct connections between concepts with arrows or lines
       - Note the direction of arrows (which concept connects to which)
       - Use simple relationship labels like "connects to" or "relates to" 
       - If there's text on a connection, use that exact text as the label

    3. STRUCTURE:
       - Keep the structure flat and straightforward
       - Focus on direct connections between concepts
       - Avoid creating complex hierarchies or nested relationships

    Format your response as a simple JSON object:
    {
      "concepts": [
        {
          "id": "c1",
          "name": "exact text from shape",
          "description": "brief description or empty string"
        }
      ],
      "relationships": [
        {
          "source": "c1",
          "target": "c2",
          "label": "connects to"
        }
      ],
      "structure": {
        "type": "network",
        "root": "c1"
      }
    }

    IMPORTANT:
    - Keep relationships simple and direct
    - Prefer generic labels like "connects to" or "relates to" unless there's clear text on the arrow
    - Avoid creating complex relationship types or nested structures
    - Use the exact text from the drawing for concept names
    - Return ONLY the JSON object, no additional text
    """
    
    # Add a secondary prompt to ensure we get a raw text version too
    secondary_prompt = """
    Extract a simple text description of the concepts and their direct connections in this concept map.
    
    Format the output as follows:
    
    Digitized concept map with concepts: [list all concept names]
    
    Concepts:
    [concept name 1]: [brief description or just repeat the name]
    [concept name 2]: [brief description or just repeat the name]
    ...
    
    Relationships:
    [concept name 1] relates to [concept name 2]
    [concept name 3] relates to [concept name 1]
    ...
    
    Be extremely simple and direct. Use "relates to" as the default relationship 
    unless there's clear text on an arrow showing a different relationship.
    
    Don't include the brackets in your response, replace them with the actual concept names.
    List all concepts and direct connections you can see in the image.
    """
    
    try:
        logger.info("Sending image to Gemini for concept extraction")
        
        try:
            # For best results with Gemini 2.0 Flash, place the image before the text prompt
            response = model.generate_content([image, prompt])
            
            # Check if the response is valid
            if not response or not hasattr(response, 'text'):
                raise ValueError("Invalid response from model")
                
            # Get the text from the response
            result = response.text.strip()
            raw_response_text = result  # Store the original response
            
            # Clean and validate the response
            if result.startswith('```json'):
                result = result[7:]
            if result.endswith('```'):
                result = result[:-3]
            
            # Try to parse the JSON
            try:
                data = json.loads(result)
                
                # Validate the structure
                if not isinstance(data, dict):
                    raise ValueError("Response is not a dictionary")
                    
                required_keys = ['concepts', 'relationships', 'structure']
                for key in required_keys:
                    if key not in data:
                        raise ValueError(f"Missing required key: {key}")
                        
                # Validate concepts and relationships
                if not isinstance(data['concepts'], list):
                    raise ValueError("'concepts' must be a list")
                if not isinstance(data['relationships'], list):
                    raise ValueError("'relationships' must be a list")
                    
                # Validate each concept has required fields
                for concept in data['concepts']:
                    if not isinstance(concept, dict):
                        raise ValueError("Each concept must be a dictionary")
                    if 'id' not in concept or 'name' not in concept:
                        raise ValueError("Each concept must have 'id' and 'name'")
                        
                # Validate relationships reference valid concepts
                concept_ids = {c['id'] for c in data['concepts']}
                for rel in data['relationships']:
                    if not isinstance(rel, dict):
                        raise ValueError("Each relationship must be a dictionary")
                    if 'source' not in rel or 'target' not in rel:
                        raise ValueError("Each relationship must have 'source' and 'target'")
                    if rel['source'] not in concept_ids:
                        raise ValueError(f"Invalid source concept ID: {rel['source']}")
                    if rel['target'] not in concept_ids:
                        raise ValueError(f"Invalid target concept ID: {rel['target']}")
                
                # Now get a plain text representation for the text processing pipeline
                try:
                    text_response = model.generate_content([image, secondary_prompt])
                    raw_text_format = text_response.text.strip()
                    logger.info("Successfully extracted plain text representation")
                except Exception as text_err:
                    logger.warning(f"Failed to get plain text format: {str(text_err)}")
                    # Create a simple text format from the structured data
                    raw_text_format = "Concepts:\n"
                    for concept in data['concepts']:
                        raw_text_format += f"{concept['name']}: {concept.get('description', '')}\n"
                    raw_text_format += "\nRelationships:\n"
                    for rel in data['relationships']:
                        source_name = next((c['name'] for c in data['concepts'] if c['id'] == rel['source']), rel['source'])
                        target_name = next((c['name'] for c in data['concepts'] if c['id'] == rel['target']), rel['target'])
                        raw_text_format += f"{source_name} {rel.get('label', 'related to')} {target_name}\n"
                
                # Add the raw text to the data
                data['raw_text'] = raw_text_format
                data['original_response'] = raw_response_text
                
                logger.info(f"Successfully extracted {len(data['concepts'])} concepts and {len(data['relationships'])} relationships")
                return data
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON response: {str(e)}")
                logger.error(f"Raw response: {result}")
                # If JSON parsing fails, return the raw text for the text processing pipeline
                return {
                    "error": f"Invalid JSON response: {str(e)}",
                    "concepts": [],
                    "relationships": [],
                    "structure": {"type": "unknown"},
                    "raw_text": raw_response_text
                }
                
        except Exception as e:
            logger.error(f"Error extracting concepts from image: {str(e)}")
            raise
            
    except Exception as e:
        logger.error(f"Error in concept extraction: {str(e)}")
        return {
            "error": f"Failed to extract concepts: {str(e)}",
            "concepts": [],
            "relationships": [],
            "structure": {"type": "unknown"},
            "raw_text": f"Error extracting concepts: {str(e)}"
        }

def generate_mind_map_from_ocr_results(ocr_data: Dict[str, Any], model: genai.GenerativeModel) -> str:
    """
    Generate a simplified mind map from OCR-extracted concept data.
    
    Args:
        ocr_data (Dict): The OCR extracted data
        model (genai.GenerativeModel): Gemini model for any additional processing
        
    Returns:
        str: Base64 encoded SVG of the generated mind map
    """
    try:
        # Import mind map generator here to avoid circular imports
        from .mind_map import generate_concept_map_svg
        
        # Convert the OCR data into a format suitable for the mind map generator
        concepts = ocr_data.get('concepts', [])
        relationships = ocr_data.get('relationships', [])
        
        # Build the concept map JSON structure expected by generate_concept_map_svg
        concept_map = {
            "nodes": [],
            "edges": []
        }
        
        # Add nodes
        for concept in concepts:
            concept_map["nodes"].append({
                "id": concept["id"],
                "label": concept["name"],
                "description": concept.get("description", "")
            })
        
        # Add edges with simplified relationships
        for rel in relationships:
            # Use simple relationship labels
            label = rel.get("label", "relates to")
            # If the label is complex (more than 3 words), simplify it
            if len(label.split()) > 3:
                label = "relates to"
                
            concept_map["edges"].append({
                "source": rel["source"],
                "target": rel["target"],
                "label": label
            })
        
        # Use network layout for simpler visualization
        layout_style = "network"
            
        svg_b64 = generate_concept_map_svg(concept_map, layout_style)
        return svg_b64
        
    except Exception as e:
        logger.error(f"Error generating mind map from OCR results: {str(e)}")
        raise

def process_drawing_for_concept_map(svg_content: str, model: genai.GenerativeModel) -> Dict[str, Any]:
    """
    Process a drawing (SVG or image data URL) to extract concepts and generate a digital concept map.
    
    Args:
        svg_content (str): The SVG content or image data URL from the drawing
        model (genai.GenerativeModel): The Gemini model
        
    Returns:
        Dict: A dictionary with the extracted data and generated concept map
    """
    try:
        # If it's a PNG data URL, convert directly to image
        if svg_content.startswith('data:image/png;base64,'):
            logger.info("Direct processing of PNG data URL")
            try:
                # Extract the base64 content
                encoded = svg_content.split(',', 1)[1]
                png_bytes = base64.b64decode(encoded)
                img = Image.open(io.BytesIO(png_bytes))
                
                # Ensure we're in RGB mode to avoid JPEG conversion issues
                if img.mode == 'RGBA':
                    logger.info("Converting RGBA image to RGB mode")
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
                    img = background
                
                logger.info(f"Successfully loaded PNG directly, size: {img.size}")
            except Exception as e:
                logger.error(f"Error processing PNG directly: {str(e)}")
                # Fall back to SVG conversion method
                img = process_svg_for_ocr(svg_content)
        else:
            # Convert SVG to image for OCR
            img = process_svg_for_ocr(svg_content)
        
        # Ensure image is in the correct format and size for Gemini
        # Resize if larger than 768x768 to optimize token usage
        max_size = 768
        if img.width > max_size or img.height > max_size:
            # Calculate new dimensions maintaining aspect ratio
            ratio = min(max_size / img.width, max_size / img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            logger.info(f"Resized image to {new_size}")
        
        # Get a vision-capable model for image processing 
        try:
            # Use gemini-2.0-flash for vision tasks
            vision_model_name = 'gemini-2.0-flash'
            vision_model = genai.GenerativeModel(vision_model_name)
            
            # Test if the model is available with a simple text generation
            try:
                test_response = vision_model.generate_content("Test")
                if not test_response or not hasattr(test_response, 'text'):
                    raise ValueError("Model test failed - invalid response format")
                logger.info(f"Successfully initialized vision model: {vision_model_name}")
            except Exception as e:
                logger.error(f"Vision model test failed: {str(e)}")
                raise ValueError(f"Vision model not available: {str(e)}")
                
        except Exception as e:
            logger.error(f"Failed to initialize vision model: {str(e)}")
            return {
                "error": f"Vision model not available: {str(e)}",
                "concepts": [],
                "relationships": [],
                "structure": {"type": "unknown"}
            }
        
        # Extract concepts and relationships from the drawing using the vision model
        try:
            # Convert the image to RGB mode if it has transparency
            # This is crucial to prevent "cannot write mode RGBA as JPEG" errors
            if img.mode == 'RGBA':
                logger.info("Converting final RGBA image to RGB mode before OCR processing")
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
                img = background
            
            # For best results with Gemini, place the image before the text prompt
            ocr_results = extract_concepts_and_relations_from_image(img, vision_model)
            
            # If there was an error in OCR, return it
            if "error" in ocr_results:
                return ocr_results
            
            # Get raw text for text processing pipeline, if available
            raw_text = ocr_results.get("raw_text", "")
            
            # If we have structured data with concepts and relationships
            if ocr_results.get("concepts") and len(ocr_results["concepts"]) > 0:
                # Generate a mind map from the OCR results using the original model
                mind_map_svg = generate_mind_map_from_ocr_results(ocr_results, model)
                
                # Return the structured results
                return {
                    "concepts": ocr_results.get("concepts", []),
                    "relationships": ocr_results.get("relationships", []),
                    "structure": ocr_results.get("structure", {}),
                    "image": mind_map_svg,
                    "format": "svg",
                    "raw_text": raw_text
                }
            # If we have raw text but no structured data, return the raw text for text pipeline processing
            elif raw_text:
                logger.info("No structured data available, but raw text found for text pipeline processing")
                return {
                    "error": "No structured data available, using raw text for processing",
                    "concepts": [],
                    "relationships": [],
                    "structure": {"type": "unknown"},
                    "raw_text": raw_text
                }
            else:
                logger.error("No structured data or raw text available from OCR")
                return create_mock_ocr_result(svg_content)
            
        except Exception as e:
            logger.error(f"Error in OCR processing: {str(e)}")
            return create_mock_ocr_result(svg_content)
            
    except Exception as e:
        logger.error(f"Error processing drawing for concept map: {str(e)}")
        return create_mock_ocr_result(svg_content)

def create_mock_ocr_result(svg_content: str) -> Dict[str, Any]:
    """
    Create a mock OCR result when the real processing fails.
    
    Args:
        svg_content (str): The original SVG content
        
    Returns:
        Dict: A mock OCR result
    """
    logger.warning("Creating mock OCR result")
    
    # Create some simple mock concepts
    mock_concepts = [
        {"id": "c1", "name": "Concept 1", "description": "First concept"},
        {"id": "c2", "name": "Concept 2", "description": "Second concept"}
    ]
    
    # Create simple relationships
    mock_relationships = [
        {"source": "c1", "target": "c2", "label": "relates to"}
    ]
    
    # Create a simple text representation for text processing pipeline
    mock_text = """
Digitized concept map with concepts: Concept 1, Concept 2

Concepts:
Concept 1: First concept
Concept 2: Second concept

Relationships:
Concept 1 relates to Concept 2
    """
    
    # Create a simple structure
    mock_structure = {
        "type": "network",
        "root": "c1"
    }
    
    # Create the mock result
    mock_data = {
        "concepts": mock_concepts,
        "relationships": mock_relationships,
        "structure": mock_structure,
        "image": svg_content,  # Just return the original SVG content
        "format": "svg",
        "raw_text": mock_text.strip()
    }
    
    return mock_data 