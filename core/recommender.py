from typing import List, Tuple, Optional
from core.models import RouteEvaluation


def rank_and_identify_recommendation(
    evaluations: List[RouteEvaluation],
    close_call_threshold_pct: float = 4.0
) -> Tuple[Optional[RouteEvaluation], Optional[RouteEvaluation], bool, float]:
    """
    Step 7: Recommend the top route.
    Ranks surviving candidates and flags a "close call" if the top two scores are nearly equal.
    """
    survivors = [e for e in evaluations if not e.eliminated]

    if not survivors:
        return None, None, False, 0.0

    # Sort survivors primarily by utility_score descending (penalty ascending),
    # then tie-break with on-time probability descending and cost ascending
    survivors.sort(key=lambda x: (-x.utility_score, -x.p_ontime, x.expected_cost))

    for idx, item in enumerate(survivors):
        item.rank = idx + 1

    top_route = survivors[0]
    runner_up = survivors[1] if len(survivors) > 1 else None

    is_close_call = False
    close_call_margin_pct = 0.0

    if runner_up:
        # Score margin relative to top utility
        score_diff = abs(top_route.utility_score - runner_up.utility_score)
        base = max(1.0, top_route.utility_score)
        close_call_margin_pct = round((score_diff / base) * 100.0, 2)

        if close_call_margin_pct <= close_call_threshold_pct:
            is_close_call = True

    return top_route, runner_up, is_close_call, close_call_margin_pct

