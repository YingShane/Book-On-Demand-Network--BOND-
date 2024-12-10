from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
import cv2
import numpy as np
from paddleocr import PaddleOCR
import imagehash
from PIL import Image
import Levenshtein
from bond_ocr import extract_text, annotate_image

app = Flask(__name__)

# Create an upload directory
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Path to the reference book2.jpg image
BOOK2_PATH = 'images/book2.jpg'  # Change this to your actual book2.jpg path

# Function to process an uploaded image using OCR
def process_image(file_path):
    image = cv2.imread(file_path)
    
    if image is None:
        raise ValueError("Unable to read the uploaded image. Ensure it is a valid image file.")
    
    # Extract text using OCR
    extracted_text, ocr_result = extract_text(image)
    
    # Annotate the image with bounding boxes and text
    annotated_image = annotate_image(image, ocr_result)
    
    # Save the annotated image
    annotated_path = os.path.splitext(file_path)[0] + '_annotated.jpg'
    cv2.imwrite(annotated_path, annotated_image)
    
    return extracted_text, annotated_path

# Function to compare the uploaded image with book2.jpg
def compare_image_with_book2(uploaded_image_path):
    # Load the uploaded image and book2.jpg
    uploaded_image = cv2.imread(uploaded_image_path)
    book2_image = cv2.imread(BOOK2_PATH)

    # Ensure both images are loaded correctly
    if uploaded_image is None or book2_image is None:
        raise ValueError("Error loading images.")

    # Step 1: Extract text from both images
    uploaded_text, _ = process_image(uploaded_image_path)
    book2_text, _ = process_image(BOOK2_PATH)

    # Step 2: Compare images using pHash
    phash_similarity, _, _ = compare_images_phash(uploaded_image, book2_image)

    # Step 3: Calculate Levenshtein similarity (case insensitive)
    lev_similarity, lev_distance = calculate_levenshtein_similarity(' '.join(uploaded_text), ' '.join(book2_text))

    return {
        'phash_similarity': phash_similarity,
        'lev_similarity': lev_similarity,
        'lev_distance': lev_distance
    }

# Function to compare images using pHash
def compare_images_phash(img1, img2):
    img1_pil = Image.fromarray(cv2.cvtColor(img1, cv2.COLOR_BGR2RGB))
    img2_pil = Image.fromarray(cv2.cvtColor(img2, cv2.COLOR_BGR2RGB))

    hash1 = imagehash.phash(img1_pil)
    hash2 = imagehash.phash(img2_pil)

    hash_difference = hash1 - hash2
    similarity = 1 - (hash_difference / len(hash1.hash) ** 2)
    return similarity, hash1, hash2

# Function to calculate Levenshtein similarity between two texts (case insensitive)
def calculate_levenshtein_similarity(text1, text2):
    text1_lower = text1.lower()
    text2_lower = text2.lower()
    
    lev_distance = Levenshtein.distance(text1_lower, text2_lower)
    similarity = 1 - (lev_distance / max(len(text1_lower), len(text2_lower)))
    
    return similarity, lev_distance

# API endpoint to process the uploaded image and compare with book2.jpg
@app.route('/api/compare-image-with-book2', methods=['POST'])
def compare_image_with_book2_route():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file:
        return jsonify({'error': 'No file provided'}), 400

    # Secure the filename
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    try:
        # Save the uploaded file
        file.save(file_path)

        # Compare the uploaded image with book2.jpg
        comparison_result = compare_image_with_book2(file_path)

        # Cleanup: remove the uploaded file
        os.remove(file_path)

        return jsonify(comparison_result)

    except Exception as e:
        print(f"Error comparing image: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)  # Run Flask app on port 5001
