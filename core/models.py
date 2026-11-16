from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class Leg(BaseModel):
    leg_id: str
    origin: str
    destination: str
    mode: str  # "ocean", "air", "rail", "road"
    distance_km: float = 0.0
    base_transit_days: float
    base_cost: float
    delay_probability: float = Field(..., ge=0.0, le=1.0)
    delay_mean_days: float = 1.0
    delay_std_days: float = 0.5
    risk_score: float = Field(..., ge=0.0, le=1.0)  # geopolitical, weather, congestion
    hub_dwell_days: float = 0.0
    reefer_supported: bool = True
    co2_kg: float = 0.0


class Route(BaseModel):
    route_id: str
    route_name: str
    carrier: str
    legs: List[Leg]
    description: Optional[str] = None


class AggregatedRoute(BaseModel):
    route_id: str
    route_name: str
    carrier: str
    legs: List[Leg]
    
    # Aggregated metrics
    total_cost: float
    total_base_time: float
    hub_dwell_time: float
    delay_probability: float
    composite_risk: float
    reefer_capable: bool
    total_co2_kg: float
    expected_delay_days: float


class Shipment(BaseModel):
    shipment_id: str
    title: str
    origin: str
    destination: str
    cargo_type: str  # "urgent", "standard", "economy", "perishable"
    weight_kg: float = 1000.0
    deadline_days: float
    max_budget: float
    delay_penalty_cost: float = 2000.0  # penalty cost incurred if delayed beyond deadline
    delay_penalty_per_day: float = 500.0
    requires_reefer: bool = False
    hazardous: bool = False
    routes: List[Route]


class RouteEvaluation(BaseModel):
    route_id: str
    route_name: str
    carrier: str
    aggregated: AggregatedRoute
    
    # Filtering stages
    eliminated: bool = False
    elimination_stage: Optional[str] = None  # "Hard Constraint", "Pareto Filter", None
    elimination_reason: Optional[str] = None
    
    # Scoring
    expected_cost: float = 0.0
    normalized_cost: float = 0.0
    normalized_time: float = 0.0
    normalized_risk: float = 0.0
    utility_score: float = 0.0  # weighted utility (lower penalty or higher score)
    composite_penalty_score: float = 0.0
    
    # Uncertainty analysis (Monte Carlo)
    p_ontime: float = 0.0  # Probability of arriving <= deadline
    p50_time: float = 0.0
    p90_time: float = 0.0
    p95_time: float = 0.0
    mean_simulated_time: float = 0.0
    mean_simulated_cost: float = 0.0
    decision_stability: float = 0.0  # % wins in weight perturbation
    
    rank: Optional[int] = None
    simulated_times_sample: List[float] = []


class OptimizationResult(BaseModel):
    shipment_id: str
    origin: str
    destination: str
    cargo_type: str
    deadline_days: float
    max_budget: float
    
    recommended_route_id: Optional[str] = None
    recommended_route: Optional[RouteEvaluation] = None
    runner_up_route_id: Optional[str] = None
    is_close_call: bool = False
    close_call_margin_pct: float = 0.0
    
    all_evaluations: List[RouteEvaluation] = []
    active_weights: Dict[str, float] = {}
    
    # Natural language explanation
    executive_summary: str = ""
    tradeoff_rationale: str = ""
    eliminated_routes_breakdown: List[Dict[str, str]] = []
    competitor_comparison: List[Dict[str, Any]] = []
