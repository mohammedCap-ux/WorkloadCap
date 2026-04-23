from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas.team import TeamDetail, TeamListItem
from services.deps import get_current_user
from repositories import team_repository


router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("", response_model=list[TeamListItem])
def list_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return team_repository.list_teams(db)


@router.get("/{team_id}", response_model=TeamDetail)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    team = team_repository.get_team_detail(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team introuvable")
    return team