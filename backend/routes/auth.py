from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.auth import LoginRequest, TokenResponse, UserPublic
from services.auth_service import (
    verify_password,
    create_access_token,
    JWT_EXPIRATION_MINUTES,
)
from services.deps import get_current_user


router = APIRouter(prefix="/api/auth", tags=["auth"])


def _authenticate(db: Session, email: str, password: str) -> User:
    """Logique d'auth partagée entre les deux routes de login."""
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé",
        )
    return user


@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login JSON — utilisé par le front React."""
    user = _authenticate(db, credentials.email, credentials.password)
    token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        expires_in=JWT_EXPIRATION_MINUTES * 60,
    )


@router.post("/token", response_model=TokenResponse, include_in_schema=False)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login form-data — utilisé par le bouton Authorize de Swagger."""
    # OAuth2PasswordRequestForm appelle le champ "username" → ici c'est l'email
    user = _authenticate(db, form.username, form.password)
    token = create_access_token(user.id, user.email, user.role)
    return TokenResponse(
        access_token=token,
        expires_in=JWT_EXPIRATION_MINUTES * 60,
    )
    
    
@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    """Retourne les infos de l'utilisateur connecté."""
    return current_user