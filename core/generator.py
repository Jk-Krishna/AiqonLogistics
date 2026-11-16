import random
from typing import List
from core.models import Leg, Route, Shipment


def get_canonical_mumbai_rotterdam_shipment() -> Shipment:
    """
    Exact canonical benchmark shipment from problem statement:
    Mumbai -> Rotterdam, Urgent, 14-day deadline.
    - Load: 4 routes found (A, B, C, D)
    - Constraints: Route C eliminated (P90 time = 16 days)
    - Pareto: Route D eliminated (A is cheaper, faster, and safer)
    - Scoring: Route B scores best (urgent weights favor time and delay risk)
    - Uncertainty: B: 91% on-time, stability 87%
    - Output: "Route B recommended. It costs 6% more than A but cuts delay probability from 34% to 11%..."
    """
    # Route A: Ocean route via Suez Canal (Cheaper but moderate risk & congestion)
    # Total A: Cost = $3,950, Base Time = 10.5d, P(delay) = 34.0%, P90 = 12.8d <= 14d (SURVIVES constraints)
    route_a = Route(
        route_id="Route A",
        route_name="Suez Canal Standard Maritime",
        carrier="Maersk Line",
        description="Direct container liner via Red Sea & Suez Canal with transshipment at Port Said.",
        legs=[
            Leg(
                leg_id="LEG-A1",
                origin="Jawaharlal Nehru Port (Mumbai)",
                destination="Port Said (Egypt)",
                mode="ocean",
                distance_km=4200,
                base_transit_days=5.5,
                base_cost=2100.0,
                delay_probability=0.20,
                delay_mean_days=1.4,
                delay_std_days=0.7,
                risk_score=0.35,
                hub_dwell_days=0.8,
                reefer_supported=True,
                co2_kg=850.0
            ),
            Leg(
                leg_id="LEG-A2",
                origin="Port Said (Egypt)",
                destination="Port of Rotterdam",
                mode="ocean",
                distance_km=3500,
                base_transit_days=4.2,
                base_cost=1850.0,
                delay_probability=0.175,
                delay_mean_days=1.2,
                delay_std_days=0.6,
                risk_score=0.25,
                hub_dwell_days=0.0,
                reefer_supported=True,
                co2_kg=720.0
            ),
        ]
    )

    # Route B: Air-Sea Express via Dubai (Recommended: 6.3% higher cost, cuts delay prob to 11%, 91% on-time)
    # Total B: Cost = $4,200 (6.3% more than A's $3,950), Base Time = 8.4d, P(delay) = 11.2%
    route_b = Route(
        route_id="Route B",
        route_name="Jebel Ali Air-Sea Multimodal Express",
        carrier="Emirates SkyCargo & Hapag-Lloyd",
        description="Short feeder sea leg to Jebel Ali bonded hub, followed by premium priority air express to Schiphol/Rotterdam.",
        legs=[
            Leg(
                leg_id="LEG-B1",
                origin="Jawaharlal Nehru Port (Mumbai)",
                destination="Jebel Ali Hub (Dubai)",
                mode="ocean",
                distance_km=1900,
                base_transit_days=3.0,
                base_cost=1200.0,
                delay_probability=0.06,
                delay_mean_days=1.4,
                delay_std_days=0.6,
                risk_score=0.12,
                hub_dwell_days=0.6,
                reefer_supported=True,
                co2_kg=380.0
            ),
            Leg(
                leg_id="LEG-B2",
                origin="Dubai DWC Airport",
                destination="Rotterdam Distribution Hub",
                mode="air",
                distance_km=5000,
                base_transit_days=4.8,
                base_cost=3000.0,
                delay_probability=0.055,
                delay_mean_days=1.2,
                delay_std_days=0.5,
                risk_score=0.08,
                hub_dwell_days=0.0,
                reefer_supported=True,
                co2_kg=1450.0
            ),
        ]
    )

    # Route C: Cape of Good Hope Extended Ocean Route (Eliminated: P90 time = 16.2 days > 14-day deadline)
    route_c = Route(
        route_id="Route C",
        route_name="Cape of Good Hope Slow Steaming",
        carrier="MSC Mediterranean",
        description="Circumnavigation via South Africa avoiding canal surcharges, high weather risk off Cape.",
        legs=[
            Leg(
                leg_id="LEG-C1",
                origin="Mumbai Port",
                destination="Durban (South Africa)",
                mode="ocean",
                distance_km=7200,
                base_transit_days=7.0,
                base_cost=1500.0,
                delay_probability=0.45,
                delay_mean_days=3.0,
                delay_std_days=1.4,
                risk_score=0.45,
                hub_dwell_days=1.5,
                reefer_supported=True,
                co2_kg=1300.0
            ),
            Leg(
                leg_id="LEG-C2",
                origin="Durban (South Africa)",
                destination="Port of Rotterdam",
                mode="ocean",
                distance_km=8100,
                base_transit_days=5.0,
                base_cost=1600.0,
                delay_probability=0.40,
                delay_mean_days=2.5,
                delay_std_days=1.2,
                risk_score=0.40,
                hub_dwell_days=0.0,
                reefer_supported=True,
                co2_kg=1400.0
            ),
        ]
    )

    # Route D: Sub-optimal Feeder Route (Dominated by Route A: Cost $4,400 > $3,950, Time 12.0d > 10.5d, Risk 42% > 34%)
    # Survives hard constraints (P90 = 13.5d <= 14d) but eliminated by Pareto Filter!
    route_d = Route(
        route_id="Route D",
        route_name="Mundra-Salalah Legacy Feeder",
        carrier="Regional Feeder Lines",
        description="Older container feeder routing with double transshipment and inefficient handling.",
        legs=[
            Leg(
                leg_id="LEG-D1",
                origin="Mumbai Port",
                destination="Salalah Port (Oman)",
                mode="ocean",
                distance_km=1700,
                base_transit_days=4.5,
                base_cost=1900.0,
                delay_probability=0.22,
                delay_mean_days=0.6,
                delay_std_days=0.2,
                risk_score=0.38,
                hub_dwell_days=1.0,
                reefer_supported=True,
                co2_kg=650.0
            ),
            Leg(
                leg_id="LEG-D2",
                origin="Salalah Port (Oman)",
                destination="Port of Rotterdam",
                mode="ocean",
                distance_km=6200,
                base_transit_days=6.5,
                base_cost=2500.0,
                delay_probability=0.26,
                delay_mean_days=0.7,
                delay_std_days=0.3,
                risk_score=0.36,
                hub_dwell_days=0.0,
                reefer_supported=True,
                co2_kg=1200.0
            ),
        ]
    )
    # Total D: Cost = $4,400, Time = 12.2d, P(delay) = 42.3%, P90 = 13.6d <= 14d -> Survives constraints, dropped at Pareto!

    return Shipment(
        shipment_id="SHP-001",
        title="High-Value Precision Electronics (Mumbai -> Rotterdam)",
        origin="Mumbai, India",
        destination="Rotterdam, Netherlands",
        cargo_type="urgent",
        weight_kg=2400.0,
        deadline_days=14.0,
        max_budget=6000.0,
        delay_penalty_cost=2500.0,
        delay_penalty_per_day=600.0,
        requires_reefer=False,
        hazardous=False,
        routes=[route_a, route_b, route_c, route_d]
    )


def generate_synthetic_dataset(num_shipments: int = 30, seed: int = 101) -> List[Shipment]:
    """
    Generates a realistic benchmark suite of 30+ global multi-modal shipments.
    """
    random.seed(seed)
    shipments: List[Shipment] = [get_canonical_mumbai_rotterdam_shipment()]

    corridors = [
        ("Shanghai, China", "Los Angeles, USA", ["urgent", "standard", "economy"]),
        ("Singapore", "Rotterdam, Netherlands", ["standard", "perishable", "urgent"]),
        ("Santos, Brazil", "Antwerp, Belgium", ["perishable", "economy", "standard"]),
        ("Tokyo, Japan", "Hamburg, Germany", ["urgent", "standard"]),
        ("Shenzhen, China", "Frankfurt, Germany", ["urgent", "economy"]),
        ("Busan, South Korea", "Seattle, USA", ["standard", "economy"]),
        ("Dubai, UAE", "London, UK", ["urgent", "standard"]),
        ("Yokohama, Japan", "Long Beach, USA", ["economy", "standard"]),
        ("Mumbai, India", "Singapore", ["standard", "perishable"]),
        ("Kaohsiung, Taiwan", "Rotterdam, Netherlands", ["standard", "urgent"]),
        ("Valparaiso, Chile", "Tokyo, Japan", ["perishable", "economy"]),
        ("Colombo, Sri Lanka", "Genoa, Italy", ["standard", "urgent"]),
        ("Ho Chi Minh City, Vietnam", "Hamburg, Germany", ["economy", "standard"]),
        ("Ningbo, China", "New York, USA", ["urgent", "standard", "economy"]),
        ("Alexandria, Egypt", "Marseille, France", ["perishable", "standard"])
    ]

    carriers = [
        "Maersk Line", "MSC Mediterranean", "CMA CGM", "Hapag-Lloyd", "ONE Ocean Network",
        "Evergreen Marine", "COSCO Shipping", "DHL Global Forwarding", "Kuehne+Nagel"
    ]

    for i in range(2, num_shipments + 1):
        origin, dest, priorities = random.choice(corridors)
        cargo_type = random.choice(priorities)
        is_perishable = (cargo_type == "perishable")
        is_urgent = (cargo_type == "urgent")
        is_economy = (cargo_type == "economy")

        if is_urgent:
            deadline = round(random.uniform(7.0, 15.0), 1)
            budget = round(random.uniform(5500.0, 11000.0), -2)
            penalty_base = round(random.uniform(2000.0, 4500.0), -2)
            penalty_day = round(random.uniform(500.0, 1000.0), -2)
        elif is_perishable:
            deadline = round(random.uniform(10.0, 18.0), 1)
            budget = round(random.uniform(4000.0, 8500.0), -2)
            penalty_base = round(random.uniform(3000.0, 6000.0), -2)
            penalty_day = round(random.uniform(600.0, 1200.0), -2)
        elif is_economy:
            deadline = round(random.uniform(22.0, 40.0), 1)
            budget = round(random.uniform(2200.0, 4800.0), -2)
            penalty_base = round(random.uniform(600.0, 1500.0), -2)
            penalty_day = round(random.uniform(150.0, 350.0), -2)
        else:
            deadline = round(random.uniform(15.0, 26.0), 1)
            budget = round(random.uniform(3200.0, 6800.0), -2)
            penalty_base = round(random.uniform(1200.0, 2500.0), -2)
            penalty_day = round(random.uniform(300.0, 600.0), -2)

        # Generate 3 to 5 route options
        num_routes = random.choice([3, 4, 4, 5])
        routes: List[Route] = []

        route_types = [
            ("Express Premium", 0.65 * deadline, budget * 0.88, 0.08, 0.12),
            ("Balanced Standard", 0.82 * deadline, budget * 0.68, 0.18, 0.22),
            ("Economy Direct", 0.95 * deadline, budget * 0.50, 0.32, 0.35),
            ("High-Risk Shortcut", 0.70 * deadline, budget * 0.58, 0.44, 0.55),
            ("Extended Contingency", 1.15 * deadline, budget * 0.45, 0.38, 0.40),
        ]

        # Shuffle and pick num_routes
        selected_types = random.sample(route_types, min(num_routes, len(route_types)))

        # Also deliberately create a dominated route in ~40% of shipments to test Pareto filter
        has_dominated = (random.random() < 0.4) and len(selected_types) >= 4

        for r_idx, (r_name_suffix, t_target, c_target, p_target, risk_target) in enumerate(selected_types):
            r_id = f"Route {chr(65 + r_idx)}"
            carrier = random.choice(carriers)

            # Leg 1 & Leg 2
            leg1_share = random.uniform(0.4, 0.6)
            leg2_share = 1.0 - leg1_share

            # Ensure reefer support logic
            reefer_supported = True if not is_perishable else (random.random() > 0.15)

            leg1 = Leg(
                leg_id=f"LEG-{r_id}-1",
                origin=origin,
                destination=f"Hub-{random.choice(['East', 'Central', 'Coast', 'Strait'])}",
                mode="ocean" if random.random() > 0.3 else "air",
                distance_km=random.randint(1500, 4500),
                base_transit_days=round(t_target * leg1_share * 0.85, 1),
                base_cost=round(c_target * leg1_share, 1),
                delay_probability=round(min(0.7, p_target * 0.6), 3),
                delay_mean_days=round(random.uniform(0.8, 2.0), 1),
                delay_std_days=round(random.uniform(0.3, 0.9), 1),
                risk_score=round(min(0.9, risk_target * 0.9), 2),
                hub_dwell_days=round(random.uniform(0.5, 1.5), 1),
                reefer_supported=reefer_supported,
                co2_kg=round(c_target * 0.3, 1)
            )

            leg2 = Leg(
                leg_id=f"LEG-{r_id}-2",
                origin=leg1.destination,
                destination=dest,
                mode="ocean" if random.random() > 0.25 else "rail",
                distance_km=random.randint(2000, 5000),
                base_transit_days=round(t_target * leg2_share * 0.85, 1),
                base_cost=round(c_target * leg2_share, 1),
                delay_probability=round(min(0.7, p_target * 0.6), 3),
                delay_mean_days=round(random.uniform(0.8, 2.2), 1),
                delay_std_days=round(random.uniform(0.3, 0.9), 1),
                risk_score=round(min(0.9, risk_target * 1.0), 2),
                hub_dwell_days=0.0,
                reefer_supported=reefer_supported,
                co2_kg=round(c_target * 0.35, 1)
            )

            # If this is the dominated route, inflate both cost, time, and risk above Route A
            if has_dominated and r_idx == len(selected_types) - 1:
                leg1.base_cost *= 1.35
                leg2.base_cost *= 1.35
                leg1.base_transit_days *= 1.25
                leg2.base_transit_days *= 1.25
                leg1.delay_probability = min(0.65, leg1.delay_probability * 1.5)
                leg2.delay_probability = min(0.65, leg2.delay_probability * 1.5)

            route = Route(
                route_id=r_id,
                route_name=f"{origin.split(',')[0]} to {dest.split(',')[0]} {r_name_suffix}",
                carrier=carrier,
                legs=[leg1, leg2],
                description=f"{r_name_suffix} operated by {carrier}."
            )
            routes.append(route)

        shp = Shipment(
            shipment_id=f"SHP-{i:03d}",
            title=f"{cargo_type.capitalize()} Freight ({origin.split(',')[0]} -> {dest.split(',')[0]})",
            origin=origin,
            destination=dest,
            cargo_type=cargo_type,
            weight_kg=random.randint(800, 5000),
            deadline_days=deadline,
            max_budget=budget,
            delay_penalty_cost=penalty_base,
            delay_penalty_per_day=penalty_day,
            requires_reefer=is_perishable,
            hazardous=(random.random() < 0.1),
            routes=routes
        )
        shipments.append(shp)

    return shipments
