from typing import List
from core.models import RouteEvaluation


def apply_pareto_filter(evaluations: List[RouteEvaluation]) -> List[RouteEvaluation]:
    """
    Step 4: Pareto filter.
    Drop surviving routes that are worse than (or equal to) another surviving route on EVERY metric.
    Criteria to minimize:
      1. Cost (total_cost)
      2. Effective Time (total_base_time + expected_delay_days)
      3. Delay Risk (delay_probability)
      4. Composite Risk (composite_risk)
    """
    # Only evaluate routes that survived hard constraints
    survivors = [e for e in evaluations if not e.eliminated]

    for candidate in survivors:
        c_cost = candidate.aggregated.total_cost
        c_time = candidate.aggregated.total_base_time + candidate.aggregated.expected_delay_days
        c_pdelay = candidate.aggregated.delay_probability
        c_risk = candidate.aggregated.composite_risk

        for competitor in survivors:
            if competitor.route_id == candidate.route_id:
                continue

            comp_cost = competitor.aggregated.total_cost
            comp_time = competitor.aggregated.total_base_time + competitor.aggregated.expected_delay_days
            comp_pdelay = competitor.aggregated.delay_probability
            comp_risk = competitor.aggregated.composite_risk

            # Check if competitor is <= on all 4 metrics
            is_better_or_equal = (
                comp_cost <= c_cost and
                comp_time <= c_time and
                comp_pdelay <= c_pdelay and
                comp_risk <= c_risk
            )

            # And strictly better in at least one metric
            is_strictly_better_in_one = (
                comp_cost < c_cost or
                comp_time < c_time or
                comp_pdelay < c_pdelay or
                comp_risk < c_risk
            )

            if is_better_or_equal and is_strictly_better_in_one:
                candidate.eliminated = True
                candidate.elimination_stage = "Pareto Filter"
                
                # Build clear comparative breakdown
                diffs = []
                if comp_cost < c_cost:
                    savings = c_cost - comp_cost
                    diffs.append(f"cheaper by ${savings:,.0f} (${comp_cost:,.0f} vs ${c_cost:,.0f})")
                elif comp_cost == c_cost:
                    diffs.append(f"equal cost (${comp_cost:,.0f})")

                if comp_time < c_time:
                    time_diff = c_time - comp_time
                    diffs.append(f"faster by {time_diff:.1f}d ({comp_time:.1f}d vs {c_time:.1f}d)")
                elif comp_time == c_time:
                    diffs.append(f"equal time ({comp_time:.1f}d)")

                if comp_pdelay < c_pdelay:
                    diffs.append(f"lower delay risk ({comp_pdelay*100:.0f}% vs {c_pdelay*100:.0f}%)")

                reason_details = ", ".join(diffs)
                candidate.elimination_reason = (
                    f"Dominated by {competitor.route_id}: "
                    f"{competitor.route_id} is superior across all objectives ({reason_details})."
                )
                break  # eliminated, no need to check other competitors

    return evaluations

