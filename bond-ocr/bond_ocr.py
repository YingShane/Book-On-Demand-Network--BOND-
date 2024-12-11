import cv2
import numpy as np
from paddleocr import PaddleOCR
from matplotlib import pyplot as plt
import imagehash
from PIL import Image
import Levenshtein  # Levenshtein package for text distance calculation

# Function to resize images to the same size
def resize_images(img1, img2):
    img2_resized = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
    return img2_resized

# Function to perform OCR and extract text from an image
def extract_text(img):
    ocr = PaddleOCR(use_angle_cls=True, lang='en')
    result = ocr.ocr(img, cls=True)

    detected_text = []
    for line in result:
        for word_info in line:
            detected_text.append(word_info[1][0])

    return detected_text, result

# Function to compare images using pHash
def compare_images_phash(img1, img2):
    # Convert images to PIL format for ImageHash
    img1_pil = Image.fromarray(cv2.cvtColor(img1, cv2.COLOR_BGR2RGB))
    img2_pil = Image.fromarray(cv2.cvtColor(img2, cv2.COLOR_BGR2RGB))

    # Compute the perceptual hash (pHash) for both images
    hash1 = imagehash.phash(img1_pil)
    hash2 = imagehash.phash(img2_pil)

    # Compute the difference between the hashes
    hash_difference = hash1 - hash2
    print(f"pHash Difference: {hash_difference}")

    # Return similarity as 1 - (difference / max_possible_difference)
    similarity = 1 - (hash_difference / len(hash1.hash) ** 2)
    return similarity, hash1, hash2

# Function to annotate the image with bounding boxes and text
def annotate_image(img, result):
    img_with_boxes = img.copy()  # Make a copy of the image to preserve the original

    # Annotate bounding boxes and text
    for line in result:
        for word_info in line:
            points = word_info[0]  # The coordinates of the box (top-left, top-right, bottom-right, bottom-left)
            points = [(int(point[0]), int(point[1])) for point in points]  # Convert to integer

            # Draw the rectangle on the image (bounding box)
            cv2.polylines(img_with_boxes, [np.array(points)], isClosed=True, color=(0, 255, 0), thickness=2)

            # Annotate the text label on the image
            text = word_info[1][0]  # Get the word text
            # Adjust text position slightly above the top-left corner of the bounding box
            text_position = (points[0][0], points[0][1] - 10)
            cv2.putText(img_with_boxes, text, text_position, 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA)

    return img_with_boxes

# Function to calculate Levenshtein similarity between two texts (case insensitive)
def calculate_levenshtein_similarity(text1, text2):
    # Convert both texts to lowercase for case insensitive comparison
    text1_lower = text1.lower()
    text2_lower = text2.lower()
    
    # Compute Levenshtein distance
    lev_distance = Levenshtein.distance(text1_lower, text2_lower)
    
    # Calculate similarity based on Levenshtein distance
    similarity = 1 - (lev_distance / max(len(text1_lower), len(text2_lower)))
    
    return similarity, lev_distance

# Main function to compare two images and their text


# Function to visualize pHash
def visualize_phash(img1, img2, result_1, result_2):
    # Resize the images to the same size
    img2_resized = resize_images(img1, img2)

    # Compute perceptual hashes
    phash1 = imagehash.phash(Image.fromarray(cv2.cvtColor(img1, cv2.COLOR_BGR2RGB)))
    phash2 = imagehash.phash(Image.fromarray(cv2.cvtColor(img2_resized, cv2.COLOR_BGR2RGB)))

    # Plot the original images with annotations
    plt.figure(figsize=(12, 6))

    # Display Image 1 with annotations
    plt.subplot(1, 2, 1)
    plt.imshow(cv2.cvtColor(img1, cv2.COLOR_BGR2RGB))
    plt.title(f"Image 1\npHash: {phash1}")
    plt.axis('off')

    # Display Image 2 with annotations (after resizing)
    plt.subplot(1, 2, 2)
    plt.imshow(cv2.cvtColor(img2_resized, cv2.COLOR_BGR2RGB))
    plt.title(f"Image 2\npHash: {phash2}")
    plt.axis('off')

    # Plot the pHash binary matrix
    plt.figure(figsize=(8, 4))

    # Display pHash for Image 1
    plt.subplot(1, 2, 1)
    plt.imshow(np.array(phash1.hash), cmap='gray')
    plt.title("pHash of Image 1")
    plt.axis('off')

    # Display pHash for Image 2
    plt.subplot(1, 2, 2)
    plt.imshow(np.array(phash2.hash), cmap='gray')
    plt.title("pHash of Image 2")
    plt.axis('off')

    plt.show()

# Example paths for the two images to compare
# image_path_1 = 'images/book1.jpg'  # First image (book cover)
# image_path_2 = 'images/book3.jpg'  # Second image (book cover)

# Run the comparison
# phash_score, lev_score, lev_distance = compare_two_images(image_path_1, image_path_2)

