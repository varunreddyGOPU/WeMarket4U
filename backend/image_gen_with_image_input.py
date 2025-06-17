from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import os
import tempfile
import requests
from dotenv import load_dotenv
from typing import Optional

load_dotenv()
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
SONAR_API_KEY = os.getenv("SONAR_API_KEY")
SONAR_API_URL = "https://api.perplexity.ai/chat/completions"
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

def generate_description(prompt: str, additional_prompt: Optional[str] = None) -> str:
    """
    Generates a general description based on the prompt.
    If using an LLM, replace this with an actual API call.
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

@app.post("/generate_image_with_logo_and_description")
async def generate_image_with_logo_and_description(
    prompt: str = Form(...),
    logo: UploadFile = None,
    additional_prompt: str = Form(None)
):
    if logo is None:
        raise HTTPException(status_code=400, detail="Logo file is required")
    
    # Use tempfile for safer file handling
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(logo.filename)[1]) as logo_temp:
        logo_temp.write(await logo.read())
        logo_temp_path = logo_temp.name

    try:
        # Generate the image
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=prompt,
            config=types.GenerateImagesConfig(number_of_images=1)
        )
        if not response.generated_images:
            raise HTTPException(status_code=400, detail="No image generated")

        generated_image = response.generated_images[0]
        image = Image.open(BytesIO(generated_image.image.image_bytes)).convert("RGBA")
        logo_img = Image.open(logo_temp_path).convert("RGBA")
        image = add_logo_to_image(image, logo_img)

        output_path = "output_with_logo_pb.png"
        image.save(output_path)

        # Combine prompt and additional notes for Sonar
        full_prompt = prompt
        if additional_prompt:
            full_prompt += f"\n\nAdditional notes: {additional_prompt}"
        description = get_sonar_description(full_prompt)

        # Save image path, prompt, and description
        save_image_and_prompt(output_path, prompt, description)

        os.unlink(logo_temp_path)
        
        return {
            "output_image_path": output_path,
            "description": description
        }
    except Exception as e:
        if os.path.exists(logo_temp_path):
            os.unlink(logo_temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/modify_image")
async def modify_image(
    prompt: str = Form(...),
    image: UploadFile = File(...)
):
    if not image:
        raise HTTPException(status_code=400, detail="No image file provided.")
    image_bytes = await image.read()
    try:
        # Send prompt and image to Google model (adjust as needed for your SDK)
        # Prepare the image as a Google Generative AI Image object
        gemini_image = types.Blob(mime_type="image/png", data=image_bytes)
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',  # Use the correct model for your use case
            prompt=prompt,
            images=[gemini_image],
            config=types.GenerateImagesConfig(number_of_images=1)
        )
        if not response.generated_images:
            raise HTTPException(status_code=400, detail="No image generated")
        generated_image = response.generated_images[0]
        output_bytes = generated_image.image.image_bytes

        # Save the output as gen_output.png
        with open("gen_output_2.png", "wb") as f:
            f.write(output_bytes)

        return Response(content=output_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image modification failed: {e}")
