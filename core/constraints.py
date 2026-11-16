from typing import List, Tuple
import math
from core.models import AggregatedRoute, Shipment, RouteEvaluation


def evaluate_hard_constraints(
    aggregated_routes: List[AggregatedRoute],
    shipment: Shipment
) -> List[RouteEvaluation]:
    """
    Step 3: Hard constraint filter.
    Drop routes that miss the deadline, exceed the budget, or break cargo rules.
    """
    evaluations: List[RouteEvaluation] = []

    for agg in aggregated_routes:
        eliminated = False
        reason = None

        # 1. Budget constraint check
        if agg.total_cost > shipment.max_budget:
            eliminated = True
            reason = (
                f"Budget exceeded: Total cost (${agg.total_cost:,.2f}) "
                f"exceeds maximum budget limit (${shipment.max_budget:,.2f})"
            )

        # 2. Cargo rule checks
        elif (shipment.requires_reefer or shipment.cargo_type == "perishable") and not agg.reefer_capable:
            eliminated = True
            reason = "Cargo rule violation: Route contains non-reefer legs incapable of cold-chain preservation"

        # 3. Hazardous cargo restrictions
        elif shipment.hazardous and any(leg.mode == "air" for leg in agg.legs):
            eliminated = True
            reason = "Cargo rule violation: Hazardous cargo is prohibited on commercial air freight legs"

        # 4. Deadline constraint check (analytical P90 check & base time check)
        # Analytical P90 variance across legs: sum of (p_i * std_i^2 + p_i*(1-p_i)*mean_i^2)
        variance = sum(
            (leg.delay_probability * (leg.delay_std_days ** 2)) +
            (leg.delay_probability * (1.0 - leg.delay_probability) * (leg.delay_mean_days ** 2))
            for leg in agg.legs
        )
        analytical_std = math.sqrt(max(0.01, variance))
        analytical_p90_time = agg.total_base_time + agg.expected_delay_days + 1.282 * analytical_std

        if agg.total_base_time > shipment.deadline_days:
            eliminated = True
            reason = (
                f"Deadline missed: Base transit time ({agg.total_base_time:.1f} days) "
                f"exceeds hard deadline ({shipment.deadline_days:.1f} days)"
            )
        elif analytical_p90_time > shipment.deadline_days:
            eliminated = True
            reason = (
                f"Deadline risk too high: P90 transit time ({analytical_p90_time:.1f} days) "
                f"exceeds hard deadline ({shipment.deadline_days:.1f} days)"
            )

        eval = RouteEvaluation(
            route_id=agg.route_id,
            route_name=agg.route_name,
            carrier=agg.carrier,
            aggregated=agg,
            eliminated=eliminated,
            elimination_stage="Hard Constraint" if eliminated else None,
            elimination_reason=reason
        )
        evaluations.append(eval)

    return evaluations

