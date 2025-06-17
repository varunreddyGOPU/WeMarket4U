from fastapi import FastAPI, UploadFile, Form
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO
import os
from dotenv import load_dotenv

# Load environment variables and configure Gemini client
load_dotenv()
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

app = FastAPI()

@app.post("/generate_image_with_logo")
async def generate_image_with_logo(prompt: str = Form(...), logo: UploadFile = None):
    if logo is None:
        return {"error": "Logo file is required"}
    # Save uploaded logo temporarily
    logo_path = f"temp_{logo.filename}"
    with open(logo_path, "wb") as f:
        f.write(await logo.read())
    try:
        # Generate the image
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=prompt,
            config=types.GenerateImagesConfig(number_of_images=1)
        )
        for generated_image in response.generated_images:
            image = Image.open(BytesIO(generated_image.image.image_bytes)).convert("RGBA")
            logo_img = Image.open(logo_path).convert("RGBA")
            logo_width = 100
            logo_height = int(logo_img.height * (logo_width / logo_img.width))
            logo_img = logo_img.resize((logo_width, logo_height))
            image.paste(logo_img, (image.width - logo_img.width - 10, image.height - logo_img.height - 10), logo_img)
            output_path = "output_with_logo.png"
            image.save(output_path)
            os.remove(logo_path)
            return {"output_image_path": output_path}
        os.remove(logo_path)
        return {"error": "No image generated"}
    except Exception as e:
        os.remove(logo_path)
        print("Error in generate_image_with_logo:", e)
        return {"error": str(e)}