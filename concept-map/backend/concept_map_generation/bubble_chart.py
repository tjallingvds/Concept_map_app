import json
import matplotlib.pyplot as plt
import io
import base64
import matplotlib
import packcircles

from matplotlib.patches import Circle, Patch
import numpy as np

def load_gemini_output(gemini_json):
    """
    Loads Gemini output (JSON) and returns a list of concept dictionaries.
    Expected keys: 'concept', 'frequency', 'category', 'importance_score'.
    """
    if isinstance(gemini_json, str):
        try:
            data = json.loads(gemini_json)
        except json.JSONDecodeError:
            print("Error: Invalid JSON format.")
            return []
    elif isinstance(gemini_json, list):
        data = gemini_json
    else:
        print("Error: Unsupported format for Gemini output.")
        return []
    
    # Validate and ensure all required fields are present
    required_fields = ['concept', 'frequency', 'category', 'importance_score']
    validated_data = []
    
    for item in data:
        if all(field in item for field in required_fields):
            # Ensure numeric fields have correct types
            try:
                validated_item = {
                    'concept': str(item['concept']),
                    'frequency': int(item['frequency']),
                    'category': str(item['category']),
                    'importance_score': float(item['importance_score'])
                }
                validated_data.append(validated_item)
            except (ValueError, TypeError):
                print(f"Error: Invalid data types in item {item}")
                continue
        else:
            print(f"Error: Missing required fields in item {item}")
            continue
            
    return validated_data

def generate_packed_bubble_chart(concepts, use_importance=False, title="Packed Bubble Chart"):
    """
    Generates a circle-packed (bubble) chart, placing bubbles so they don't overlap.
      - Each bubble's radius is based on frequency or importance_score.
      - Each bubble's color is based on category.
      - Circles are automatically 'packed' via the packcircles library.

    Parameters:
        concepts (list): A list of dicts, each with:
                         "concept" (str),
                         "frequency" (int),
                         "category" (str),
                         "importance_score" (float, optional)
        use_importance (bool): If True, bubble size is based on 'importance_score',
                               otherwise it uses 'frequency'.
        title (str): Title of the chart.
    """
    if not concepts:
        print("No concept data provided. Cannot generate a bubble chart.")
        return

    # 1. Decide which numeric metric to use for radius
    metric_key = "importance_score" if use_importance else "frequency"
    # Ensure 'importance_score' exists even if not provided
    for c in concepts:
        c.setdefault("importance_score", 0.0)

    # Extract numeric values
    numeric_values = [c[metric_key] for c in concepts]

    # If all zero, we can't scale properly
    if all(val == 0 for val in numeric_values):
        print("All numeric values are 0. Cannot generate bubble sizes.")
        return

    # 2. Normalize numeric values to get circle radii
    min_val, max_val = min(numeric_values), max(numeric_values)
    range_val = max_val - min_val if (max_val - min_val) != 0 else 1

    # Define a min/max radius for visual clarity - adjusted for better visibility
    R_MIN, R_MAX = 1.0, 4.0

    # Scale radii with square root to make area proportional to value
    radii = [
        R_MIN + np.sqrt((val - min_val) / range_val) * (R_MAX - R_MIN)
        for val in numeric_values
    ]

    # 3. Circle Packing - adjust radii to create spacing effect
    # Increase all radii by 10% to create natural spacing
    spaced_radii = [r * 1.1 for r in radii]
    packed_circles = list(packcircles.pack(spaced_radii))

    if not packed_circles:
        print("No circles to pack. Exiting.")
        return

    # 4. Color Mapping by Category with muted colors
    categories = [c["category"] for c in concepts]
    unique_cats = sorted(list(set(categories)))

    # Define a muted color palette
    muted_colors = [
        '#8B9EB7',  # muted blue
        '#B79F8B',  # muted brown
        '#8BB795',  # muted green
        '#B78B8B',  # muted red
        '#9B8BB7',  # muted purple
        '#B7B78B',  # muted yellow
        '#8BB7B7',  # muted cyan
        '#B78BB7',  # muted magenta
        '#B7958B',  # muted salmon
        '#8B95B7'   # muted slate
    ]
    cat_color_map = {cat: muted_colors[i % len(muted_colors)] for i, cat in enumerate(unique_cats)}

    # 5. Plot the packed circles with improved styling
    fig, ax = plt.subplots(figsize=(12, 10))
    ax.set_aspect("equal", "box")

    # Draw circles with improved styling
    for (circle_data, concept_data) in zip(packed_circles, concepts):
        x, y, r = circle_data
        cat = concept_data["category"]
        concept_name = concept_data["concept"]
        value = concept_data[metric_key]

        color = cat_color_map.get(cat, '#999999')

        # Draw the circle with subtle border
        circle_patch = Circle((x, y), r, 
                            facecolor=color, 
                            edgecolor='#ffffff',
                            linewidth=2,
                            alpha=0.85)
        ax.add_patch(circle_patch)

        # Add concept name and value (for frequency-based chart)
        font_size = min(r * 5, 12)  # Scale font size with radius
        if not use_importance:
            label_text = f"{concept_name}\n({value})"
        else:
            label_text = concept_name
            
        ax.text(x, y, label_text,
                ha="center", va="center",
                fontsize=font_size,
                fontweight='bold',
                color='#333333')

    # 6. Legend for categories
    legend_patches = [Patch(facecolor=cat_color_map[cat], label=cat) for cat in unique_cats]
    ax.legend(handles=legend_patches, title="Category", loc="upper right")

    # 7. Adjust plot limits to fit all circles
    all_x = [c[0] for c in packed_circles]
    all_y = [c[1] for c in packed_circles]
    all_r = [c[2] for c in packed_circles]

    x_min = min(x - r for x, r in zip(all_x, all_r)) - 1
    x_max = max(x + r for x, r in zip(all_x, all_r)) + 1
    y_min = min(y - r for y, r in zip(all_y, all_r)) - 1
    y_max = max(y + r for y, r in zip(all_y, all_r)) + 1

    ax.set_xlim(x_min, x_max)
    ax.set_ylim(y_min, y_max)

    ax.set_title(title)
    ax.axis("off")
    plt.tight_layout()
    plt.show()

def process_text_for_bubble_chart(text, model):
    """
    Process text using Gemini API to extract concepts and generate bubble charts.
    
    Args:
        text (str): The input text to analyze
        model: The Gemini model instance to use
        
    Returns:
        tuple: A tuple containing (concepts_data, frequency_chart_b64, importance_chart_b64)
    """
    # Prepare the prompt for Gemini
    prompt = """
    Analyze the given text and extract key concepts that are important for understanding the topic. Each concept should be classified into a category, and an importance score should be assigned based on relevance in the text.

    Instructions:
    Extract Key Concepts
    Identify important terms, technical phrases, and scientific concepts.
    Exclude trivial words or stop phrases like "a byproduct", "the process", "which", etc.
    Categorize Each Concept
    Example: "photosynthesis" → "process", "ATP" → "energy molecule", "chloroplasts" → "cell structure"
    Determine Importance Score (0.0 - 1.0)
    More central concepts (appearing in definitions, titles, and multiple sentences) should have a higher score.
    Less critical terms should have lower scores.
    Example: "photosynthesis" might get 0.95, while "sugar molecules" gets 0.60.
    Format Output as JSON
    Return a JSON array where each object has:"concept" → The extracted key term
    "frequency" → The number of times it appears in the text
    "category" → Semantic category
    "importance_score" → A float between 0.0 and 1.0
    
    Here is the text:
    {}
    """.format(text)
    
    try:
        # Call Gemini API
        response = model.generate_content(prompt)
        
        # Extract JSON from response
        response_text = response.text
        # Find JSON content (assuming it's enclosed in ```json and ```)
        json_start = response_text.find('```json')
        json_end = response_text.rfind('```')
        
        if json_start != -1 and json_end != -1:
            json_content = response_text[json_start + 7:json_end].strip()
        else:
            # If not in code block, try to extract JSON directly
            json_content = response_text
        
        # Parse the JSON
        try:
            concepts_data = json.loads(json_content)
        except json.JSONDecodeError:
            # Try to find array brackets if JSON parsing failed
            start_bracket = response_text.find('[')
            end_bracket = response_text.rfind(']') + 1
            if start_bracket != -1 and end_bracket != 0:
                json_content = response_text[start_bracket:end_bracket]
                concepts_data = json.loads(json_content)
            else:
                raise ValueError('Failed to parse Gemini response as JSON')
        
        # Process the concepts data
        concepts = load_gemini_output(concepts_data)
        
        # Generate charts and convert to base64 for embedding
        charts = []
        
        # Frequency-based chart
        freq_img_data = io.BytesIO()
        generate_packed_bubble_chart(
            concepts,
            use_importance=False,
            title="Concept Frequency"
        )
        plt = matplotlib.pyplot
        plt.savefig(freq_img_data, format='png', bbox_inches='tight')
        plt.close()
        freq_img_data.seek(0)
        freq_img_b64 = base64.b64encode(freq_img_data.read()).decode('utf-8')
        
        # Importance-based chart
        imp_img_data = io.BytesIO()
        generate_packed_bubble_chart(
            concepts,
            use_importance=True,
            title="Concept Importance (0.0-1.0)\nLarger bubbles indicate more central concepts"
        )
        plt.savefig(imp_img_data, format='png', bbox_inches='tight')
        plt.close()
        imp_img_data.seek(0)
        imp_img_b64 = base64.b64encode(imp_img_data.read()).decode('utf-8')
        
        return freq_img_b64, imp_img_b64
        
    except Exception as e:
        raise RuntimeError(f'Error processing text: {str(e)}')
