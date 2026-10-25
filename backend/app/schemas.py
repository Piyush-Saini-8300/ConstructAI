from pydantic import BaseModel, Field
from typing import Literal
class EstimateRequest(BaseModel):
    built_up_area_sqft: float = Field(gt=0, le=1000000)
    rate_per_sqft_inr: float = Field(gt=0, le=100000)
    market_multiplier: float = Field(gt=0.1, le=10)
    completion_percent: float = Field(ge=0, le=100)
    steel_kg_per_sqft: float = Field(ge=0, le=100)
    cement_bags_per_sqft: float = Field(ge=0, le=10)
class AdvisoryRequest(BaseModel):
    weather: Literal["Normal", "High Wind", "Heavy Rain", "Extreme Heat"]
    site_type: str = "General construction site"
class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    weather: str = "Normal"
