import base64
import io
import json
import re

import matplotlib

matplotlib.use('Agg')  # Force non-interactive backend before importing pyplot
import matplotlib.pyplot as plt
from wordcloud import WordCloud
import google.generativeai as genai


def load_key_concepts(gemini_json_output):
    """Load extracted key concepts from Gemini's JSON output."""
    if isinstance(gemini_json_output, str):
        try:
            key_concepts = json.loads(gemini_json_output)
        except json.JSONDecodeError:
            print("Error: Invalid JSON format for key concepts.")
            return []
    elif isinstance(gemini_json_output, list):
        key_concepts = gemini_json_output
    else:
        print("Error: Unsupported format for key concepts.")
        return []

    return key_concepts


def count_concepts_in_text(text, key_concepts):
    """Count occurrences of each concept in the given text."""
    text_lower = text.lower()
    concept_freq = {}

    for concept in key_concepts:
        pattern = r"\b" + re.escape(concept.lower()) + r"\b"
        matches = re.findall(pattern, text_lower)
        if matches:
            concept_freq[concept] = len(matches)

    return concept_freq


def generate_word_cloud(concept_freq, title="Word Cloud of Key Concepts"):
    """Generates a word cloud image based on concept frequencies and returns it as SVG."""
    if not concept_freq:
        return None

    # Create a new figure to avoid any potential conflict
    plt.figure(figsize=(10, 6))

    # Configure SVG font handling
    plt.rcParams['svg.fonttype'] = 'none'  # Embed actual fonts, not paths

    # Create a WordCloud from the frequencies
    wc = WordCloud(
        width=800,
        height=400,
        background_color="white",
        colormap="viridis"
    ).generate_from_frequencies(concept_freq)

    # Save the plot to a bytes buffer as SVG
    img_data = io.BytesIO()
    plt.imshow(wc, interpolation="bilinear")
    plt.title(title)
    plt.axis("off")
    plt.savefig(img_data, format='svg', bbox_inches='tight',
               svg_fonttype='none',  # Embed actual fonts instead of paths
               fontsize=10,          # Default font size
               dpi=300)              # Higher resolution
    plt.close()  # Ensure figure is closed to free resources
    img_data.seek(0)

    # Convert to base64
    return base64.b64encode(img_data.read()).decode('utf-8')


def extract_concepts_from_text(text, model):
    """Extract key concepts from text using Gemini API."""
    prompt = """
    Extract the most important key concepts from the given text. The extracted concepts should be noun phrases, technical terms, and domain-specific keywords that are essential to understanding the text.

    Instructions:
    Extract only meaningful concepts:
    Focus on nouns, noun phrases, and named entities (e.g., "photosynthesis", "carbon dioxide", "ATP energy").
    Ignore generic words like "process", "something", "thing", "one", etc.
    Remove redundant phrases:
    If a concept appears in different forms (e.g., "light energy" vs. "energy from light"), choose the most natural and common phrasing.
    Do not include minor variations of the same concept.
    Ignore trivial and filler phrases:
    Exclude function words (e.g., "the process of", "a type of", "the green pigment chlorophyll", etc.).
    Stop phrases to avoid:
    "the sun", "some other organisms", "that", "which", "the process", "a byproduct", "the bonds", "range", "organisms", "foods", "byproduct"
    Format Output as JSON List:
    The output should be a JSON list of key concepts without additional text.
    Do not include frequencies—our script will compute them separately.
    
    Here is the text:
    {}
    """.format(text)

    response = model.generate_content(prompt)
    response_text = response.text

    # Find JSON content (assuming it's enclosed in ```json and ```)
    json_start = response_text.find('```json')
    json_end = response_text.rfind('```')

    if json_start != -1 and json_end != -1:
        json_content = response_text[json_start + 7:json_end].strip()
    else:
        # If not in code block, try to extract JSON directly
        json_content = response_text

    try:
        key_concepts = json.loads(json_content)
    except json.JSONDecodeError:
        # Try to find array brackets if JSON parsing failed
        start_bracket = response_text.find('[')
        end_bracket = response_text.rfind(']') + 1
        if start_bracket != -1 and end_bracket != 0:
            json_content = response_text[start_bracket:end_bracket]
            key_concepts = json.loads(json_content)
        else:
            raise ValueError('Failed to parse Gemini response as JSON')

    return key_concepts


def process_text_for_wordcloud(text, model, api_key=None):
    """Process text and generate word cloud with key concepts."""
    try:
        print("Starting wordcloud generation process")
        # Configure Gemini API if API key is provided
        if api_key:
            print("Configuring Gemini API with provided key")
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.0-flash")

        # Extract key concepts using Gemini
        print("Extracting key concepts from text using Gemini")
        key_concepts = extract_concepts_from_text(text, model)

        print(f"Extracted {len(key_concepts)} key concepts")

        # Count concept frequencies
        print("Counting concept frequencies in text")
        concept_freq = count_concepts_in_text(text, key_concepts)

        print(f"Found {len(concept_freq)} concepts with non-zero frequency")

        # Generate word cloud
        print("Generating word cloud image")
        word_cloud_img = generate_word_cloud(concept_freq)

        if word_cloud_img is None:
            print("Failed to generate word cloud - null result returned")
            raise ValueError('Failed to generate word cloud')

        print(f"Successfully generated word cloud image (base64 length: {len(word_cloud_img)})")
        return {
            'concepts': key_concepts,
            'word_cloud': word_cloud_img
        }

    except Exception as e:

        print(f"Error in word cloud generation: {str(e)}")
        import traceback
        traceback.print_exc()
        raise RuntimeError(f'Error processing text: {str(e)}')
