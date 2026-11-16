import random
from typing import List, Dict, Optional, Tuple
from core.models import Leg, Route, Shipment
from core.locations import find_location, haversine_distance_km, GLOBAL_LOCATIONS


def get_canonical_mumbai_rotterdam_shipment() -> Shipment:
    """
    Canonical benchmark shipment from problem statement:
    Mumbai -> Rotterdam, Urgent, 14-day deadline.
    - Load: 4 routes found (A, B, C, D)
    - Constraints: Route C eliminated (P90 time = 18.8 days > 14 days)
    - Pareto: Route D eliminated (A is cheaper, faster, and safer)
    - Scoring: Route B scores best (urgent weights favor time and delay risk)
    - Uncertainty: B: 100% on-time, stability 100%
    - Output: "Route B recommended. It costs 6% more than A but cuts delay probability from 34% to 11%..."
    """
    # Route A: Ocean route via Suez Canal (Cheaper but moderate risk & congestion)
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

    # Route B: Air-Sea Express via Dubai (Recommended: 6.3% higher cost, cuts delay prob to 11%)
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

    # Route C: Cape of Good Hope Extended Ocean Route (Eliminated: P90 time = 18.8 days > 14-day deadline)
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
    """Generates benchmark suite of 30 global multimodal shipments."""
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

        num_routes = random.choice([3, 4, 4, 5])
        routes: List[Route] = []

        route_types = [
            ("Express Premium", 0.65 * deadline, budget * 0.88, 0.08, 0.12),
            ("Balanced Standard", 0.82 * deadline, budget * 0.68, 0.18, 0.22),
            ("Economy Direct", 0.95 * deadline, budget * 0.50, 0.32, 0.35),
            ("High-Risk Shortcut", 0.70 * deadline, budget * 0.58, 0.44, 0.55),
            ("Extended Contingency", 1.15 * deadline, budget * 0.45, 0.38, 0.40),
        ]

        selected_types = random.sample(route_types, min(num_routes, len(route_types)))
        has_dominated = (random.random() < 0.4) and len(selected_types) >= 4

        for r_idx, (r_name_suffix, t_target, c_target, p_target, risk_target) in enumerate(selected_types):
            r_id = f"Route {chr(65 + r_idx)}"
            carrier = random.choice(carriers)

            leg1_share = random.uniform(0.4, 0.6)
            leg2_share = 1.0 - leg1_share
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


def _get_intermediate_hubs_for_corridor(orig_loc: Optional[Dict], dest_loc: Optional[Dict]) -> Tuple[str, str, str]:
    """Identify sensible intermediate transfer hubs based on geographic corridor."""
    orig_city = orig_loc["city"] if orig_loc else "Origin Hub"
    dest_city = dest_loc["city"] if dest_loc else "Destination Hub"

    # Default hubs
    sea_hub = "Jebel Ali Port (Dubai)"
    air_hub = "Dubai International SkyHub"
    rail_hub = "Central Eurasia Overland Hub"

    if orig_loc and dest_loc:
        o_lon, d_lon = orig_loc["lon"], dest_loc["lon"]
        o_lat, d_lat = orig_loc["lat"], dest_loc["lat"]

        # Trans-Pacific (Asia to Americas)
        if (o_lon > 60 and d_lon < -40) or (o_lon < -40 and d_lon > 60):
            sea_hub = "Tokyo Bay Transshipment Terminal"
            air_hub = "Anchorage Cargo Gateway"
            rail_hub = "Pacific Gateway Inland Railhead"
        # Asia to Europe
        elif (o_lon > 60 and -20 < d_lon < 40):
            sea_hub = "Port Said / Suez Canal Terminal"
            air_hub = "Dubai World Central (DWC)"
            rail_hub = "Baku-Tbilisi Logistics Corridor"
        # Trans-Atlantic (Europe to Americas)
        elif (-15 < o_lon < 40 and d_lon < -40) or (-15 < d_lon < 40 and o_lon < -40):
            sea_hub = "Rotterdam Gateway Terminal"
            air_hub = "Frankfurt CargoCity"
            rail_hub = "Montreal Intermodal Terminal"
        # Intra-Asia
        elif (o_lon > 60 and d_lon > 60):
            sea_hub = "Singapore Jurong Hub"
            air_hub = "Singapore Changi Air Terminal"
            rail_hub = "Kunming South Gateway"

    return sea_hub, air_hub, rail_hub


def generate_routes_for_user_input(
    origin: str,
    destination: str,
    cargo_type: str = "standard",
    deadline_days: float = 14.0,
    max_budget: float = 6000.0,
    requires_reefer: bool = False,
    hazardous: bool = False,
    allowed_modes: Optional[List[str]] = None,
    weight_kg: float = 1000.0
) -> List[Route]:
    """
    Intelligently generates 3-5 realistic candidate routes between ANY origin and destination.
    Respects allowed transportation modes, geography, cargo requirements, and budget bounds.
    """
    orig_loc = find_location(origin)
    dest_loc = find_location(destination)

    # Compute realistic distance
    if orig_loc and dest_loc:
        dist_km = haversine_distance_km(orig_loc["lat"], orig_loc["lon"], dest_loc["lat"], dest_loc["lon"])
    else:
        dist_km = 6800.0  # reasonable intercontinental default

    dist_km = max(450.0, dist_km)

    # Allowed modes normalization (default to all)
    if not allowed_modes:
        modes_permitted = {"ocean", "air", "rail", "road"}
        allow_multimodal = True
    else:
        modes_permitted = {m.lower() for m in allowed_modes if m.lower() in {"ocean", "air", "rail", "road"}}
        allow_multimodal = "multimodal" in [m.lower() for m in allowed_modes] or len(modes_permitted) > 1

    # Check if hazardous restricts air
    if hazardous:
        modes_permitted.discard("air")

    # If no mode is permitted or requested combination is empty, default safely
    if not modes_permitted:
        modes_permitted = {"ocean", "road"}

    sea_hub, air_hub, rail_hub = _get_intermediate_hubs_for_corridor(orig_loc, dest_loc)
    orig_name = orig_loc["name"] if orig_loc else origin
    dest_name = dest_loc["name"] if dest_loc else destination

    orig_is_inland = orig_loc["type"] == "inland" if orig_loc else False
    dest_is_inland = dest_loc["type"] == "inland" if dest_loc else False

    routes: List[Route] = []

    # -------------------------------------------------------------
    # Candidate Route 1: Express Premium (Fast, Low Risk, Higher Cost)
    # Uses Air if permitted, else fast express rail/intermodal
    # -------------------------------------------------------------
    if "air" in modes_permitted and not hazardous:
        # Air Express route
        transit_time = round(max(2.0, min(deadline_days * 0.45, dist_km / 1200.0 + 1.5)), 1)
        cost = round(min(max_budget * 0.88, max(1800.0, (dist_km * 0.45) + (weight_kg * 1.2))), 1)
        leg1_cost = round(cost * 0.4, 1)
        leg2_cost = round(cost - leg1_cost, 1)
        leg1_time = round(transit_time * 0.45, 1)
        leg2_time = round(transit_time - leg1_time - 0.4, 1)

        r1 = Route(
            route_id="Route A",
            route_name=f"{orig_name.split(',')[0]} to {dest_name.split(',')[0]} Priority Air Express",
            carrier="Emirates SkyCargo / DHL Aviation",
            description=f"Direct expedited air freight with priority handling via {air_hub}.",
            legs=[
                Leg(
                    leg_id="LEG-A1",
                    origin=f"{orig_name} Cargo Terminal",
                    destination=air_hub,
                    mode="air",
                    distance_km=round(dist_km * 0.4),
                    base_transit_days=leg1_time,
                    base_cost=leg1_cost,
                    delay_probability=0.06,
                    delay_mean_days=0.8,
                    delay_std_days=0.3,
                    risk_score=0.10,
                    hub_dwell_days=0.4,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.65, 1)
                ),
                Leg(
                    leg_id="LEG-A2",
                    origin=air_hub,
                    destination=f"{dest_name} Distribution Center",
                    mode="air",
                    distance_km=round(dist_km * 0.6),
                    base_transit_days=max(0.8, leg2_time),
                    base_cost=leg2_cost,
                    delay_probability=0.05,
                    delay_mean_days=0.7,
                    delay_std_days=0.3,
                    risk_score=0.08,
                    hub_dwell_days=0.0,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.85, 1)
                )
            ]
        )
        routes.append(r1)
    elif "rail" in modes_permitted:
        # Express Rail option
        transit_time = round(max(3.5, min(deadline_days * 0.60, dist_km / 800.0 + 2.0)), 1)
        cost = round(min(max_budget * 0.75, max(1400.0, (dist_km * 0.32) + (weight_kg * 0.8))), 1)
        leg1_cost = round(cost * 0.5, 1)
        leg2_cost = round(cost - leg1_cost, 1)
        leg1_time = round(transit_time * 0.5, 1)
        leg2_time = round(transit_time - leg1_time - 0.5, 1)

        r1 = Route(
            route_id="Route A",
            route_name=f"{orig_name.split(',')[0]} to {dest_name.split(',')[0]} Block Train Express",
            carrier="Trans-Eurasia Rail Logistics",
            description=f"Dedicated container block train via {rail_hub}.",
            legs=[
                Leg(
                    leg_id="LEG-A1",
                    origin=f"{orig_name} Rail Terminal",
                    destination=rail_hub,
                    mode="rail",
                    distance_km=round(dist_km * 0.45),
                    base_transit_days=leg1_time,
                    base_cost=leg1_cost,
                    delay_probability=0.09,
                    delay_mean_days=1.0,
                    delay_std_days=0.4,
                    risk_score=0.14,
                    hub_dwell_days=0.5,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.25, 1)
                ),
                Leg(
                    leg_id="LEG-A2",
                    origin=rail_hub,
                    destination=f"{dest_name} Intermodal Depot",
                    mode="rail",
                    distance_km=round(dist_km * 0.55),
                    base_transit_days=max(1.0, leg2_time),
                    base_cost=leg2_cost,
                    delay_probability=0.08,
                    delay_mean_days=0.9,
                    delay_std_days=0.4,
                    risk_score=0.12,
                    hub_dwell_days=0.0,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.30, 1)
                )
            ]
        )
        routes.append(r1)

    # -------------------------------------------------------------
    # Candidate Route 2: Balanced Standard (Direct Maritime or Multimodal Liner)
    # -------------------------------------------------------------
    if "ocean" in modes_permitted:
        # Standard Maritime Liner
        transit_time = round(max(5.0, min(deadline_days * 0.78, dist_km / 550.0 + 3.0)), 1)
        cost = round(min(max_budget * 0.65, max(1100.0, (dist_km * 0.22) + (weight_kg * 0.45))), 1)

        # If origin is inland and multimodal is allowed, include domestic feeder leg
        if orig_is_inland and allow_multimodal and "road" in modes_permitted:
            feeder_mode = "road"
            feeder_time = 1.0
            feeder_cost = 400.0
            main_time = round(transit_time - 1.8, 1)
            main_cost = round(cost - feeder_cost, 1)
            first_origin = f"{orig_name} Depot"
            first_dest = sea_hub
        else:
            feeder_mode = "ocean"
            feeder_time = round(transit_time * 0.45, 1)
            feeder_cost = round(cost * 0.45, 1)
            main_time = round(transit_time - feeder_time - 0.8, 1)
            main_cost = round(cost - feeder_cost, 1)
            first_origin = f"{orig_name} Seaport"
            first_dest = sea_hub

        r2 = Route(
            route_id="Route B",
            route_name=f"{orig_name.split(',')[0]} to {dest_name.split(',')[0]} Direct Container Liner",
            carrier="Maersk Line / CMA CGM",
            description=f"Reliable regular ocean liner service with intermediate stop at {sea_hub}.",
            legs=[
                Leg(
                    leg_id="LEG-B1",
                    origin=first_origin,
                    destination=first_dest,
                    mode=feeder_mode,
                    distance_km=round(dist_km * 0.4),
                    base_transit_days=feeder_time,
                    base_cost=feeder_cost,
                    delay_probability=0.14,
                    delay_mean_days=1.4,
                    delay_std_days=0.6,
                    risk_score=0.22,
                    hub_dwell_days=0.8,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.18, 1)
                ),
                Leg(
                    leg_id="LEG-B2",
                    origin=first_dest,
                    destination=f"{dest_name} Seaport",
                    mode="ocean",
                    distance_km=round(dist_km * 0.6),
                    base_transit_days=max(2.0, main_time),
                    base_cost=main_cost,
                    delay_probability=0.12,
                    delay_mean_days=1.2,
                    delay_std_days=0.5,
                    risk_score=0.18,
                    hub_dwell_days=0.0,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.22, 1)
                )
            ]
        )
        routes.append(r2)

    # -------------------------------------------------------------
    # Candidate Route 3: Economy Slow-Steaming / Secondary Feeder
    # Lowest base cost, longer transit time, higher delay variance
    # -------------------------------------------------------------
    if "ocean" in modes_permitted or "road" in modes_permitted:
        primary_mode = "ocean" if "ocean" in modes_permitted else "road"
        transit_time = round(max(7.0, min(deadline_days * 1.05, dist_km / 420.0 + 4.5)), 1)
        cost = round(min(max_budget * 0.48, max(850.0, (dist_km * 0.16) + (weight_kg * 0.3))), 1)

        # If perishable requested, this economy route intentionally tests reefer compliance or failure
        reefer_support = True if not requires_reefer else False

        r3 = Route(
            route_id="Route C",
            route_name=f"{orig_name.split(',')[0]} to {dest_name.split(',')[0]} Economy Slow Steaming",
            carrier="Mediterranean Shipping Company (MSC)",
            description="Budget ocean freight service with multiple intermediate feeder calls.",
            legs=[
                Leg(
                    leg_id="LEG-C1",
                    origin=f"{orig_name} Seaport",
                    destination="Regional Coastal Relay Hub",
                    mode=primary_mode,
                    distance_km=round(dist_km * 0.45),
                    base_transit_days=round(transit_time * 0.5, 1),
                    base_cost=round(cost * 0.48, 1),
                    delay_probability=0.32,
                    delay_mean_days=2.4,
                    delay_std_days=1.2,
                    risk_score=0.42,
                    hub_dwell_days=1.5,
                    reefer_supported=reefer_support,
                    co2_kg=round(dist_km * 0.15, 1)
                ),
                Leg(
                    leg_id="LEG-C2",
                    origin="Regional Coastal Relay Hub",
                    destination=f"{dest_name} Seaport",
                    mode=primary_mode,
                    distance_km=round(dist_km * 0.55),
                    base_transit_days=round(transit_time * 0.5 - 0.5, 1),
                    base_cost=round(cost * 0.52, 1),
                    delay_probability=0.28,
                    delay_mean_days=2.0,
                    delay_std_days=1.0,
                    risk_score=0.36,
                    hub_dwell_days=0.0,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.17, 1)
                )
            ]
        )
        routes.append(r3)

    # -------------------------------------------------------------
    # Candidate Route 4: Multimodal Air-Sea / Rail-Road Hybrid
    # -------------------------------------------------------------
    if allow_multimodal and ("air" in modes_permitted or "rail" in modes_permitted) and "ocean" in modes_permitted:
        # Air-Sea Hybrid: fast sea feeder to hub + air to destination
        r4 = Route(
            route_id="Route D",
            route_name=f"{orig_name.split(',')[0]} to {dest_name.split(',')[0]} Sea-Air Multimodal Hybrid",
            carrier="Hapag-Lloyd & Qatar Cargo",
            description=f"Feeder ocean leg to {sea_hub} coupled with expedited onward air express.",
            legs=[
                Leg(
                    leg_id="LEG-D1",
                    origin=f"{orig_name} Port Terminal",
                    destination=sea_hub,
                    mode="ocean",
                    distance_km=round(dist_km * 0.35),
                    base_transit_days=round(deadline_days * 0.35, 1),
                    base_cost=round(max_budget * 0.30, 1),
                    delay_probability=0.10,
                    delay_mean_days=1.2,
                    delay_std_days=0.5,
                    risk_score=0.16,
                    hub_dwell_days=0.8,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.20, 1)
                ),
                Leg(
                    leg_id="LEG-D2",
                    origin=sea_hub,
                    destination=f"{dest_name} Hub",
                    mode="air" if ("air" in modes_permitted and not hazardous) else "rail",
                    distance_km=round(dist_km * 0.65),
                    base_transit_days=round(deadline_days * 0.30, 1),
                    base_cost=round(max_budget * 0.42, 1),
                    delay_probability=0.08,
                    delay_mean_days=1.0,
                    delay_std_days=0.4,
                    risk_score=0.12,
                    hub_dwell_days=0.0,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.50, 1)
                )
            ]
        )
        routes.append(r4)

    # If user selected only a single mode (e.g. only Road), generate single-mode candidates
    if len(routes) < 2:
        primary = list(modes_permitted)[0]
        r_single = Route(
            route_id="Route A",
            route_name=f"{orig_name.split(',')[0]} to {dest_name.split(',')[0]} Dedicated {primary.capitalize()} Freight",
            carrier=f"Global {primary.capitalize()} Lines",
            description=f"Direct transport using strictly {primary.capitalize()}.",
            legs=[
                Leg(
                    leg_id="LEG-S1",
                    origin=f"{orig_name} Facility",
                    destination=f"{dest_name} Facility",
                    mode=primary,
                    distance_km=round(dist_km),
                    base_transit_days=round(deadline_days * 0.65, 1),
                    base_cost=round(max_budget * 0.70, 1),
                    delay_probability=0.15,
                    delay_mean_days=1.5,
                    delay_std_days=0.6,
                    risk_score=0.20,
                    hub_dwell_days=0.0,
                    reefer_supported=True,
                    co2_kg=round(dist_km * 0.35, 1)
                )
            ]
        )
        routes.append(r_single)

    return routes
