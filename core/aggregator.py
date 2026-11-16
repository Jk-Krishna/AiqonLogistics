from typing import List
import numpy as np
from core.models import Route, AggregatedRoute


def aggregate_route_legs(route: Route) -> AggregatedRoute:
    """
    Step 2: Aggregate leg data per route.
    cost = Σ legs
    time = Σ legs + hub dwell
    P(delay) = 1 − ∏(1 − pᵢ)
    """
    total_cost = sum(leg.base_cost for leg in route.legs)
    leg_transit_time = sum(leg.base_transit_days for leg in route.legs)
    hub_dwell_time = sum(leg.hub_dwell_days for leg in route.legs)
    total_base_time = leg_transit_time + hub_dwell_time

    # P(delay) = 1 - ∏(1 - p_i)
    prod_no_delay = 1.0
    for leg in route.legs:
        prod_no_delay *= (1.0 - max(0.0, min(1.0, leg.delay_probability)))
    p_delay = 1.0 - prod_no_delay

    # Expected delay duration (in days)
    expected_delay_days = sum(leg.delay_probability * leg.delay_mean_days for leg in route.legs)

    # Composite risk index: combination of bottleneck peak risk and average risk
    leg_risks = [leg.risk_score for leg in route.legs]
    if leg_risks:
        max_risk = max(leg_risks)
        avg_risk = sum(leg_risks) / len(leg_risks)
        # 60% weight to highest bottleneck risk point, 40% to average network exposure
        composite_risk = round(0.6 * max_risk + 0.4 * avg_risk, 4)
    else:
        composite_risk = 0.0

    reefer_capable = all(leg.reefer_supported for leg in route.legs)
    total_co2 = sum(leg.co2_kg for leg in route.legs)

    return AggregatedRoute(
        route_id=route.route_id,
        route_name=route.route_name,
        carrier=route.carrier,
        legs=route.legs,
        total_cost=round(total_cost, 2),
        total_base_time=round(total_base_time, 2),
        hub_dwell_time=round(hub_dwell_time, 2),
        delay_probability=round(p_delay, 4),
        composite_risk=composite_risk,
        reefer_capable=reefer_capable,
        total_co2_kg=round(total_co2, 2),
        expected_delay_days=round(expected_delay_days, 2)
    )
