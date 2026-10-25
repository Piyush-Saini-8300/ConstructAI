
from contextlib import asynccontextmanager
from io import BytesIO
import logging

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from .config import settings
from .schemas import EstimateRequest, AdvisoryRequest, ChatRequest
from .services import safety, cracks, chat


# --------------------------------------------------
# LOGGING
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --------------------------------------------------
# APPLICATION LIFESPAN
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Construction Intelligence API starting...")
    logger.info(
        "Gemini AI configured: %s",
        bool(settings.gemini_api_key.strip()),
    )
    yield
    logger.info("Construction Intelligence API stopped.")


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="Multimodal Construction Intelligence API",
    description=(
        "Construction-site safety analysis, crack diagnostics, "
        "construction cost estimation, weather advisories, "
        "and a site assistant."
    ),
    version="1.1.0",
    lifespan=lifespan,
)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------
# Explicitly allow the two common local Vite origins.
# If your frontend uses another port, add its origin here.

ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://constructai-rose.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)


# --------------------------------------------------
# GLOBAL ERROR HANDLERS
# --------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "details": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(request, exc):
    logger.exception(
        "Unexpected API error on %s %s",
        request.method,
        request.url.path,
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "An unexpected server error occurred.",
            "message": "Check the backend terminal for diagnostic details.",
        },
    )


# --------------------------------------------------
# ROOT AND HEALTH CHECK
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "Multimodal Construction Intelligence Platform",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_configured": bool(settings.gemini_api_key.strip()),
        "version": "1.1.0",
    }


# --------------------------------------------------
# IMAGE VALIDATION
# --------------------------------------------------

async def image_data(file: UploadFile):
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    content_type = (file.content_type or "").lower().strip()

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=415,
            detail="Upload a JPG, PNG, or WEBP image.",
        )

    max_bytes = settings.max_upload_mb * 1024 * 1024

    # Read at most one byte beyond the configured limit.
    data = await file.read(max_bytes + 1)

    if not data:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    if len(data) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Image must be {settings.max_upload_mb} MB or smaller.",
        )

    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(
                    status_code=415,
                    detail="The image format is not supported.",
                )

            image.verify()

    except HTTPException:
        raise

    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        )

    return data, content_type


# --------------------------------------------------
# PPE SAFETY ANALYSIS
# --------------------------------------------------

@app.post("/api/safety/analyze")
async def safety_analyze(file: UploadFile = File(...)):
    data, mime_type = await image_data(file)

    try:
        result = safety(data, mime_type)
        return result

    except Exception:
        logger.exception("PPE safety analysis failed")

        raise HTTPException(
            status_code=502,
            detail=(
                "PPE analysis failed. Check the backend logs "
                "and Gemini API configuration."
            ),
        )


# --------------------------------------------------
# CONCRETE CRACK DIAGNOSTICS
# --------------------------------------------------

@app.post("/api/cracks/analyze")
async def crack_analyze(file: UploadFile = File(...)):
    data, mime_type = await image_data(file)

    try:
        result = cracks(data, mime_type)
        return result

    except Exception:
        logger.exception("Crack diagnostics failed")

        raise HTTPException(
            status_code=502,
            detail=(
                "Crack analysis failed. Check the backend logs "
                "and Gemini API configuration."
            ),
        )


# --------------------------------------------------
# CONSTRUCTION COST AND VALUATION ESTIMATE
# --------------------------------------------------

@app.post("/api/planning/estimate")
def estimate(req: EstimateRequest):
    area = req.built_up_area_sqft
    rate = req.rate_per_sqft_inr
    completion = req.completion_percent / 100

    construction_budget = area * rate

    incurred_cost = construction_budget * completion

    estimated_market_value = (
        construction_budget * req.market_multiplier
    )

    steel_allowance = area * req.steel_kg_per_sqft

    cement_allowance = area * req.cement_bags_per_sqft

    return {
        "currency": "INR",
        "built_up_area_sqft": area,
        "construction_budget_inr": round(
            construction_budget, 2
        ),
        "incurred_cost_estimate_inr": round(
            incurred_cost, 2
        ),
        "remaining_budget_estimate_inr": round(
            construction_budget - incurred_cost, 2
        ),
        "completion_percent": req.completion_percent,
        "illustrative_market_value_inr": round(
            estimated_market_value, 2
        ),
        "steel_allowance_kg": round(
            steel_allowance, 2
        ),
        "cement_allowance_bags": round(
            cement_allowance, 2
        ),
        "assumptions": [
            (
                "Construction rates and market multipliers are "
                "illustrative user-supplied inputs."
            ),
            (
                "This estimate is not a contractor quotation "
                "or formal property valuation."
            ),
            (
                "Material quantities must be verified against "
                "approved drawings and professional calculations."
            ),
        ],
    }


# --------------------------------------------------
# WEATHER-BASED SITE ADVISORY
# --------------------------------------------------

@app.post("/api/advisory")
def advisory(req: AdvisoryRequest):
    entries = {
        "Normal": {
            "risk_level": "low",
            "actions": [
                "Conduct the daily toolbox talk.",
                "Verify PPE and equipment before work.",
                "Inspect access routes and maintain housekeeping.",
            ],
        },
        "High Wind": {
            "risk_level": "high",
            "actions": [
                "Check official weather alerts and site wind limits.",
                (
                    "Suspend lifting and work at height when "
                    "required by site safety procedures."
                ),
                "Secure loose materials and temporary structures.",
                "Reassess crane and scaffold safety.",
            ],
        },
        "Heavy Rain": {
            "risk_level": "high",
            "actions": [
                "Inspect drainage and slippery walking surfaces.",
                "Reassess excavations for instability or flooding.",
                "Protect electrical equipment from water.",
                "Stop unsafe work and follow emergency procedures.",
            ],
        },
        "Extreme Heat": {
            "risk_level": "high",
            "actions": [
                "Provide drinking water, shade, and rest breaks.",
                "Reschedule strenuous tasks where practicable.",
                "Monitor workers for signs of heat illness.",
                "Follow site heat-stress and emergency procedures.",
            ],
        },
    }

    result = entries.get(req.weather)

    if result is None:
        raise HTTPException(
            status_code=422,
            detail="Unsupported weather condition.",
        )

    return {
        "weather": req.weather,
        "risk_level": result["risk_level"],
        "actions": result["actions"],
        "disclaimer": (
            "General guidance only. Follow official local alerts, "
            "site procedures, and competent-person instructions."
        ),
    }


# --------------------------------------------------
# SITE CHATBOT
# --------------------------------------------------

@app.post("/api/chat")
def site_chat(req: ChatRequest):
    try:
        result = chat(
            req.question,
            req.weather,
        )

        return result

    except Exception:
        logger.exception("Site chatbot request failed")

        raise HTTPException(
            status_code=502,
            detail=(
                "The site assistant could not generate a response. "
                "Check the backend terminal and Gemini API configuration."
            ),
        )
