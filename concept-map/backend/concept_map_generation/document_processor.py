import io
import os

import google.generativeai as genai
from PIL import Image
from dotenv import load_dotenv
from pdf2image import convert_from_bytes


class DocumentProcessor:
    def __init__(self):
        # Load environment variables
        load_dotenv()
        api_key = os.getenv('GEMINI_API_KEY')

        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")

        # Configure the Gemini API
        genai.configure(api_key=api_key)

        # Initialize Gemini 2.0 Flash model
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        print("Gemini 2.0 Flash model initialized successfully")

    def extract_text_from_pdf(self, file_content):
        """Convert PDF to images"""
        # Convert PDF to images
        images = convert_from_bytes(file_content, dpi=300)
        return images

    def process_image(self, image):
        """Process a single image using Gemini"""
        try:
            # Prepare the instruction for Gemini
            instruction = """
            Extract ALL text content from this document page.
            Pay special attention to tables, columns, headers, and any structured content.
            Maintain paragraph breaks and formatting.
            For tables, maintain the table structure using markdown table format.
            Preserve all headers, footers, page numbers, and footnotes.
            """

            # Process the image with Gemini
            response = self.model.generate_content([instruction, image])

            # Properly handle the response
            if hasattr(response, 'parts'):
                return ''.join([part.text for part in response.parts if hasattr(part, 'text')])
            elif hasattr(response, 'candidates') and len(response.candidates) > 0:
                parts = response.candidates[0].content.parts
                return ''.join([part.text for part in parts if hasattr(part, 'text')])
            elif hasattr(response, 'text'):
                return response.text
            else:
                # Fallback
                return str(response)

        except Exception as e:
            print(f"Error in process_image: {e}")
            return "Error processing image. Please try again."

    def batch_images(self, images, batch_size=5):
        """Group images into batches for processing"""
        for i in range(0, len(images), batch_size):
            yield images[i:i + batch_size]

    def process_batch(self, batch):
        """Process a batch of images"""
        instruction = """
        Extract ALL text content from these document pages.
        Pay special attention to tables, columns, headers, and any structured content.
        Maintain paragraph breaks and formatting.
        For tables:
        1. Maintain the table structure using markdown table format
        2. Preserve all column headers and row labels
        3. Ensure numerical data is accurately captured
        
        For multi-column layouts:
        1. Process columns from left to right
        2. Clearly separate content from different columns
        """

        try:
            # Process the batch with Gemini
            response = self.model.generate_content([instruction] + batch)

            # Properly handle the response - this works for both simple and complex responses
            if hasattr(response, 'parts'):
                return ''.join([part.text for part in response.parts if hasattr(part, 'text')])
            elif hasattr(response, 'candidates') and len(response.candidates) > 0:
                parts = response.candidates[0].content.parts
                return ''.join([part.text for part in parts if hasattr(part, 'text')])
            elif hasattr(response, 'text'):
                return response.text
            else:
                # Fallback
                return str(response)

        except Exception as e:
            print(f"Error processing batch: {e}")
            # Fallback to processing each image individually
            results = []
            for img in batch:
                results.append(self.process_image(img))
            return "\n\n".join(results)

    def process_document(self, file_content, file_type):
        """Process document based on file type"""
        if file_type == "pdf":
            # Convert PDF to images
            images = self.extract_text_from_pdf(file_content)

            # For smaller PDFs (under 20 pages), try processing in small batches
            if len(images) < 20:
                batches = self.batch_images(images, batch_size=5)
                extracted_texts = []

                for batch in batches:
                    batch_text = self.process_batch(batch)
                    extracted_texts.append(batch_text)

                # Combine all extracted text
                combined_text = "\n\n".join(extracted_texts)
                return combined_text

            # For larger PDFs, process each page individually
            else:
                extracted_texts = []
                for img in images:
                    extracted_text = self.process_image(img)
                    extracted_texts.append(extracted_text)

                # Combine all extracted text
                combined_text = "\n\n".join(extracted_texts)
                return combined_text

        elif file_type in ["jpg", "jpeg", "png"]:
            # For single image files
            img = Image.open(io.BytesIO(file_content))
            return self.process_image(img)

        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    def process_financial_document(self, file_content, file_type):
        """Special handling for financial documents"""
        if file_type == "pdf":
            images = self.extract_text_from_pdf(file_content)

            instruction = """
            Extract ALL text content from these financial document pages.
            
            Pay particular attention to:
            1. All numerical values and ensure they're accurately transcribed
            2. Currency symbols and their correct association with numbers
            3. Financial tables - maintain their exact structure and alignment
            4. Balance sheets, income statements, and cash flow statements
            5. Footnotes and disclosures - these often contain crucial information
            6. Any dates associated with financial periods
            
            Format tables using markdown table syntax to preserve their structure.
            """

            # Process in small batches
            batches = self.batch_images(images, batch_size=3)
            extracted_texts = []

            for batch in batches:
                try:
                    response = self.model.generate_content([instruction] + batch)

                    # Properly handle the response
                    if hasattr(response, 'parts'):
                        extracted_texts.append(''.join([part.text for part in response.parts if hasattr(part, 'text')]))
                    elif hasattr(response, 'candidates') and len(response.candidates) > 0:
                        parts = response.candidates[0].content.parts
                        extracted_texts.append(''.join([part.text for part in parts if hasattr(part, 'text')]))
                    elif hasattr(response, 'text'):
                        extracted_texts.append(response.text)
                    else:
                        # Fallback
                        extracted_texts.append(str(response))

                except Exception as e:
                    print(f"Error processing financial batch: {e}")
                    # Fallback to individual processing
                    for img in batch:
                        single_response = self.model.generate_content([instruction, img])

                        # Handle single response the same way
                        if hasattr(single_response, 'parts'):
                            extracted_texts.append(''.join([part.text for part in single_response.parts if hasattr(part, 'text')]))
                        elif hasattr(single_response, 'candidates') and len(single_response.candidates) > 0:
                            parts = single_response.candidates[0].content.parts
                            extracted_texts.append(''.join([part.text for part in parts if hasattr(part, 'text')]))
                        elif hasattr(single_response, 'text'):
                            extracted_texts.append(single_response.text)
                        else:
                            extracted_texts.append(str(single_response))

            return "\n\n".join(extracted_texts)
        else:
            return self.process_document(file_content, file_type)


# Usage example
if __name__ == "__main__":
    processor = DocumentProcessor()

    # Test with a sample image
    test_image = Image.open("sample.jpg")
    result = processor.process_image(test_image)
    print(result)
