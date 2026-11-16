import os
import json
import re
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core.models import Shipment, OptimizationResult, Route
from core.generator import (
    generate_synthetic_dataset,
    get_canonical_mumbai_rotterdam_shipment,
    generate_routes_for_user_input
)
from core.locations import search_locations, GLOBAL_LOCATIONS
from core.pipeline import RouteOptimizationEngine

app = FastAPI(
    title="Aiqon Logistics Intelligent Routing Engine API",
    version="1.0.0",
    description="Multi-objective route optimization with uncertainty modeling, Pareto filtering, and human explanations."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory benchmark dataset
DATASET: List[Shipment] = generate_synthetic_dataset(num_shipments=30, seed=101)
ENGINE = RouteOptimizationEngine(mc_simulations=2500, jitter_trials=1000)


class OptimizeRequest(BaseModel):
    shipment: Shipment
    custom_weights: Optional[Dict[str, float]] = None


class NaturalLanguageQueryRequest(BaseModel):
    query: str


class GenerateRoutesRequest(BaseModel):
    origin: str
    destination: str
    cargo_type: str = "standard"
    deadline_days: float = 14.0
    max_budget: float = 6000.0
    requires_reefer: bool = False
    hazardous: bool = False
    allowed_modes: Optional[List[str]] = None
    weight_kg: float = 1000.0


@app.get("/api/locations")
def list_locations(q: str = ""):
    """Return autocomplete search results for global shipping hubs."""
    return search_locations(q, limit=15)


@app.post("/api/generate-routes", response_model=List[Route])
def generate_custom_routes(req: GenerateRoutesRequest):
    """Dynamically generates candidate multimodal routes for any user input corridor."""
    routes = generate_routes_for_user_input(
        origin=req.origin,
        destination=req.destination,
        cargo_type=req.cargo_type,
        deadline_days=req.deadline_days,
        max_budget=req.max_budget,
        requires_reefer=req.requires_reefer,
        hazardous=req.hazardous,
        allowed_modes=req.allowed_modes,
        weight_kg=req.weight_kg
    )
    return routes


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Aiqon Routing Engine", "shipment_count": len(DATASET)}


@app.get("/api/shipments")
def get_shipments():
    """Return catalog of available benchmark shipments."""
    summaries = []
    for s in DATASET:
        summaries.append({
            "shipment_id": s.shipment_id,
            "title": s.title,
            "origin": s.origin,
            "destination": s.destination,
            "cargo_type": s.cargo_type,
            "deadline_days": s.deadline_days,
            "max_budget": s.max_budget,
            "route_count": len(s.routes),
            "requires_reefer": s.requires_reefer,
            "hazardous": s.hazardous
        })
    return summaries


@app.get("/api/shipments/{shipment_id}")
def get_shipment_by_id(shipment_id: str):
    """Retrieve full shipment definition including routes and legs."""
    for s in DATASET:
        if s.shipment_id.lower() == shipment_id.lower():
            return s
    raise HTTPException(status_code=404, detail="Shipment not found")


@app.post("/api/optimize", response_model=OptimizationResult)
def optimize_shipment(req: OptimizeRequest):
    """Run full 8-step route optimization pipeline on a shipment."""
    try:
        result = ENGINE.optimize(req.shipment, custom_weights=req.custom_weights)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@app.get("/api/evaluate")
def get_evaluation():
    """Return offline benchmark evaluation results."""
    eval_file = "evaluation_results.json"
    if os.path.exists(eval_file):
        with open(eval_file, "r") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail="Evaluation results not yet generated. Run evaluate.py first.")


@app.post("/api/parse-query")
def parse_natural_language_query(req: NaturalLanguageQueryRequest):
    """
    Plain English query parser (Bonus LLM Agent layer):
    Extracts origin, destination, priority, deadline, budget from user text.
    """
    text = req.query.lower()
    
    # Priority detection
    cargo_type = "standard"
    if "urgent" in text or "express" in text or "rush" in text or "asap" in text:
        cargo_type = "urgent"
    elif "perishable" in text or "cold" in text or "fruit" in text or "pharma" in text or "reefer" in text:
        cargo_type = "perishable"
    elif "economy" in text or "cheap" in text or "budget" in text or "slow" in text:
        cargo_type = "economy"

    # Deadline extraction (e.g. "14 days", "14-day", "10 days")
    deadline_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:-day|day|days)', text)
    deadline = float(deadline_match.group(1)) if deadline_match else (14.0 if cargo_type == "urgent" else 20.0)

    # Budget extraction (e.g. "$6000", "6000 usd", "budget of 5000")
    budget_match = re.search(r'\$?\s*(\d{3,6})\s*(?:usd|\$|dollars)?', text)
    budget = float(budget_match.group(1)) if budget_match else 7000.0

    # Route origin/destination extraction (e.g. "from Singapore to Rotterdam", "Mumbai to Hamburg")
    corridor_match = re.search(r'(?:from\s+)?([a-zA-Z\s]+?)\s+(?:to|->|—)\s+([a-zA-Z\s]+?)(?:,|\.|\bwithin|\bwith|\bdeadline|\bbudget|$)', text)
    if corridor_match:
        orig_raw = corridor_match.group(1).strip().title()
        dest_raw = corridor_match.group(2).strip().title()
        # Clean up filler words
        orig_raw = re.sub(r'^(urgent|perishable|economy|a|an|the|need)\s+', '', orig_raw, flags=re.IGNORECASE).strip()
        dest_raw = re.sub(r'\s+(within|with|in|by|budget).*$', '', dest_raw, flags=re.IGNORECASE).strip()
        origin = orig_raw or "Mumbai, India"
        dest = dest_raw or "Rotterdam, Netherlands"
    else:
        origin = "Mumbai, India"
        dest = "Rotterdam, Netherlands"

    requires_reefer = (cargo_type == "perishable" or "reefer" in text or "cold" in text)
    hazardous = ("hazardous" in text or "hazard" in text or "chemical" in text)

    # Dynamically generate realistic multimodal candidate routes for this custom corridor
    custom_routes = generate_routes_for_user_input(
        origin=origin,
        destination=dest,
        cargo_type=cargo_type,
        deadline_days=deadline,
        max_budget=budget,
        requires_reefer=requires_reefer,
        hazardous=hazardous
    )

    custom_shipment = Shipment(
        shipment_id="CUSTOM-SHP",
        title=f"{cargo_type.capitalize()} Freight ({origin} -> {dest})",
        origin=origin,
        destination=dest,
        cargo_type=cargo_type,
        weight_kg=1500.0,
        deadline_days=deadline,
        max_budget=budget,
        delay_penalty_cost=2000.0 if cargo_type == "standard" else 3000.0,
        delay_penalty_per_day=500.0,
        requires_reefer=requires_reefer,
        hazardous=hazardous,
        routes=custom_routes
    )

    return {
        "parsed_entities": {
            "origin": origin,
            "destination": dest,
            "cargo_type": cargo_type,
            "deadline_days": deadline,
            "max_budget": budget
        },
        "shipment": custom_shipment
    }


# Serve built React frontend if dist directory exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            from fastapi.responses import FileResponse
            return FileResponse(file_path)
        from fastapi.responses import FileResponse
        return FileResponse(os.path.join(frontend_dist, "index.html"))
