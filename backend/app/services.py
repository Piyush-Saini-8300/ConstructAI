
import json
import logging
import os
import time

from google import genai
from google.genai import types, errors

from .config import settings

logger = logging.getLogger(__name__)

SAFETY_NOTE = (
    "AI-assisted decision support only. Confirm compliance "
    "with a qualified site safety officer."
)

CRACK_NOTE = (
    "Not a structural diagnosis. A qualified structural engineer "
    "must inspect concerning cracks."
)

# Initialize Gemini client
api_key = getattr(settings, "gemini_api_key", None) or os.getenv(
    "GEMINI_API_KEY"
)

client = genai.Client(api_key=api_key) if api_key else None


def _model_json(contents, image_bytes=None, mime_type=None):
    """
    Request JSON from Gemini, with retries for temporary API errors.
    Supports both text prompts and image analysis.
    """

    if client is None:
        logger.warning("Gemini API key is not configured.")
        return None

    # Build request contents for text or image analysis.
    if image_bytes is not None:
        request_contents = [
            types.Part.from_text(text=contents),
            types.Part.from_bytes(
                data=image_bytes,
                mime_type=mime_type or "image/jpeg",
            ),
        ]
    else:
        request_contents = contents

    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=settings.gemini_model,
                contents=request_contents,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            if not response.text:
                raise ValueError("Gemini returned an empty response.")

            return json.loads(response.text)

        except errors.APIError as exc:
            retryable = exc.code in (429, 500, 502, 503, 504)

            if not retryable or attempt == 2:
                logger.exception(
                    "Gemini API request failed (HTTP %s).",
                    exc.code,
                )
                raise

            delay = 2 ** attempt

            logger.warning(
                "Gemini returned HTTP %s. Retrying in %s seconds "
                "(attempt %s/3).",
                exc.code,
                delay,
                attempt + 1,
            )

            time.sleep(delay)

        except (json.JSONDecodeError, ValueError):
            logger.exception("Gemini returned invalid or empty JSON.")
            raise

    return None


def safety(image_bytes, mime_type):
    prompt = (
        "Analyze visible personal protective equipment (PPE) only. "
        "Return JSON keys: overall_status (pass/review/fail), "
        "safety_score (0-100), items array of {item,status,note}, "
        "where status is compliant/missing/unclear, hazards array, "
        "and recommended_actions array. Use unclear when evidence "
        "is insufficient. Never infer hidden details."
    )

    result = _model_json(prompt, image_bytes, mime_type)

    if result is None:
        return {
            "mode": "demo",
            "disclaimer": SAFETY_NOTE,
            "overall_status": "review",
            "safety_score": 0,
            "items": [
                {
                    "item": "Hard hat",
                    "status": "unclear",
                    "note": "Demo mode: image was not analyzed.",
                },
                {
                    "item": "High-visibility vest",
                    "status": "unclear",
                    "note": "Demo mode: image was not analyzed.",
                },
            ],
            "hazards": ["No visual analysis was performed."],
            "recommended_actions": [
                "Check the Gemini API configuration.",
                "Have a safety officer verify site conditions.",
            ],
        }

    result.update(mode="ai", disclaimer=SAFETY_NOTE)
    return result


def cracks(image_bytes, mime_type):
    prompt = (
        "Describe visible surface features, not a definitive structural "
        "diagnosis. Return JSON keys: visible_observations (array), "
        "possible_patterns (array), urgency "
        "(routine_review/prompt_inspection/urgent_inspection), "
        "recommended_actions (array), and limitations (array). "
        "Do not estimate width without a scale or claim structural integrity."
    )

    result = _model_json(prompt, image_bytes, mime_type)

    if result is None:
        return {
            "mode": "demo",
            "disclaimer": CRACK_NOTE,
            "visible_observations": [
                "Demo mode: image was not analyzed."
            ],
            "possible_patterns": [
                "Cannot determine a pattern in demo mode."
            ],
            "urgency": "prompt_inspection",
            "recommended_actions": [
                "Document the location and monitor changes.",
                "Arrange a qualified inspection if the crack grows, "
                "shifts, leaks, or exposes reinforcement.",
            ],
            "limitations": [
                "No image inference was performed."
            ],
        }

    result.update(mode="ai", disclaimer=CRACK_NOTE)
    return result


def chat(question, weather):
    prompt = (
        "You are a cautious construction decision-support assistant. "
        f"Reported weather: {weather}. "
        "Answer concisely and defer to site procedures and official "
        "local alerts. Return a JSON object with keys answer and "
        f"safety_note. Question: {question}"
    )

    result = _model_json(prompt)

    if result is not None:
        return {"mode": "ai", **result}

    return {
        "mode": "demo",
        "answer": (
            f"Demo response for {weather}: follow the approved site "
            "safety plan and official alerts. Reassess exposed work "
            "during high wind, heavy rain, or extreme heat; stop "
            "unsafe activities."
        ),
        "safety_note": (
            "Demo mode does not use an LLM. Verify against site procedures."
        ),
    }
