# backend-python/src/ai_core.py

import os
import io
import json
from PIL import Image
import google.generativeai as genai
import httpx
from dotenv import load_dotenv
from fastapi import HTTPException # <--- THIS LINE IS ALSO CRUCIAL FOR ai_core.py

load_dotenv() # Load environment variables

class AICore:
    def __init__(self):
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        if not os.getenv("GEMINI_API_KEY"):
            raise ValueError("GEMINI_API_KEY environment variable not set.")

        self.vision_model = genai.GenerativeModel(os.getenv("GEMINI_VISION_MODEL", 'gemini-pro-vision'))
        self.text_model = genai.GenerativeModel(os.getenv("GEMINI_TEXT_MODEL", 'gemini-pro'))
        self.http_client = httpx.AsyncClient()

    async def fetch_satellite_image(self, lat: float, lon: float, zoom: int = 19, size: str = "640x640") -> bytes:
        """
        Fetches a satellite image from a public source (e.g., Google Static Maps API).
        NOTE: You will need a Google Cloud API Key with Static Maps API enabled for this.
        """
        Maps_api_key = os.getenv("Maps_STATIC_API_KEY")
        if not Maps_api_key:
            raise ValueError("Maps_STATIC_API_KEY environment variable not set.")

        map_url = (
            f"https://maps.googleapis.com/maps/api/staticmap?"
            f"center={lat},{lon}&zoom={zoom}&size={size}&maptype=satellite&key={Maps_api_key}"
        )
        print(f"Fetching image from: {map_url}")
        try:
            response = await self.http_client.get(map_url, timeout=10.0)
            response.raise_for_status()
            if not response.content:
                raise ValueError("Fetched image content is empty.")
            
            # Basic check to ensure it's an image. Google Maps API might return JSON error on failure.
            try:
                Image.open(io.BytesIO(response.content)).verify()
                return response.content
            except Exception:
                # If verify fails, it's not a valid image. Log response content for debugging.
                print(f"Invalid image content or API error: {response.content.decode('utf-8', errors='ignore')[:500]}")
                raise HTTPException(status_code=500, detail="Failed to fetch valid satellite image. Check API key and quota.")


        except httpx.HTTPStatusError as e:
            print(f"HTTP error fetching satellite image: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Failed to fetch satellite image: {e.response.text}")
        except httpx.RequestError as e:
            print(f"Network error fetching satellite image: {e}")
            raise HTTPException(status_code=500, detail=f"Network error fetching satellite image: {e}")
        except Exception as e:
            print(f"An unexpected error occurred while fetching image: {e}")
            raise HTTPException(status_code=500, detail=f"Unexpected error fetching image: {str(e)}")


    async def analyze_rooftop_with_gemini(self, image_data: bytes, location_context: dict) -> dict:
        """
        Analyzes the rooftop image using Gemini Vision Pro and generates a structured assessment.
        """
        img = Image.open(io.BytesIO(image_data))

        prompt_parts = [
            f"""
            You are an expert AI assistant specializing in solar energy rooftop analysis.
            Analyze the provided satellite image of a rooftop located at:
            Address: {location_context.get('address', 'Unknown')}
            Latitude: {location_context.get('latitude', 'Unknown')}
            Longitude: {location_context.get('longitude', 'Unknown')}

            Carefully identify the following features and provide your analysis in a JSON format ONLY.
            Do not include any text before or after the JSON. Ensure the JSON is valid and well-formed.

            JSON Structure:
            ```json
            {{
              "rooftop_shape": "string (e.g., 'rectangular', 'L-shaped', 'complex', 'irregular')",
              "approx_usable_area_sqm": "float (estimate, considering obstructions, round to 1 decimal place)",
              "dominant_orientation": "string (e.g., 'South', 'South-West', 'Flat', 'Multi-directional', 'Unknown')",
              "shading_level": "string ('low', 'medium', 'high', 'negligible', 'significant')",
              "shading_sources": "array of strings (e.g., ['tall trees to the west', 'adjacent building to the north', 'chimney'])",
              "visible_obstructions": "array of strings (e.g., ['vents', 'skylights', 'HVAC units', 'antennas', 'complex roof geometry'])",
              "panel_layout_suggestion": "string (e.g., 'single array on south face', 'multiple arrays on south and west faces', 'split arrays due to obstructions')",
              "preliminary_feasibility_notes": "string (general notes on feasibility, e.g., 'appears highly suitable', 'potential shading concerns', 'complex due to multiple facets')",
              "estimated_max_panel_count": "integer (estimate based on usable area and typical panel size of ~1.7 sqm)",
              "is_suitable_for_solar": "boolean (true if generally suitable, false if significant challenges)",
              "confidence_score_percent": "integer (your confidence in this analysis, 0-100)"
            }}
            ```
            Focus on providing precise estimates and observations based *only* on the image.
            If a value cannot be reasonably determined from the image, state 'Unknown' or an empty array as appropriate, but do not omit keys.
            Provide your best estimate for numerical values.
            """
        ]

        try:
            response = await self.vision_model.generate_content_async(
                [prompt_parts[0], img],
                generation_config={"response_mime_type": "application/json"}
            )
            
            llm_raw_output = response.text
            print(f"Raw LLM output: {llm_raw_output}")

            parsed_data = json.loads(llm_raw_output)

            required_keys = ["approx_usable_area_sqm", "dominant_orientation", "shading_level", "is_suitable_for_solar"]
            if not all(key in parsed_data and parsed_data[key] is not None for key in required_keys):
                raise ValueError(f"LLM output missing required keys or contains nulls: {required_keys}")
            
            return parsed_data

        except genai.GenerativeContentError as e:
            print(f"Gemini API error during content generation: {e.message}")
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {e.message}")
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from LLM output: {e}. Raw output: {llm_raw_output[:500]}...")
            raise HTTPException(status_code=500, detail=f"AI returned invalid JSON: {e}")
        except ValueError as e:
            print(f"Validation error in LLM parsed output: {e}")
            raise HTTPException(status_code=500, detail=f"AI output validation failed: {e}")
        except Exception as e:
            print(f"An unexpected error occurred during AI analysis: {e}")
            raise HTTPException(status_code=500, detail=f"Unexpected error during AI analysis: {str(e)}")