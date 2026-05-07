from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
from database import add_user, check_user

SECRET = "mysecret123"

router = APIRouter()

class User(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(user: User):
    if add_user(user.email, user.email, user.password):
        return {"msg": "User created"}
    raise HTTPException(400, "User exists")

@router.post("/login")
def login(user: User):
    db_user = check_user(user.email, user.password)

    if not db_user:
        raise HTTPException(401, "Invalid credentials")

    token = jwt.encode(
        {"sub": user.email, "exp": datetime.utcnow() + timedelta(hours=2)},
        SECRET
    )

    return {"token": token}