from typing import List, Dict, Any, Optional
from core.models import RouteEvaluation, Shipment


def generate_explanation(
    shipment: Shipment,
    top_route: Optional[RouteEvaluation],
    runner_up: Optional[RouteEvaluation],
    is_close_call: bool,
    close_call_margin_pct: float,
    all_evaluations: List[RouteEvaluation]
) -> Dict[str, Any]:
    """
    Step 8: Natural Language Explanation Generation.
    Explains why this route was selected, the exact trade-off made, and why each other route lost.
    """
    if not top_route:
        return {
            "executive_summary": (
                f"No viable route found for shipment '{shipment.shipment_id}' ({shipment.origin} -> {shipment.destination}). "
                f"All available routes breached hard constraints (budget ${shipment.max_budget:,.0f} or deadline {shipment.deadline_days} days)."
            ),
            "tradeoff_rationale": "Consider expanding budget, extending deadline, or relaxing cargo constraints.",
            "eliminated_routes_breakdown": [
                {
                    "route_id": e.route_id,
                    "stage": e.elimination_stage or "Constraints",
                    "reason": e.elimination_reason or "Constraint violation"
                }
                for e in all_evaluations
            ],
            "competitor_comparison": []
        }

    # Compare with runner-up or next survivor
    top_agg = top_route.aggregated
    exec_summary = ""
    tradeoff_details = ""

    survivors = [e for e in all_evaluations if not e.eliminated and e.route_id != top_route.route_id]

    if runner_up:
        run_agg = runner_up.aggregated
        cost_diff = top_agg.total_cost - run_agg.total_cost
        pct_cost_diff = (abs(cost_diff) / max(1.0, run_agg.total_cost)) * 100.0
        time_diff = top_agg.total_base_time - run_agg.total_base_time
        risk_diff_pct = (run_agg.delay_probability - top_agg.delay_probability) * 100.0

        if cost_diff > 0:
            cost_clause = f"costs {pct_cost_diff:.1f}% more than {runner_up.route_id} (${top_agg.total_cost:,.0f} vs ${run_agg.total_cost:,.0f})"
        else:
            cost_clause = f"saves {pct_cost_diff:.1f}% cost compared to {runner_up.route_id} (${top_agg.total_cost:,.0f} vs ${run_agg.total_cost:,.0f})"

        if risk_diff_pct > 0:
            risk_clause = f"cuts delay probability from {run_agg.delay_probability*100:.0f}% to {top_agg.delay_probability*100:.0f}%"
        elif risk_diff_pct < 0:
            risk_clause = f"has slightly higher delay probability ({top_agg.delay_probability*100:.0f}% vs {run_agg.delay_probability*100:.0f}%)"
        else:
            risk_clause = f"matches delay probability at {top_agg.delay_probability*100:.0f}%"

        exec_summary = (
            f"{top_route.route_id} ({top_route.route_name}) recommended for {shipment.cargo_type.upper()} shipment. "
            f"It {cost_clause} but {risk_clause}, achieving a {top_route.p_ontime:.0f}% on-time probability under Monte Carlo simulation "
            f"with P90 transit time of {top_route.p90_time:.1f} days and {top_route.decision_stability:.0f}% decision stability."
        )

        tradeoff_details = (
            f"Key Trade-off: Priority '{shipment.cargo_type}' favors "
            f"{'time buffer and risk reduction' if shipment.cargo_type in ['urgent', 'perishable'] else 'cost efficiency'}. "
            f"Although {runner_up.route_id} "
            f"{'is cheaper' if cost_diff > 0 else 'is comparable in transit'}, "
            f"accounting for expected delay penalties raises {runner_up.route_id}'s total expected cost to ${runner_up.expected_cost:,.0f} "
            f"(vs ${top_route.expected_cost:,.0f} for {top_route.route_id}). "
            f"{top_route.route_id} provides the optimal balance of speed, risk mitigation, and operational resilience."
        )
    else:
        exec_summary = (
            f"{top_route.route_id} ({top_route.route_name}) is the sole qualifying route. "
            f"It satisfies all hard constraints with ${top_agg.total_cost:,.0f} cost, {top_route.p_ontime:.0f}% on-time probability, "
            f"and P90 transit time of {top_route.p90_time:.1f} days."
        )
        tradeoff_details = "All other alternatives were eliminated by hard constraints or Pareto dominance."

    if is_close_call and runner_up:
        exec_summary += f" [CLOSE CALL: {close_call_margin_pct:.1f}% utility margin over {runner_up.route_id}]"

    # Route-by-route breakdown
    breakdown: List[Dict[str, str]] = []
    comparisons: List[Dict[str, Any]] = []

    for item in all_evaluations:
        if item.route_id == top_route.route_id:
            breakdown.append({
                "route_id": item.route_id,
                "stage": "Recommended (Winner)",
                "reason": f"Top ranked (Utility Score: {item.utility_score}/100, On-time: {item.p_ontime}%, Stability: {item.decision_stability}%)."
            })
        elif item.eliminated:
            breakdown.append({
                "route_id": item.route_id,
                "stage": f"Eliminated at {item.elimination_stage}",
                "reason": item.elimination_reason or "Eliminated"
            })
        else:
            # Survived but ranked lower
            diff_score = top_route.utility_score - item.utility_score
            breakdown.append({
                "route_id": item.route_id,
                "stage": f"Rank #{item.rank} (Scored Survivor)",
                "reason": (
                    f"Utility score {item.utility_score:.1f} vs {top_route.utility_score:.1f} (-{diff_score:.1f} pts). "
                    f"Higher expected delay cost (${item.expected_cost - item.aggregated.total_cost:,.0f}) "
                    f"and lower on-time probability ({item.p_ontime}% vs {top_route.p_ontime}%)."
                )
            })

        # Structured comparison record
        comparisons.append({
            "route_id": item.route_id,
            "route_name": item.route_name,
            "status": "Recommended" if item.route_id == top_route.route_id else ("Eliminated" if item.eliminated else f"Rank #{item.rank}"),
            "cost": item.aggregated.total_cost,
            "expected_cost": item.expected_cost,
            "transit_days": item.aggregated.total_base_time,
            "p90_days": item.p90_time,
            "delay_prob": round(item.aggregated.delay_probability * 100, 1),
            "ontime_pct": item.p_ontime,
            "stability_pct": item.decision_stability,
            "utility_score": item.utility_score,
            "elimination_reason": item.elimination_reason
        })

    return {
        "executive_summary": exec_summary,
        "tradeoff_rationale": tradeoff_details,
        "eliminated_routes_breakdown": breakdown,
        "competitor_comparison": comparisons
    }
