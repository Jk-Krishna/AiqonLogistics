from typing import Optional, Dict
from core.models import Shipment, OptimizationResult
from core.aggregator import aggregate_route_legs
from core.constraints import evaluate_hard_constraints
from core.pareto import apply_pareto_filter
from core.scoring import score_surviving_routes
from core.uncertainty import run_monte_carlo_and_sensitivity
from core.recommender import rank_and_identify_recommendation
from core.explainer import generate_explanation


class RouteOptimizationEngine:
    """
    Complete 8-step intelligent routing optimization pipeline.
    """

    def __init__(
        self,
        mc_simulations: int = 2500,
        jitter_trials: int = 1000,
        close_call_threshold_pct: float = 4.0
    ):
        self.mc_simulations = mc_simulations
        self.jitter_trials = jitter_trials
        self.close_call_threshold_pct = close_call_threshold_pct

    def optimize(
        self,
        shipment: Shipment,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> OptimizationResult:
        # Step 1: Routes loaded in shipment.routes
        routes = shipment.routes

        # Step 2: Aggregate leg data per route
        aggregated_routes = [aggregate_route_legs(r) for r in routes]

        # Step 3: Hard constraint filter
        evaluations = evaluate_hard_constraints(aggregated_routes, shipment)

        # Step 4: Pareto filter on survivors
        evaluations = apply_pareto_filter(evaluations)

        # Step 5: Weighted scoring on surviving routes
        evaluations, active_weights = score_surviving_routes(
            evaluations, shipment, custom_weights=custom_weights
        )

        # Step 6: Uncertainty check (Monte Carlo & Weight Jitter)
        evaluations = run_monte_carlo_and_sensitivity(
            evaluations=evaluations,
            shipment=shipment,
            base_weights=active_weights,
            num_simulations=self.mc_simulations,
            jitter_trials=self.jitter_trials
        )

        # Step 7: Recommend top route & Close-call detection
        top_route, runner_up, is_close_call, close_call_margin_pct = rank_and_identify_recommendation(
            evaluations, close_call_threshold_pct=self.close_call_threshold_pct
        )

        # Step 8: Explanation generation
        explanation_data = generate_explanation(
            shipment=shipment,
            top_route=top_route,
            runner_up=runner_up,
            is_close_call=is_close_call,
            close_call_margin_pct=close_call_margin_pct,
            all_evaluations=evaluations
        )

        result = OptimizationResult(
            shipment_id=shipment.shipment_id,
            origin=shipment.origin,
            destination=shipment.destination,
            cargo_type=shipment.cargo_type,
            deadline_days=shipment.deadline_days,
            max_budget=shipment.max_budget,
            recommended_route_id=top_route.route_id if top_route else None,
            recommended_route=top_route,
            runner_up_route_id=runner_up.route_id if runner_up else None,
            is_close_call=is_close_call,
            close_call_margin_pct=close_call_margin_pct,
            all_evaluations=evaluations,
            active_weights=active_weights,
            executive_summary=explanation_data["executive_summary"],
            tradeoff_rationale=explanation_data["tradeoff_rationale"],
            eliminated_routes_breakdown=explanation_data["eliminated_routes_breakdown"],
            competitor_comparison=explanation_data["competitor_comparison"]
        )

        return result

