import math
import hashlib
from typing import Optional, Tuple

# Major US City Coordinates mapping
US_CITIES_COORDS = {
    "miami": (25.7617, -80.1918),
    "san francisco": (37.7749, -122.4194),
    "new york": (40.7128, -74.0060),
    "boston": (42.3601, -71.0589),
    "los angeles": (34.0522, -118.2437),
    "chicago": (41.8781, -87.6298),
    "houston": (29.7604, -95.3698),
    "seattle": (47.6062, -122.3321),
    "austin": (30.2672, -97.7431),
    "denver": (39.7392, -104.9903),
    "philadelphia": (39.9526, -75.1652),
    "dallas": (32.7767, -96.7970),
    "atlanta": (33.7490, -84.3880)
}

def geocode_address(
    street_address_1: str,
    street_address_2: Optional[str],
    city: str,
    state: str,
    zip_code: str
) -> Tuple[float, float]:
    """Resolves an address into a realistic US latitude/longitude.
    Runs 100% offline using known cities and deterministic hashing fallbacks.
    """
    city_key = city.strip().lower()
    
    if city_key in US_CITIES_COORDS:
        lat, lon = US_CITIES_COORDS[city_key]
        # Add deterministic slight noise based on street address to spread coordinates
        hash_input = f"{street_address_1} {zip_code}".encode('utf-8')
        h = int(hashlib.md5(hash_input).hexdigest(), 16)
        
        # Generate noise between -0.05 and 0.05 degrees (approx 3 miles)
        lat_noise = ((h % 1000) / 1000.0 - 0.5) * 0.1
        lon_noise = (((h // 1000) % 1000) / 1000.0 - 0.5) * 0.1
        
        return round(lat + lat_noise, 6), round(lon + lon_noise, 6)
        
    # Fallback: Hash the entire address details to place it inside the continental US bounding box
    # Latitude: [25.0, 48.0]
    # Longitude: [-120.0, -75.0]
    addr_str = f"{street_address_1} {street_address_2 or ''} {city} {state} {zip_code}"
    h_val = int(hashlib.md5(addr_str.encode('utf-8')).hexdigest(), 16)
    
    lat_range = 48.0 - 25.0
    lon_range = -75.0 - (-120.0)
    
    lat = 25.0 + ((h_val % 100000) / 100000.0) * lat_range
    lon = -120.0 + (((h_val // 100000) % 100000) / 100000.0) * lon_range
    
    return round(lat, 6), round(lon, 6)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two points in miles."""
    # Radius of the Earth in miles
    R = 3958.8
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (
        math.sin(dlat / 2) ** 2 + 
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
        math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 2)
