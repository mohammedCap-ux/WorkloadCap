from typing import Optional
from sqlalchemy.orm import Session
from models import GeoSupplier, GeoDock, GeoAvailability


def get_all_data(db: Session) -> dict:
    """Retourne toutes les donnees geo : suppliers + docks + availability."""
    suppliers = db.query(GeoSupplier).all()
    docks = db.query(GeoDock).all()
    availability = db.query(GeoAvailability).all()

    return {
        "suppliers": [_supplier_to_dict(s) for s in suppliers],
        "docks": [_dock_to_dict(d) for d in docks],
        "availability": [_availability_to_dict(a) for a in availability],
    }


def find_supplier(
    db: Session,
    seller_cofor: Optional[str] = None,
    empty_return_cofor: Optional[str] = None,
    shipper_cofor: Optional[str] = None,
) -> Optional[GeoSupplier]:
    """Cherche un fournisseur par cofor (au moins un critere fourni)."""
    query = db.query(GeoSupplier)
    if seller_cofor:
        query = query.filter(GeoSupplier.seller_cofor == seller_cofor)
    if empty_return_cofor:
        query = query.filter(GeoSupplier.empty_return_cofor == empty_return_cofor)
    if shipper_cofor:
        query = query.filter(GeoSupplier.shipper_cofor == shipper_cofor)
    return query.first()


def get_availability_for_supplier(
    db: Session,
    seller_cofor: Optional[str] = None,
    empty_return_cofor: Optional[str] = None,
) -> list[GeoAvailability]:
    """Retourne toutes les lignes availability matchant ces cofors."""
    query = db.query(GeoAvailability)
    if seller_cofor:
        query = query.filter(GeoAvailability.seller_cofor == seller_cofor)
    if empty_return_cofor:
        query = query.filter(GeoAvailability.empty_return_cofor == empty_return_cofor)
    return query.all()


def get_dock_by_name(db: Session, name: str) -> Optional[GeoDock]:
    """Match exact (case sensitive) sur le nom du dock."""
    return db.query(GeoDock).filter(GeoDock.name == name).first()


def count_all(db: Session) -> dict:
    """Pour debug / health check."""
    return {
        "suppliers": db.query(GeoSupplier).count(),
        "docks": db.query(GeoDock).count(),
        "availability": db.query(GeoAvailability).count(),
    }


# ==================== Helpers internes ====================

def _supplier_to_dict(s: GeoSupplier) -> dict:
    return {
        "id": s.id,
        "xf_code": s.xf_code,
        "seller_cofor": s.seller_cofor,
        "shipper_cofor": s.shipper_cofor,
        "empty_return_cofor": s.empty_return_cofor,
        "supplier_name": s.supplier_name,
        "address": s.address,
        "city": s.city,
        "country": s.country,
        "lat": s.lat,
        "lng": s.lng,
    }


def _dock_to_dict(d: GeoDock) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "city": d.city,
        "country": d.country,
        "lat": d.lat,
        "lng": d.lng,
    }


def _availability_to_dict(a: GeoAvailability) -> dict:
    return {
        "id": a.id,
        "mastercode": a.mastercode,
        "supplier_name": a.supplier_name,
        "seller_cofor": a.seller_cofor,
        "shipper_cofor": a.shipper_cofor,
        "empty_return_cofor": a.empty_return_cofor,
        "packaging_id": a.packaging_id,
        "pooling_dock": a.pooling_dock,
        "alternates": a.alternates or [],
    }