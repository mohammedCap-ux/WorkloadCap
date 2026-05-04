"""
geo_service.py
--------------
Calculs geographiques : distance Haversine + selection des docks les plus proches.
"""

import math


EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Distance en km entre 2 points GPS, via la formule Haversine.
    Marge d'erreur : negligeable a l'echelle d'un trajet logistique (<0.5%).
    """
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)

    a = (math.sin(dlat / 2) ** 2
         + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2)
    c = 2 * math.asin(math.sqrt(a))

    return EARTH_RADIUS_KM * c


def find_closest_docks(
    supplier_lat: float,
    supplier_lng: float,
    candidates: list[dict],
    top_n: int = 5,
) -> list[dict]:
    """
    Calcule la distance entre le fournisseur et chaque dock candidat,
    retourne les top_n les plus proches.

    candidates : list of {"dock_name": str, "lat": float, "lng": float}
    Retourne : list of {"dock_name": str, "lat": float, "lng": float, "distance_km": float}
    triee par distance croissante.
    """
    if not candidates:
        return []

    enriched = []
    for c in candidates:
        try:
            dist = haversine_km(supplier_lat, supplier_lng, c["lat"], c["lng"])
        except (KeyError, TypeError, ValueError):
            continue
        enriched.append({
            "dock_name": c.get("dock_name", "?"),
            "lat": c["lat"],
            "lng": c["lng"],
            "distance_km": round(dist, 2),
        })

    enriched.sort(key=lambda x: x["distance_km"])
    return enriched[:top_n]