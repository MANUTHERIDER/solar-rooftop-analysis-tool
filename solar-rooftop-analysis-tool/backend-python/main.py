# backend-python/main.py
from fastapi import FastAPI, HTTPException # <--- THIS LINE IS CRUCIAL
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from src.ai_core import AICore
from src.solar_calculator import SolarCalculator

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Solar Rooftop AI Analysis Engine",
    description="Backend for AI-powered solar potential assessment, image analysis, and calculations.",
    version="0.1.0"
)

# Initialize AI and Calculator instances
ai_core = AICore()
solar_calculator = SolarCalculator()

# --- Basic Health Check Endpoint ---
@app.get("/")
async def read_root():
    return {"message": "Python AI Engine is running! (FastAPI)"}

# --- Request Model for the Assessment Endpoint ---
class AssessmentRequest(BaseModel):
    address: str
    latitude: float
    longitude: float

# --- Main AI Solar Assessment Endpoint ---
@app.post("/api/analyze-rooftop")
async def analyze_rooftop_endpoint(request: AssessmentRequest):
    """
    Receives an address and coordinates, fetches satellite imagery,
    performs AI analysis, and calculates solar potential and ROI.
    """
    print(f"Received assessment request for: {request.address} ({request.latitude}, {request.longitude})")

    try:
        # 1. Fetch satellite image
        image_data = await ai_core.fetch_satellite_image(request.latitude, request.longitude)

        # 2. Perform AI analysis on the image
        location_context = {
            "address": request.address,
            "latitude": request.latitude,
            "longitude": request.longitude
        }
        ai_assessment_raw = await ai_core.analyze_rooftop_with_gemini(image_data, location_context)

        # 3. Extract relevant data for solar calculation
        usable_area = ai_assessment_raw.get('approx_usable_area_sqm', 0.0)
        orientation = ai_assessment_raw.get('dominant_orientation', 'Unknown')
        shading = ai_assessment_raw.get('shading_level', 'unknown')

        # Convert to float safely, handle potential non-numeric from LLM
        try:
            usable_area = float(usable_area)
        except ValueError:
            usable_area = 0.0
            print(f"Warning: approx_usable_area_sqm from LLM was not numeric: {ai_assessment_raw.get('approx_usable_area_sqm')}. Defaulting to 0.")

        # 4. Calculate solar potential and ROI
        solar_calculation_results = solar_calculator.calculate_potential(
            usable_area_sqm=usable_area,
            orientation=orientation,
            shading_level=shading
        )

        # 5. Combine AI insights with calculated results
        final_assessment = {
            "request_details": request.dict(),
            "ai_image_analysis": ai_assessment_raw,
            "solar_financial_analysis": solar_calculation_results,
            "overall_message": "Rooftop analysis complete. See details below."
        }
        
        return final_assessment

    except HTTPException as e: # <--- This is where the error likely originates if import is missing
        raise e # Re-raise FastAPI's HTTPException directly
    except Exception as e:
        print(f"An unhandled error occurred in /api/analyze-rooftop: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during analysis: {str(e)}")

# --- Placeholder for Database Interaction ---
@app.get("/api/solar-panels/{panel_id}")
async def get_solar_panel_details(panel_id: int):
    dummy_panels = {
        1: {"model": "EcoSun 400", "efficiency": "20.5%", "cost_per_watt": 0.85},
        2: {"model": "PowerCell 380", "efficiency": "19.8%", "cost_per_watt": 0.78}
    }
    if panel_id in dummy_panels:
        return dummy_panels[panel_id]
    raise HTTPException(status_code=404, detail="Solar panel not found")