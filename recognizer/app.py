import cv2
import torch
from PIL import Image
from transformers import AutoProcessor, AutoModel
import os
from collections import deque
from openai import OpenAI
import base64
import concurrent.futures
import csv
import argparse
from dotenv import load_dotenv

load_dotenv()

device = "cuda" if torch.cuda.is_available() else "cpu"


# --- Configuration ---
class Config:
    MODEL_NAME = "openai/clip-vit-base-patch16"
    LABELS = ["vinyl record", "something else", "open palm"]

    BUFFER_MAX_LEN = 50
    QUALIFY_THRESHOLD_PERCENT = 0.2
    FRAME_PERCENT_TO_QUALIFY = int(BUFFER_MAX_LEN * QUALIFY_THRESHOLD_PERCENT)

    BREAK_PROMPT = "open palm"
    BREAK_PROMPT_BUFFER_SIZE = 10

    VINYLS_DIR = "vinyls"
    SIMILARITY_THRESHOLD = 80.0  # Cosine similarity percentage

    OPENAI_MODEL = "gpt-4.1-mini"
    OUTPUT_CSV = "results.csv"


# --- Helper Functions ---

def setup_dependencies(config):
    """Load model and processor from Hugging Face."""
    print(f"Loading model: {config.MODEL_NAME}")
    model = AutoModel.from_pretrained(config.MODEL_NAME)
    processor = AutoProcessor.from_pretrained(config.MODEL_NAME, use_fast=True)
    return model, processor


def embedding_has_not_been_recorded(embedding, recorded_vinyl_vectors, threshold):
    """
    Check if the vinyl embedding is novel enough to be recorded.
    Returns False if the embedding's cosine similarity to any recorded vinyl is above the threshold.
    """
    if not recorded_vinyl_vectors:
        return True

    for recorded_vinyl in recorded_vinyl_vectors:
        cosine_sim = 100.0 * torch.nn.functional.cosine_similarity(embedding, recorded_vinyl)
        if cosine_sim > threshold:
            print(f"Similar vinyl already recorded with similarity: {cosine_sim.item():.2f}%")
            return False
    return True


def get_image_data(image_path, client, model):
    """Get artist and album name from an image using OpenAI."""
    try:
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "What vinyl record is in this image? Return ONLY in the format:\nArtist: [Artist Name]\nAlbum: [Album Name]",
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
                        },
                    ],
                }
            ],
            max_tokens=300,
        )

        result = response.choices[0].message.content
        lines = result.strip().split("\n")
        artist = lines[0].replace("Artist:", "").strip()
        album = lines[1].replace("Album:", "").strip()

        return {"artist": artist, "album": album}
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None


def process_vinyl_images(vinyl_count, config, client):
    """Process saved vinyl images to extract metadata and save to CSV."""
    results = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {
            executor.submit(get_image_data, f"{config.VINYLS_DIR}/vinyl_{i}.jpg", client, config.OPENAI_MODEL): i
            for i in range(1, vinyl_count + 1)
        }
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            if result:
                results.append(result)

    if not results:
        print("No results to write to CSV.")
        return

    with open(config.OUTPUT_CSV, "w", newline="") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["artist", "album"])
        writer.writeheader()
        writer.writerows(results)
    print(f"Results saved to {config.OUTPUT_CSV}")


# --- Main Application Logic ---

def main(config):
    """Main function to run the vinyl record indexing application."""
    parser = argparse.ArgumentParser(description="Vinyl Record Indexing using Computer Vision.")
    parser.add_argument('--camera_index', type=int, default=0, help='Index of the camera to use.')
    args = parser.parse_args()

    client = OpenAI()
    model, processor = setup_dependencies(config)
    model = model.to(device)

    if not os.path.exists(config.VINYLS_DIR):
        os.makedirs(config.VINYLS_DIR)

    label_buffer = deque(maxlen=config.BUFFER_MAX_LEN)
    recorded_vinyl_vectors = []
    vinyl_count = 0

    webcam = cv2.VideoCapture(args.camera_index)
    if not webcam.isOpened():
        print(f"Error: Could not open camera at index {args.camera_index}.")
        return

    # Pre-compute text features
    with torch.no_grad():
        text_inputs = processor(text=config.LABELS, return_tensors="pt", padding=True)
        text_inputs = {k: v.to(device) for k, v in text_inputs.items()}
        text_features = model.get_text_features(**text_inputs)
        text_features /= text_features.norm(dim=-1, keepdim=True)

    with torch.no_grad():
        while True:
            ret, frame = webcam.read()
            if not ret:
                print("Failed to grab frame.")
                break

            # Convert frame to PIL image
            pil_image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            # Process image
            image_inputs = processor(images=pil_image, return_tensors="pt")
            image_inputs = {k: v.to(device) for k, v in image_inputs.items()}
            image_features = model.get_image_features(**image_inputs)

            normalized_image_features = image_features / image_features.norm(dim=-1, keepdim=True)

            # Calculate similarity
            logits_per_image = normalized_image_features @ text_features.T
            probs = logits_per_image.softmax(dim=-1)
            top_result = config.LABELS[torch.argmax(probs)]
            label_buffer.append(top_result)

            if (label_buffer.count("vinyl record") > config.FRAME_PERCENT_TO_QUALIFY and
                    embedding_has_not_been_recorded(normalized_image_features, recorded_vinyl_vectors,
                                                    config.SIMILARITY_THRESHOLD)):
                vinyl_count += 1
                filepath = f"{config.VINYLS_DIR}/vinyl_{vinyl_count}.jpg"
                cv2.imwrite(filepath, frame)

                label_buffer.clear()
                recorded_vinyl_vectors.append(normalized_image_features)
                print(f"Recorded vinyl {vinyl_count} at {filepath}")

            if label_buffer.count(config.BREAK_PROMPT) > config.BREAK_PROMPT_BUFFER_SIZE:
                print("Break prompt detected. Exiting camera view.")
                break

            # --- Display Information on Frame ---
            cv2.putText(frame, top_result, (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
            cv2.putText(frame, f"Vinyls recorded: {vinyl_count}", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1,
                        (255, 255, 255), 2, cv2.LINE_AA)
            cv2.imshow("Vinyl Record Indexing", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    webcam.release()
    cv2.destroyAllWindows()

    if vinyl_count > 0:
        print("\nStarting post-processing of recorded vinyls...")
        process_vinyl_images(vinyl_count, config, client)


if __name__ == "__main__":
    main(Config())