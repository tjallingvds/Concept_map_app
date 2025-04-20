from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from document_processor import DocumentProcessor

process_bp = Blueprint("process", __name__)
# Initialize document processor
document_processor = None


@process_bp.route("/api/process-document/", methods=["POST"])
def process_document():
    """
    Process uploaded document and extract text content
    """
    global document_processor

    # Initialize document processor on first request
    if document_processor is None:
        document_processor = DocumentProcessor()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    file_ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""

    # Check if file type is supported
    if file_ext not in ["pdf", "jpg", "jpeg", "png"]:
        return (
            jsonify(
                {"error": "Unsupported file type. Please upload a PDF or image file."}
            ),
            400,
        )

    try:
        # Read file content
        file_content = file.read()

        # Check if financial document processing is requested
        doc_type = request.form.get("doc_type", "standard")

        # Process document based on document type
        if doc_type == "financial":
            extracted_text = document_processor.process_financial_document(
                file_content, file_ext
            )
        else:
            extracted_text = document_processor.process_document(file_content, file_ext)

        return jsonify({"success": True, "text": extracted_text})

    except Exception as e:
        print(f"Error processing document: {str(e)}")
        return jsonify({"error": f"Failed to process document: {str(e)}"}), 500


@process_bp.route("/api/process-financial-document/", methods=["POST"])
def process_financial_document():
    """
    Process uploaded financial document with specialized OCR
    """
    global document_processor

    # Initialize document processor on first request
    if document_processor is None:
        document_processor = DocumentProcessor()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    file_ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""

    # Check if file type is supported
    if file_ext not in ["pdf", "jpg", "jpeg", "png"]:
        return (
            jsonify(
                {"error": "Unsupported file type. Please upload a PDF or image file."}
            ),
            400,
        )

    try:
        # Read file content
        file_content = file.read()

        # Process document with financial document specific processing
        extracted_text = document_processor.process_financial_document(
            file_content, file_ext
        )

        return jsonify({"success": True, "text": extracted_text})

    except Exception as e:
        print(f"Error processing financial document: {str(e)}")
        return (
            jsonify({"error": f"Failed to process financial document: {str(e)}"}),
            500,
        )
