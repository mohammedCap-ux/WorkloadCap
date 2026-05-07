"""
models/geo_stock.py
-------------------
Stock disponible pour chaque (dock, packaging).
Mis a jour chaque semaine via upload xlsx (route /api/geo/upload-stock).
"""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base


class GeoStock(Base):
    __tablename__ = "geo_stock"

    id = Column(Integer, primary_key=True, index=True)
    dock_name = Column(String, nullable=False, index=True)
    packaging_code = Column(String, nullable=False, index=True)
    qty_available = Column(Float, nullable=False, default=0.0)
    cu = Column(String, nullable=True)  # CC ou EN (info, pas filtrant)
    uploaded_at = Column(DateTime, server_default=func.now())