from typing import Optional
from sqlalchemy.orm import Session
from models import GeoSupplier, GeoDock, GeoAvailability, GeoStock


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

# ============================================================
#   STOCK FUNCTIONS - Phase 8.6
# ============================================================

def save_stock_batch(db: Session, entries: list[dict]) -> int:
    """
    Vide la table geo_stock puis inserte les nouvelles entrees.
    
    entries: list of {dock_name, packaging_code, qty_available, cu}
    Retourne le nombre d'entrees inserees.
    """
    # Reset complet (re-runnable chaque semaine)
    db.query(GeoStock).delete()
    db.commit()

    # Insert en batch
    objs = [
        GeoStock(
            dock_name=e["dock_name"],
            packaging_code=e["packaging_code"],
            qty_available=e["qty_available"],
            cu=e.get("cu"),
        )
        for e in entries
    ]
    db.bulk_save_objects(objs)
    db.commit()
    return len(objs)


def get_stock_for_packaging(db: Session, packaging_code: str) -> list[dict]:
    """
    Retourne tous les docks ayant ce packaging avec leur qty disponible.
    Tri par qty descendant (les + remplis en 1er).
    """
    rows = (
        db.query(GeoStock)
        .filter(GeoStock.packaging_code == packaging_code)
        .order_by(GeoStock.qty_available.desc())
        .all()
    )
    return [
        {
            "dock_name": r.dock_name,
            "packaging_code": r.packaging_code,
            "qty_available": r.qty_available,
            "cu": r.cu,
        }
        for r in rows
    ]


def get_stock_summary(db: Session) -> dict:
    """Retourne un resume pour debug : nombre d'entrees, derniere upload, etc."""
    total = db.query(GeoStock).count()
    if total == 0:
        return {"total": 0, "uploaded_at": None}
    last = db.query(GeoStock).order_by(GeoStock.uploaded_at.desc()).first()
    return {
        "total": total,
        "uploaded_at": last.uploaded_at.isoformat() if last and last.uploaded_at else None,
    }
