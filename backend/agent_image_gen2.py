from fastapi import FastAPI, UploadFile, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import os
import tempfile
import requests
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
SONAR_API_KEY = os.getenv("SONAR_API_KEY")
SONAR_API_URL = "https://api.perplexity.ai/chat/completions"
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

def generate_description(prompt: str, additional_prompt: Optional[str] = None) -> str:
    """
    Generates a general description based on the prompt.

    """
    if additional_prompt:
        return f"Prompt: {prompt}\n\nAdditional notes: {additional_prompt}"
    return f"Prompt: {prompt}"

def add_logo_to_image(image: Image.Image, logo: Image.Image, position: str = "bottom_right") -> Image.Image:
    logo_width = 100
    logo_height = int(logo.height * (logo_width / logo.width))
    logo = logo.resize((logo_width, logo_height))
    if position == "bottom_right":
        x = image.width - logo.width - 10
        y = image.height - logo.height - 10
    image.paste(logo, (x, y), logo)
    return image

def save_image_and_prompt(image_path: str, prompt: str, description: str):
    with open("prompt.txt", "w", encoding="utf-8") as f:
        f.write(f"Image Path: {image_path}\n")
        f.write(f"Prompt: {prompt}\n")
        f.write(f"Description: {description}\n")

def get_sonar_description(prompt: str) -> str:
    # Enhanced prompt engineering for promotional, detailed, benefit-focused description
    engineered_prompt = (
        f"Write a detailed, engaging, and promotional product description for the following prompt:\n"
        f"\"{prompt}\"\n"
        "Highlight the key features, unique benefits, and reasons to choose this product. "
        "Make it sound appealing and persuasive, as if for a high-converting advertisement. "
        "Include a call to action at the end."
    )
    headers = {
        "Authorization": f"Bearer {SONAR_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "sonar-pro",
        "messages": [
            {"role": "user", "content": engineered_prompt}
        ]
    }
    response = requests.post(SONAR_API_URL, headers=headers, json=data)
    if response.status_code == 200:
        try:
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Error parsing Sonar response: {e}\nRaw: {response.text}"
    else:
        return f"Sonar API error: {response.status_code}\n{response.text}"

def enhance_prompt_for_image_generation(base_prompt: str, additional_notes: Optional[str] = None) -> str:
    """
    Uses Gemini 2.5 Pro (Preview) to enhance a simple user prompt into a detailed one
    for a high-quality image generation model.
    """
    system_instruction = (
        "You are an expert creative assistant for an AI image generator. "
        "Your role is to take a user's basic idea and expand it into a detailed, "
        "vivid, and descriptive prompt. This enhanced prompt should include details about "
        "the subject, setting, lighting, style, composition, and mood. "
        "Do not generate the image description, only the prompt itself. "
        "The output should be a single, detailed paragraph."
    )

    full_user_request = f"Base idea: '{base_prompt}'"
    if additional_notes:
        full_user_request += f"\nAdditional notes from the user: '{additional_notes}'"

    try:
        # Use Gemini 2.5 Pro (Preview) model
        enhancer_model = client.models.get('gemini-1.5-pro-preview')  # or the exact model name for 2.5 Pro if available
        response = enhancer_model.generate_content(
            [system_instruction, full_user_request]
        )
        enhanced_prompt = response.text.strip()
        return enhanced_prompt
    except Exception as e:
        print(f"Error during prompt enhancement: {e}")
        return base_prompt

@app.post("/generate_image_with_logo_and_description")
async def generate_image_with_logo_and_description(
    prompt: str = Form(...),
    logo: UploadFile = None,
    additional_prompt: str = Form(None)
):
    if logo is None:
        raise HTTPException(status_code=400, detail="Logo file is required")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(logo.filename)[1]) as logo_temp:
        logo_temp.write(await logo.read())
        logo_temp_path = logo_temp.name

    try:
        # --- Step 1: Enhance the Prompt ---
        print("Original prompt:", prompt)
        enhanced_prompt = enhance_prompt_for_image_generation(prompt, additional_prompt)
        print("Enhanced prompt:", enhanced_prompt)

        # --- Step 2: Generate the Image using the Enhanced Prompt ---
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=enhanced_prompt, # Use the new, better prompt!
            config=types.GenerateImagesConfig(number_of_images=1)
        )
        if not response.generated_images:
            raise HTTPException(status_code=400, detail="No image generated from the enhanced prompt")

        generated_image = response.generated_images[0]
        image = Image.open(BytesIO(generated_image.image.image_bytes)).convert("RGBA")
        logo_img = Image.open(logo_temp_path).convert("RGBA")
        image = add_logo_to_image(image, logo_img)

        output_path = "output_with_logo.png" # Made filename more generic
        image.save(output_path)

        # --- Step 3: Generate Marketing Content from the Original Idea ---
        # It's often better to generate the description from the original, concise prompt.
        description = get_sonar_description(prompt) 

        # --- Step 4: Save the Comprehensive Output ---
        # We now save the original prompt, the enhanced one, and the description.
        with open("prompt.txt", "w", encoding="utf-8") as f:
            f.write(f"--- Original User Idea ---\n{prompt}\n\n")
            f.write(f"--- AI-Enhanced Image Prompt ---\n{enhanced_prompt}\n\n")
            f.write(f"--- Generated Marketing Content ---\n{description}\n")


        os.unlink(logo_temp_path)
        
        return {
            "output_image_path": output_path,
            "original_prompt": prompt,
            "enhanced_prompt": enhanced_prompt,
            "description": description
        }
    except Exception as e:
        if os.path.exists(logo_temp_path):
            os.unlink(logo_temp_path)
        raise HTTPException(status_code=500, detail=str(e))
