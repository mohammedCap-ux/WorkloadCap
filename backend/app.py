from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session
import os

load_dotenv()  # doit être AVANT les imports qui lisent l'env

from database import engine, Base, get_db
import models
from routes import auth as auth_routes
from routes import users as users_routes
from routes import teams as teams_routes
from routes import consultants as consultants_routes
from routes import suppliers as suppliers_routes
from routes import assignments as assignments_routes
from routes import categories as categories_routes
from routes import declarations as declarations_routes


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Workload Management API",
    description="Backend pour l'application de gestion de charge + agent IA d'affectation",
    version="0.1.0"
)

# CORS : autoriser ton front React (localhost:3000 par défaut) à appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_routes.router)
app.include_router(users_routes.router)
app.include_router(teams_routes.router)
app.include_router(consultants_routes.router)
app.include_router(suppliers_routes.router)
app.include_router(assignments_routes.router)
app.include_router(categories_routes.router)
app.include_router(declarations_routes.router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Backend is running",
        "gemini_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "jwt_configured": bool(os.getenv("JWT_SECRET_KEY")),
    }


@app.get("/db-stats")
def db_stats(db: Session = Depends(get_db)):
    return {
        "users": db.query(models.User).count(),
        "teams": db.query(models.Team).count(),
        "people_managers": db.query(models.PeopleManager).count(),
        "consultants": db.query(models.Consultant).count(),
        "suppliers": db.query(models.Supplier).count(),
        "assignments": db.query(models.Assignment).count(),
        "categories": db.query(models.Category).count(),
        "tasks": db.query(models.Task).count(),
    }