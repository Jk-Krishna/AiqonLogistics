from typing import List, Dict, Tuple
from core.models import RouteEvaluation, Shipment

DEFAULT_WEIGHT_PROFILES: Dict[str, Dict[str, float]] = {
    "urgent": {
        "time": 0.55,
        "risk": 0.30,
        "cost": 0.15,
    },
    "standard": {
        "time": 0.35,
        "risk": 0.25,
        "cost": 0.40,
    },
    "economy": {
        "time": 0.20,
        "risk": 0.15,
        "cost": 0.65,
    },
    "perishable": {
        "time": 0.50,
        "risk": 0.35,
        "cost": 0.15,
    },
}

PREFERENCE_PROFILES: Dict[str, Dict[str, float]] = {
    "lowest_cost": {
        "cost": 0.70,
        "time": 0.15,
        "risk": 0.15,
    },
    "fastest_delivery": {
        "cost": 0.15,
        "time": 0.70,
        "risk": 0.15,
    },
    "lowest_risk": {
        "cost": 0.20,
        "time": 0.20,
        "risk": 0.60,
    },
    "balanced": {
        "cost": 0.35,
        "time": 0.35,
        "risk": 0.30,
    },
}


def score_surviving_routes(
    evaluations: List[RouteEvaluation],
    shipment: Shipment,
    custom_weights: Dict[str, float] = None
) -> Tuple[List[RouteEvaluation], Dict[str, float]]:
    """
    Step 5: Weighted scoring on the survivors.
    - calculate expected cost: base_cost + P(delay) * penalty
    - normalize metrics across surviving candidates
    - apply multi-attribute weights according to user recommendation preference or shipment priority profile
    """
    # Active weights resolution:
    # 1. User custom weight sliders take highest priority
    # 2. Selected recommendation preference (Lowest Cost, Fastest, Lowest Risk, Balanced)
    # 3. Default shipment cargo priority profile (Urgent, Standard, Economy, Perishable)
    pref = getattr(shipment, "recommendation_preference", None)
    if custom_weights:
        weights = custom_weights
    elif pref and pref.lower() in PREFERENCE_PROFILES:
        weights = PREFERENCE_PROFILES[pref.lower()]
    else:
        weights = DEFAULT_WEIGHT_PROFILES.get(
            shipment.cargo_type.lower(),
            DEFAULT_WEIGHT_PROFILES["standard"]
        )
    # Ensure normalized weights summing to 1.0
    w_sum = sum(weights.values())
    w_cost = weights.get("cost", 0.33) / w_sum
    w_time = weights.get("time", 0.33) / w_sum
    w_risk = weights.get("risk", 0.34) / w_sum
    norm_weights = {"cost": round(w_cost, 4), "time": round(w_time, 4), "risk": round(w_risk, 4)}

    survivors = [e for e in evaluations if not e.eliminated]
    if not survivors:
        return evaluations, norm_weights

    # Calculate expected cost for each survivor
    # expected_cost = base_cost + P(delay) * delay_penalty
    for e in survivors:
        agg = e.aggregated
        # Expected financial impact of delay
        delay_cost = agg.delay_probability * (shipment.delay_penalty_cost + (agg.expected_delay_days * shipment.delay_penalty_per_day))
        e.expected_cost = round(agg.total_cost + delay_cost, 2)

    # Gather raw metrics for min-max normalization
    costs = [e.expected_cost for e in survivors]
    times = [e.aggregated.total_base_time + e.aggregated.expected_delay_days for e in survivors]
    risks = [e.aggregated.delay_probability for e in survivors]

    min_c, max_c = min(costs), max(costs)
    min_t, max_t = min(times), max(times)
    min_r, max_r = min(risks), max(risks)

    def normalize(val: float, min_val: float, max_val: float) -> float:
        if max_val - min_val < 1e-6:
            return 0.0
        return (val - min_val) / (max_val - min_val)

    for e in survivors:
        agg = e.aggregated
        eff_time = agg.total_base_time + agg.expected_delay_days
        
        nc = normalize(e.expected_cost, min_c, max_c)
        nt = normalize(eff_time, min_t, max_t)
        nr = normalize(agg.delay_probability, min_r, max_r)

        e.normalized_cost = round(nc, 4)
        e.normalized_time = round(nt, 4)
        e.normalized_risk = round(nr, 4)

        # Composite penalty: 0 is optimal, 1 is worst
        penalty = (w_cost * nc) + (w_time * nt) + (w_risk * nr)
        e.composite_penalty_score = round(penalty, 4)
        # Utility score out of 100: higher is better
        e.utility_score = round(max(0.0, (1.0 - penalty) * 100.0), 2)

    return evaluations, norm_weights
