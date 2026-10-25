# ConstructAI — Multimodal Construction Intelligence

React + Vite frontend and FastAPI backend for construction site decision-support.

## Reference-matched interface
The frontend uses the requested black sidebar, orange active navigation/buttons, white panels, uppercase headings, and eight modules:
1. Safety Monitor
2. Crack Detection
3. Real Estate Valuation
4. Project Planner
5. Knowledge Base
6. Chatbot
7. Daily Site Assistant
8. Weather Advisor

## Setup on Windows

### 1. Backend
Open PowerShell in `backend`:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` and set `GEMINI_API_KEY` to your own key. Never commit `.env` to Git or share it in screenshots.

List models accessible to your API key:

```powershell
python check_models.py
```

Choose a model from that output that supports `generateContent`, then set its exact ID in `GEMINI_MODEL` in `.env`. The model available to one API key may differ from another. Restart FastAPI after changing `.env`.

Start backend:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: `http://127.0.0.1:8000/docs`

### 2. Frontend
Open a second PowerShell terminal in `frontend`:

```powershell
npm install
npm run dev
```

Open the Vite URL printed in the terminal (usually `http://127.0.0.1:5173`).

If Vite uses another port, add that exact origin to `ALLOWED_ORIGINS` in `backend/app/main.py`, then restart the backend.

## Notes and limitations
- PPE and crack pages call the FastAPI image-analysis endpoints and need a valid Gemini model/API key for AI analysis.
- Construction planning, daily site planning, knowledge-base quick references, and the weather impact page provide preliminary educational guidance, not professional engineering advice.
- Property valuation is an explicitly illustrative rate-based estimate, not a formal valuation.
- The Weather Advisor page uses selected conditions and is not a live forecast service.
- Have a qualified site safety officer or structural engineer verify safety-critical decisions.
