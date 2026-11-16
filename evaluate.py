import os
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from typing import List, Dict, Any

from core.models import Shipment, Route
from core.generator import generate_synthetic_dataset
from core.pipeline import RouteOptimizationEngine
from core.aggregator import aggregate_route_legs


def simulate_realized_outcome(
    route: Route,
    shipment: Shipment,
    num_trials: int = 1000,
    rng: np.random.Generator = None
) -> Dict[str, float]:
    """
    Simulates realized real-world operational execution of a chosen route across Monte Carlo trials.
    Returns realized transit time, lateness, cost (base + delay penalties), and on-time rate.
    """
    if rng is None:
        rng = np.random.default_rng(42)

    agg = aggregate_route_legs(route)
    total_times = np.zeros(num_trials)
    base_deterministic = sum(leg.base_transit_days + leg.hub_dwell_days for leg in agg.legs)
    total_times += base_deterministic

    for leg in agg.legs:
        delays_active = rng.binomial(1, leg.delay_probability, size=num_trials)
        mean = max(0.2, leg.delay_mean_days)
        std = max(0.1, leg.delay_std_days)
        var = std ** 2
        mu_ln = np.log((mean ** 2) / np.sqrt(var + mean ** 2))
        sigma_ln = np.sqrt(np.log(var / (mean ** 2) + 1.0))
        magnitudes = rng.lognormal(mean=mu_ln, sigma=sigma_ln, size=num_trials)
        total_times += delays_active * magnitudes

    is_ontime = total_times <= shipment.deadline_days
    ontime_pct = float(np.mean(is_ontime) * 100.0)

    lateness_days = np.maximum(0.0, total_times - shipment.deadline_days)
    penalties = (total_times > shipment.deadline_days) * shipment.delay_penalty_cost + (lateness_days * shipment.delay_penalty_per_day)
    realized_costs = agg.total_cost + penalties

    return {
        "base_cost": agg.total_cost,
        "mean_realized_cost": float(np.mean(realized_costs)),
        "p95_realized_cost": float(np.percentile(realized_costs, 95)),
        "ontime_rate": ontime_pct,
        "mean_transit_time": float(np.mean(total_times)),
        "p90_transit_time": float(np.percentile(total_times, 90)),
        "p95_transit_time": float(np.percentile(total_times, 95)),
        "mean_delay_penalty": float(np.mean(penalties)),
        "reefer_violation": (shipment.requires_reefer and not agg.reefer_capable),
        "budget_exceeded": agg.total_cost > shipment.max_budget
    }


def run_offline_evaluation(num_shipments: int = 30) -> Dict[str, Any]:
    print(f"============================================================")
    print(f"Starting Offline Benchmark Evaluation across {num_shipments} Shipments...")
    print(f"Comparing Aiqon Intelligent Optimizer against 3 Baselines:")
    print(f"  1. Baseline 1: Cheapest Route (pure cost minimization)")
    print(f"  2. Baseline 2: Fastest Route (pure speed minimization)")
    print(f"  3. Baseline 3: Lowest-Risk Route (pure risk minimization)")
    print(f"============================================================")

    shipments = generate_synthetic_dataset(num_shipments=num_shipments, seed=101)
    engine = RouteOptimizationEngine(mc_simulations=2000, jitter_trials=500)
    rng = np.random.default_rng(2026)

    methods = ["Aiqon (Proposed)", "Baseline: Cheapest", "Baseline: Fastest", "Baseline: Lowest-Risk"]
    results_by_method = {m: [] for m in methods}
    detailed_rows = []

    for idx, shp in enumerate(shipments):
        agg_routes = [aggregate_route_legs(r) for r in shp.routes]

        # 1. Proposed Aiqon Optimizer
        opt_res = engine.optimize(shp)
        if opt_res.recommended_route:
            aiqon_route = next(r for r in shp.routes if r.route_id == opt_res.recommended_route_id)
        else:
            aiqon_route = shp.routes[0]

        # 2. Baseline: Cheapest
        cheapest_route = min(shp.routes, key=lambda r: aggregate_route_legs(r).total_cost)

        # 3. Baseline: Fastest
        fastest_route = min(shp.routes, key=lambda r: aggregate_route_legs(r).total_base_time)

        # 4. Baseline: Lowest Risk
        lowest_risk_route = min(shp.routes, key=lambda r: aggregate_route_legs(r).delay_probability)

        selected_map = {
            "Aiqon (Proposed)": aiqon_route,
            "Baseline: Cheapest": cheapest_route,
            "Baseline: Fastest": fastest_route,
            "Baseline: Lowest-Risk": lowest_risk_route
        }

        row_info = {
            "shipment_id": shp.shipment_id,
            "title": shp.title,
            "cargo_type": shp.cargo_type,
            "deadline_days": shp.deadline_days,
            "max_budget": shp.max_budget
        }

        for m_name, chosen_route in selected_map.items():
            sim_stats = simulate_realized_outcome(chosen_route, shp, num_trials=1000, rng=rng)
            results_by_method[m_name].append(sim_stats)
            row_info[f"{m_name}_route"] = chosen_route.route_id
            row_info[f"{m_name}_cost"] = round(sim_stats["mean_realized_cost"], 2)
            row_info[f"{m_name}_ontime"] = round(sim_stats["ontime_rate"], 1)
            row_info[f"{m_name}_p95_time"] = round(sim_stats["p95_transit_time"], 1)

        detailed_rows.append(row_info)

    # Compute aggregate summary statistics
    summary_data = []
    for m_name in methods:
        stats_list = results_by_method[m_name]
        avg_base_cost = np.mean([s["base_cost"] for s in stats_list])
        avg_realized_cost = np.mean([s["mean_realized_cost"] for s in stats_list])
        avg_penalty = np.mean([s["mean_delay_penalty"] for s in stats_list])
        avg_ontime = np.mean([s["ontime_rate"] for s in stats_list])
        avg_p95_time = np.mean([s["p95_transit_time"] for s in stats_list])
        total_reefer_violations = sum(1 for s in stats_list if s["reefer_violation"])
        total_budget_violations = sum(1 for s in stats_list if s["budget_exceeded"])

        summary_data.append({
            "Method": m_name,
            "Avg Base Cost ($)": round(avg_base_cost, 2),
            "Avg Realized Cost ($)": round(avg_realized_cost, 2),
            "Avg Delay Penalty Incurred ($)": round(avg_penalty, 2),
            "On-Time Delivery Rate (%)": round(avg_ontime, 2),
            "Avg P95 Transit Time (days)": round(avg_p95_time, 2),
            "Cargo Constraint Violations": total_reefer_violations,
            "Budget Violations": total_budget_violations
        })

    summary_df = pd.DataFrame(summary_data)
    print("\n=== AGGREGATE BENCHMARK RESULTS (30 SHIPMENTS) ===")
    print(summary_df.to_string(index=False))

    # Save detailed data to CSV and JSON
    summary_df.to_csv("evaluation_summary.csv", index=False)
    with open("evaluation_results.json", "w") as f:
        json.dump({
            "summary": summary_data,
            "shipments": detailed_rows
        }, f, indent=2)
    print("\nSaved evaluation_summary.csv and evaluation_results.json.")

    # Generate Professional Plots
    generate_evaluation_charts(summary_df, detailed_rows)

    return {"summary": summary_data, "detailed": detailed_rows}


def generate_evaluation_charts(summary_df: pd.DataFrame, detailed_rows: List[Dict]):
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    fig, axes = plt.subplots(2, 2, figsize=(14, 10))
    fig.suptitle("Aiqon Intelligent Logistics Routing Optimizer — Empirical Benchmark vs Baselines", fontsize=15, fontweight="bold", y=0.98)

    methods = summary_df["Method"].tolist()
    colors = ["#10b981", "#ef4444", "#3b82f6", "#8b5cf6"]

    # 1. Total Realized Cost (Base Cost + Delay Penalties)
    ax1 = axes[0, 0]
    base_costs = summary_df["Avg Base Cost ($)"].tolist()
    penalties = summary_df["Avg Delay Penalty Incurred ($)"].tolist()
    bars1 = ax1.bar(methods, base_costs, label="Base Freight Cost", color="#93c5fd")
    bars2 = ax1.bar(methods, penalties, bottom=base_costs, label="Delay Penalties Incurred", color="#f87171")
    ax1.set_title("Total Realized Cost ($) [Base + Penalties]", fontweight="bold", fontsize=12)
    ax1.set_ylabel("USD ($)")
    ax1.legend(loc="upper left")
    for i, total in enumerate(summary_df["Avg Realized Cost ($)"]):
        ax1.text(i, total + 100, f"${total:,.0f}", ha="center", fontweight="bold", fontsize=10)
    ax1.tick_params(axis='x', rotation=15)

    # 2. On-Time Delivery Rate (%)
    ax2 = axes[0, 1]
    ontime_rates = summary_df["On-Time Delivery Rate (%)"].tolist()
    bars = ax2.bar(methods, ontime_rates, color=colors)
    ax2.set_title("On-Time Delivery Reliability (%)", fontweight="bold", fontsize=12)
    ax2.set_ylabel("On-Time Rate (%)")
    ax2.set_ylim(0, 110)
    for bar in bars:
        h = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width()/2, h + 2, f"{h:.1f}%", ha="center", fontweight="bold")
    ax2.axhline(90, color="gray", linestyle="--", alpha=0.6, label="90% SLA Target")
    ax2.legend(loc="lower right")
    ax2.tick_params(axis='x', rotation=15)

    # 3. Delay Penalty Incurred Comparison
    ax3 = axes[1, 0]
    bars_pen = ax3.bar(methods, penalties, color=["#10b981", "#ef4444", "#f59e0b", "#6366f1"])
    ax3.set_title("Average Delay Penalties Incurred ($)", fontweight="bold", fontsize=12)
    ax3.set_ylabel("Penalty Cost ($)")
    for bar in bars_pen:
        h = bar.get_height()
        ax3.text(bar.get_x() + bar.get_width()/2, h + 30, f"${h:,.0f}", ha="center", fontweight="bold")
    ax3.tick_params(axis='x', rotation=15)

    # 4. Distribution of Realized Costs Across 30 Shipments (Box/Scatter or P95 transit time)
    ax4 = axes[1, 1]
    p95_times = summary_df["Avg P95 Transit Time (days)"].tolist()
    bars_time = ax4.bar(methods, p95_times, color=["#059669", "#dc2626", "#2563eb", "#7c3aed"])
    ax4.set_title("Worst-Case (P95) Transit Time (days)", fontweight="bold", fontsize=12)
    ax4.set_ylabel("Transit Time (Days)")
    for bar in bars_time:
        h = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2, h + 0.5, f"{h:.1f}d", ha="center", fontweight="bold")
    ax4.tick_params(axis='x', rotation=15)

    plt.tight_layout()
    plt.savefig("evaluation_results.png", dpi=200)
    plt.close()
    print("Saved high-resolution chart to evaluation_results.png.")


if __name__ == "__main__":
    run_offline_evaluation(num_shipments=30)
