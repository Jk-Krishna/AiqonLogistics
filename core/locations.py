import math
from typing import List, Dict, Optional, Tuple

# Comprehensive catalog of major global trade hubs: seaports, international airports, and inland logistics centers
GLOBAL_LOCATIONS: List[Dict[str, any]] = [
    # India
    {"name": "Mumbai, India", "city": "Mumbai", "country": "India", "code": "BOM/JNPT", "type": "seaport", "lat": 18.9499, "lon": 72.9512, "is_seaport": True, "is_airport": True},
    {"name": "Hyderabad, India", "city": "Hyderabad", "country": "India", "code": "HYD", "type": "inland", "lat": 17.3850, "lon": 78.4867, "is_seaport": False, "is_airport": True},
    {"name": "Chennai, India", "city": "Chennai", "country": "India", "code": "MAA", "type": "seaport", "lat": 13.0827, "lon": 80.2707, "is_seaport": True, "is_airport": True},
    {"name": "Delhi, India", "city": "Delhi", "country": "India", "code": "DEL", "type": "inland", "lat": 28.6139, "lon": 77.2090, "is_seaport": False, "is_airport": True},
    {"name": "Kolkata, India", "city": "Kolkata", "country": "India", "code": "CCU", "type": "seaport", "lat": 22.5726, "lon": 88.3639, "is_seaport": True, "is_airport": True},
    {"name": "Bangalore, India", "city": "Bangalore", "country": "India", "code": "BLR", "type": "inland", "lat": 12.9716, "lon": 77.5946, "is_seaport": False, "is_airport": True},
    {"name": "Mundra, India", "city": "Mundra", "country": "India", "code": "MUN", "type": "seaport", "lat": 22.8427, "lon": 69.7042, "is_seaport": True, "is_airport": False},

    # Southeast Asia & East Asia
    {"name": "Singapore", "city": "Singapore", "country": "Singapore", "code": "SIN", "type": "seaport", "lat": 1.3521, "lon": 103.8198, "is_seaport": True, "is_airport": True},
    {"name": "Shanghai, China", "city": "Shanghai", "country": "China", "code": "PVG/SHA", "type": "seaport", "lat": 31.2304, "lon": 121.4737, "is_seaport": True, "is_airport": True},
    {"name": "Shenzhen, China", "city": "Shenzhen", "country": "China", "code": "SZX", "type": "seaport", "lat": 22.5431, "lon": 114.0579, "is_seaport": True, "is_airport": True},
    {"name": "Hong Kong", "city": "Hong Kong", "country": "China", "code": "HKG", "type": "seaport", "lat": 22.3193, "lon": 114.1694, "is_seaport": True, "is_airport": True},
    {"name": "Ningbo, China", "city": "Ningbo", "country": "China", "code": "NGB", "type": "seaport", "lat": 29.8683, "lon": 121.5440, "is_seaport": True, "is_airport": True},
    {"name": "Tokyo, Japan", "city": "Tokyo", "country": "Japan", "code": "NRT/TYO", "type": "seaport", "lat": 35.6762, "lon": 139.6503, "is_seaport": True, "is_airport": True},
    {"name": "Yokohama, Japan", "city": "Yokohama", "country": "Japan", "code": "YOK", "type": "seaport", "lat": 35.4437, "lon": 139.6380, "is_seaport": True, "is_airport": False},
    {"name": "Busan, South Korea", "city": "Busan", "country": "South Korea", "code": "PUS", "type": "seaport", "lat": 35.1796, "lon": 129.0756, "is_seaport": True, "is_airport": True},
    {"name": "Seoul, South Korea", "city": "Seoul", "country": "South Korea", "code": "ICN", "type": "inland", "lat": 37.5665, "lon": 126.9780, "is_seaport": False, "is_airport": True},
    {"name": "Kaohsiung, Taiwan", "city": "Kaohsiung", "country": "Taiwan", "code": "KHH", "type": "seaport", "lat": 22.6273, "lon": 120.3014, "is_seaport": True, "is_airport": True},
    {"name": "Port Klang, Malaysia", "city": "Kuala Lumpur", "country": "Malaysia", "code": "PKG", "type": "seaport", "lat": 2.9999, "lon": 101.3928, "is_seaport": True, "is_airport": True},
    {"name": "Bangkok, Thailand", "city": "Bangkok", "country": "Thailand", "code": "BKK", "type": "seaport", "lat": 13.7563, "lon": 100.5018, "is_seaport": True, "is_airport": True},
    {"name": "Ho Chi Minh City, Vietnam", "city": "Ho Chi Minh City", "country": "Vietnam", "code": "SGN", "type": "seaport", "lat": 10.8231, "lon": 106.6297, "is_seaport": True, "is_airport": True},

    # Middle East
    {"name": "Dubai, UAE", "city": "Dubai", "country": "UAE", "code": "DXB/JEA", "type": "seaport", "lat": 25.2048, "lon": 55.2708, "is_seaport": True, "is_airport": True},
    {"name": "Abu Dhabi, UAE", "city": "Abu Dhabi", "country": "UAE", "code": "AUH", "type": "seaport", "lat": 24.4539, "lon": 54.3773, "is_seaport": True, "is_airport": True},
    {"name": "Doha, Qatar", "city": "Doha", "country": "Qatar", "code": "DOH", "type": "seaport", "lat": 25.2854, "lon": 51.5310, "is_seaport": True, "is_airport": True},
    {"name": "Salalah, Oman", "city": "Salalah", "country": "Oman", "code": "SLL", "type": "seaport", "lat": 17.0151, "lon": 54.0924, "is_seaport": True, "is_airport": True},
    {"name": "Jeddah, Saudi Arabia", "city": "Jeddah", "country": "Saudi Arabia", "code": "JED", "type": "seaport", "lat": 21.4858, "lon": 39.1925, "is_seaport": True, "is_airport": True},
    {"name": "Colombo, Sri Lanka", "city": "Colombo", "country": "Sri Lanka", "code": "CMB", "type": "seaport", "lat": 6.9271, "lon": 79.8612, "is_seaport": True, "is_airport": True},

    # Europe
    {"name": "Rotterdam, Netherlands", "city": "Rotterdam", "country": "Netherlands", "code": "RTM", "type": "seaport", "lat": 51.9244, "lon": 4.4777, "is_seaport": True, "is_airport": True},
    {"name": "Antwerp, Belgium", "city": "Antwerp", "country": "Belgium", "code": "ANR", "type": "seaport", "lat": 51.2194, "lon": 4.4025, "is_seaport": True, "is_airport": True},
    {"name": "Hamburg, Germany", "city": "Hamburg", "country": "Germany", "code": "HAM", "type": "seaport", "lat": 53.5511, "lon": 9.9937, "is_seaport": True, "is_airport": True},
    {"name": "Frankfurt, Germany", "city": "Frankfurt", "country": "Germany", "code": "FRA", "type": "inland", "lat": 50.1109, "lon": 8.6821, "is_seaport": False, "is_airport": True},
    {"name": "London, UK", "city": "London", "country": "United Kingdom", "code": "LHR/FXT", "type": "seaport", "lat": 51.5074, "lon": -0.1278, "is_seaport": True, "is_airport": True},
    {"name": "Felixstowe, UK", "city": "Felixstowe", "country": "United Kingdom", "code": "FXT", "type": "seaport", "lat": 51.9638, "lon": 1.3511, "is_seaport": True, "is_airport": False},
    {"name": "Le Havre, France", "city": "Le Havre", "country": "France", "code": "LEH", "type": "seaport", "lat": 49.4944, "lon": 0.1079, "is_seaport": True, "is_airport": False},
    {"name": "Paris, France", "city": "Paris", "country": "France", "code": "CDG", "type": "inland", "lat": 48.8566, "lon": 2.3522, "is_seaport": False, "is_airport": True},
    {"name": "Genoa, Italy", "city": "Genoa", "country": "Italy", "code": "GOA", "type": "seaport", "lat": 44.4056, "lon": 8.9463, "is_seaport": True, "is_airport": True},
    {"name": "Valencia, Spain", "city": "Valencia", "country": "Spain", "code": "VLC", "type": "seaport", "lat": 39.4699, "lon": -0.3763, "is_seaport": True, "is_airport": True},
    {"name": "Barcelona, Spain", "city": "Barcelona", "country": "Spain", "code": "BCN", "type": "seaport", "lat": 41.3879, "lon": 2.1699, "is_seaport": True, "is_airport": True},

    # North America
    {"name": "Los Angeles, USA", "city": "Los Angeles", "country": "USA", "code": "LAX/LGB", "type": "seaport", "lat": 33.7432, "lon": -118.2673, "is_seaport": True, "is_airport": True},
    {"name": "Long Beach, USA", "city": "Long Beach", "country": "USA", "code": "LGB", "type": "seaport", "lat": 33.7701, "lon": -118.1937, "is_seaport": True, "is_airport": True},
    {"name": "New York, USA", "city": "New York", "country": "USA", "code": "JFK/EWR", "type": "seaport", "lat": 40.7128, "lon": -74.0060, "is_seaport": True, "is_airport": True},
    {"name": "Seattle, USA", "city": "Seattle", "country": "USA", "code": "SEA", "type": "seaport", "lat": 47.6062, "lon": -122.3321, "is_seaport": True, "is_airport": True},
    {"name": "Chicago, USA", "city": "Chicago", "country": "USA", "code": "ORD", "type": "inland", "lat": 41.8781, "lon": -87.6298, "is_seaport": False, "is_airport": True},
    {"name": "Houston, USA", "city": "Houston", "country": "USA", "code": "HOU", "type": "seaport", "lat": 29.7604, "lon": -95.3698, "is_seaport": True, "is_airport": True},
    {"name": "Vancouver, Canada", "city": "Vancouver", "country": "Canada", "code": "YVR", "type": "seaport", "lat": 49.2827, "lon": -123.1207, "is_seaport": True, "is_airport": True},

    # South America
    {"name": "Santos, Brazil", "city": "Santos", "country": "Brazil", "code": "SSZ", "type": "seaport", "lat": -23.9618, "lon": -46.3322, "is_seaport": True, "is_airport": False},
    {"name": "Sao Paulo, Brazil", "city": "Sao Paulo", "country": "Brazil", "code": "GRU", "type": "inland", "lat": -23.5505, "lon": -46.6333, "is_seaport": False, "is_airport": True},
    {"name": "Buenos Aires, Argentina", "city": "Buenos Aires", "country": "Argentina", "code": "BUE", "type": "seaport", "lat": -34.6037, "lon": -58.3816, "is_seaport": True, "is_airport": True},
    {"name": "Valparaiso, Chile", "city": "Valparaiso", "country": "Chile", "code": "VAP", "type": "seaport", "lat": -33.0472, "lon": -71.6127, "is_seaport": True, "is_airport": False},

    # Africa & Oceania
    {"name": "Durban, South Africa", "city": "Durban", "country": "South Africa", "code": "DUR", "type": "seaport", "lat": -29.8587, "lon": 31.0218, "is_seaport": True, "is_airport": True},
    {"name": "Cape Town, South Africa", "city": "Cape Town", "country": "South Africa", "code": "CPT", "type": "seaport", "lat": -33.9249, "lon": 18.4241, "is_seaport": True, "is_airport": True},
    {"name": "Alexandria, Egypt", "city": "Alexandria", "country": "Egypt", "code": "ALY", "type": "seaport", "lat": 31.2001, "lon": 29.9187, "is_seaport": True, "is_airport": True},
    {"name": "Sydney, Australia", "city": "Sydney", "country": "Australia", "code": "SYD", "type": "seaport", "lat": -33.8688, "lon": 151.2093, "is_seaport": True, "is_airport": True},
    {"name": "Melbourne, Australia", "city": "Melbourne", "country": "Australia", "code": "MEL", "type": "seaport", "lat": -37.8136, "lon": 144.9631, "is_seaport": True, "is_airport": True},
]


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on Earth in kilometers."""
    r = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 1)


def find_location(query: str) -> Optional[Dict[str, any]]:
    """Match a location string against the catalog by city, name, or code."""
    q = query.lower().strip()
    if not q:
        return None
    # Exact match first
    for loc in GLOBAL_LOCATIONS:
        if q == loc["name"].lower() or q == loc["city"].lower() or q == loc["code"].lower():
            return loc
    # Substring match
    for loc in GLOBAL_LOCATIONS:
        if q in loc["name"].lower() or q in loc["city"].lower() or loc["city"].lower() in q:
            return loc
    return None


def search_locations(keyword: str, limit: int = 10) -> List[Dict[str, any]]:
    """Returns autocomplete suggestions matching a search term."""
    k = keyword.lower().strip()
    if not k:
        return GLOBAL_LOCATIONS[:limit]
    matches = []
    for loc in GLOBAL_LOCATIONS:
        if (k in loc["name"].lower() or
            k in loc["city"].lower() or
            k in loc["country"].lower() or
            k in loc["code"].lower()):
            matches.append(loc)
        if len(matches) >= limit:
            break
    return matches
