from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite = un simple fichier sur disque. Pas de serveur à lancer.
SQLALCHEMY_DATABASE_URL = "sqlite:///./workload.db"

# check_same_thread=False : requis par SQLite quand FastAPI tape dedans
# depuis plusieurs threads (cas d'Uvicorn).
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base dont héritent tous nos modèles SQLAlchemy.
Base = declarative_base()


def get_db():
    """
    Dependency FastAPI : ouvre une session DB pour une requête HTTP,
    la ferme automatiquement à la fin.
    Usage dans les routes : def ma_route(db: Session = Depends(get_db))
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()