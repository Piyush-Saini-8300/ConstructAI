from google import genai
from app.config import settings

if not settings.gemini_api_key.strip():
    raise SystemExit("GEMINI_API_KEY is empty. Add it to backend/.env first.")

client = genai.Client(api_key=settings.gemini_api_key.strip())
for model in client.models.list():
    actions = getattr(model, "supported_actions", []) or []
    if "generateContent" in actions:
        print(model.name)
