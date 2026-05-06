from sqlalchemy import Column, Integer, String, Float, JSON
from database import Base


class GeoSupplier(Base):
    __tablename__ = "geo_suppliers"

    id = Column(Integer, primary_key=True, index=True)
    xf_code = Column(String, nullable=True, index=True)
    seller_cofor = Column(String, nullable=True, index=True)
    shipper_cofor = Column(String, nullable=True, index=True)
    empty_return_cofor = Column(String, nullable=True, index=True)
    supplier_name = Column(String, nullable=True, index=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)


class GeoDock(Base):
    __tablename__ = "geo_docks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)


class GeoAvailability(Base):
    __tablename__ = "geo_availability"

    id = Column(Integer, primary_key=True, index=True)
    mastercode = Column(String, nullable=True, index=True)
    supplier_name = Column(String, nullable=True, index=True)
    seller_cofor = Column(String, nullable=True, index=True)
    shipper_cofor = Column(String, nullable=True, index=True)
    empty_return_cofor = Column(String, nullable=True, index=True)
    packaging_id = Column(String, nullable=True, index=True)
    pooling_dock = Column(String, nullable=True)         # colonne 'CSC' du xlsx
    alternates = Column(JSON, nullable=False, default=list)  # ["Rennes", "WHSM", ...]