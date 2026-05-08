from fastapi import APIRouter, UploadFile
from pydantic import BaseModel
from services.qa import build_retriever, ask_pdf
from database import save_chat
from jose import jwt
from typing import Optional

router = APIRouter()

SECRET = "mysecret123"

retriever_store = {}

class PDFQuery(BaseModel):
    message: str
    session_id: str

def get_user(token: str):
    if not token:
        return "guest"
    try:
        return jwt.decode(token, SECRET)["sub"]
    except:
        return "guest"

# ---------------- UPLOAD ----------------
@router.post("/upload")
async def upload(file: UploadFile, session_id: Optional[str] = None):
    try:
        import os
        import time
        
        upload_dir = "uploads"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
            
        # Create unique, sanitized filename
        import re
        safe_filename = re.sub(r'[^a-zA-Z0-9.-]', '_', file.filename)
        filename = f"{int(time.time())}_{safe_filename}"
        path = os.path.join(upload_dir, filename)

        with open(path, "wb") as f:
            f.write(await file.read())

        # Store using session_id if provided, else default
        key = session_id if session_id else "default"
        retriever_store[key] = build_retriever(path)

        return {"message": "Document uploaded ✅"}

    except Exception as e:
        print("UPLOAD ERROR:", e)
        return {"error": str(e)}


# ---------------- ASK ----------------
@router.post("/ask")
def ask(req: PDFQuery, token: Optional[str] = None):
    try:
        user = get_user(token)
        # Try to get retriever for this session, fallback to default
        retriever = retriever_store.get(req.session_id) or retriever_store.get("default")

        if not retriever:
            return {"answer": "❌ Document index not found. Please re-upload the document for this session."}

        save_chat(user, req.session_id, "user", req.message)

        answer = ask_pdf(retriever, req.message)

        save_chat(user, req.session_id, "assistant", answer)

        return {"answer": answer}

    except Exception as e:
        print("ASK ERROR:", e)
        return {"answer": f"Error: {str(e)}"}