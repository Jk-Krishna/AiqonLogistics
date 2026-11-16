from typing import List, Dict
import numpy as np
from core.models import RouteEvaluation, Shipment


def run_monte_carlo_and_sensitivity(
    evaluations: List[RouteEvaluation],
    shipment: Shipment,
    base_weights: Dict[str, float],
    num_simulations: int = 2500,
    jitter_trials: int = 1000,
    random_seed: int = 42
) -> List[RouteEvaluation]:
    """
    Step 6: Uncertainty check.
    - Monte Carlo simulation: simulates realized transit times & delay shocks
      Computes P(on-time), P50, P90, P95, and realized costs.
    - Weight Jitter: perturbs criteria weights to test decision stability %.
    """
    rng = np.random.default_rng(random_seed)
    survivors = [e for e in evaluations if not e.eliminated]

    if not survivors:
        return evaluations

    # 1. Monte Carlo Transit Time Simulation
    simulated_times_by_route = {}
    for eval_item in survivors:
        agg = eval_item.aggregated
        total_times = np.zeros(num_simulations)

        # Baseline time (leg base times + hub dwell times)
        deterministic_time = sum(leg.base_transit_days + leg.hub_dwell_days for leg in agg.legs)
        total_times += deterministic_time

        # Stochastic leg delays
        for leg in agg.legs:
            p_delay = leg.delay_probability
            # Bernoulli trial for delay occurrence
            delay_occurred = rng.binomial(n=1, p=p_delay, size=num_simulations)

            # If delayed, draw from a lognormal distribution to model realistic right-skewed logistics delays
            # mu, sigma derived from leg.delay_mean_days and leg.delay_std_days
            mean = max(0.2, leg.delay_mean_days)
            std = max(0.1, leg.delay_std_days)
            variance = std ** 2
            mu_ln = np.log((mean ** 2) / np.sqrt(variance + mean ** 2))
            sigma_ln = np.sqrt(np.log(variance / (mean ** 2) + 1.0))

            delay_magnitudes = rng.lognormal(mean=mu_ln, sigma=sigma_ln, size=num_simulations)
            total_times += delay_occurred * delay_magnitudes

        simulated_times_by_route[eval_item.route_id] = total_times

        # Extract percentiles & metrics
        p_ontime = float(np.mean(total_times <= shipment.deadline_days) * 100.0)
        p50 = float(np.percentile(total_times, 50))
        p90 = float(np.percentile(total_times, 90))
        p95 = float(np.percentile(total_times, 95))
        mean_time = float(np.mean(total_times))

        # Realized costs under simulation
        lateness_days = np.maximum(0.0, total_times - shipment.deadline_days)
        delay_penalty_incurred = (total_times > shipment.deadline_days) * shipment.delay_penalty_cost + (lateness_days * shipment.delay_penalty_per_day)
        mean_cost = float(agg.total_cost + np.mean(delay_penalty_incurred))

        eval_item.p_ontime = round(p_ontime, 1)
        eval_item.p50_time = round(p50, 2)
        eval_item.p90_time = round(p90, 2)
        eval_item.p95_time = round(p95, 2)
        eval_item.mean_simulated_time = round(mean_time, 2)
        eval_item.mean_simulated_cost = round(mean_cost, 2)

        # Store downsampled points (60 samples) for the UI distribution chart
        step = max(1, num_simulations // 60)
        eval_item.simulated_times_sample = [round(float(x), 2) for x in total_times[::step][:60]]

    # 2. Weight Jitter / Sensitivity Analysis
    # Perturb weights by +/- 15% gaussian jitter over jitter_trials
    w_cost = base_weights.get("cost", 0.33)
    w_time = base_weights.get("time", 0.33)
    w_risk = base_weights.get("risk", 0.34)

    wins_count = {e.route_id: 0 for e in survivors}

    for _ in range(jitter_trials):
        # Multiplicative jitter: w * (1 + N(0, 0.15^2))
        jitter_c = max(0.05, w_cost * (1.0 + rng.normal(0, 0.15)))
        jitter_t = max(0.05, w_time * (1.0 + rng.normal(0, 0.15)))
        jitter_r = max(0.05, w_risk * (1.0 + rng.normal(0, 0.15)))
        sum_j = jitter_c + jitter_t + jitter_r
        jc, jt, jr = jitter_c / sum_j, jitter_t / sum_j, jitter_r / sum_j

        best_score = float("inf")
        best_id = None
        for e in survivors:
            trial_penalty = (jc * e.normalized_cost) + (jt * e.normalized_time) + (jr * e.normalized_risk)
            if trial_penalty < best_score:
                best_score = trial_penalty
                best_id = e.route_id

        if best_id:
            wins_count[best_id] += 1

    for e in survivors:
        e.decision_stability = round((wins_count[e.route_id] / jitter_trials) * 100.0, 1)

    return evaluations

