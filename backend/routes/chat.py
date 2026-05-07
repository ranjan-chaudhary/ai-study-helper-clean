from fastapi import APIRouter, Depends, UploadFile
from pydantic import BaseModel
from services.llm import ask_llm_stream
from database import save_chat, get_sessions, get_session_history
from jose import jwt
from typing import Optional
from groq import Groq
import os

SECRET = "mysecret123"

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    session_id: str
    persona: Optional[str] = "Supportive Peer"

def get_user(token: str):
    if not token:
        return "guest"
    try:
        return jwt.decode(token, SECRET)["sub"]
    except:
        return "guest"

@router.post("/ask")
async def chat(req: ChatRequest, token: Optional[str] = None):
    user = get_user(token)
    from langchain_core.messages import HumanMessage, AIMessage
    
    # Fetch history for context
    raw_history = get_session_history(user, req.session_id)
    messages = []
    # Limit to last 5 messages for performance
    for h in raw_history[-5:]:
        if h["role"] == "user":
            messages.append(HumanMessage(content=h["content"]))
        else:
            messages.append(AIMessage(content=h["content"]))
            
    messages.append(HumanMessage(content=req.message))

    save_chat(user, req.session_id, "user", req.message)

    # Note: frontend currently expects a non-streaming response for simplicity
    # but the service returns a stream. We'll collect it here.
    stream = ask_llm_stream(messages, persona=req.persona)
    response_content = ""
    for chunk in stream:
        if chunk.content:
            response_content += chunk.content

    save_chat(user, req.session_id, "assistant", response_content)

    return {"answer": response_content}

@router.get("/sessions")
def sessions(token: Optional[str] = None):
    user = get_user(token)
    return {"sessions": get_sessions(user)}

@router.get("/history/{session_id}")
def history(session_id: str, token: Optional[str] = None):
    user = get_user(token)
    return {"history": get_session_history(user, session_id)}

@router.delete("/session/{session_id}")
def delete_chat_session(session_id: str, token: Optional[str] = None):
    user = get_user(token)
    from database import delete_session
    delete_session(user, session_id)
    return {"status": "success"}

@router.delete("/sessions/all")
def delete_all_chat_sessions(token: Optional[str] = None):
    user = get_user(token)
    from database import delete_all_sessions
    delete_all_sessions(user)
    return {"status": "success"}

@router.post("/flashcards")
def generate_flashcards(req: dict, token: Optional[str] = None):
    user = get_user(token)
    from services.llm import get_llm
    from langchain_core.messages import HumanMessage
    
    # Simple logic: Generate flashcards based on the context provided
    context = req.get("context", "")
    if not context:
        return {"flashcards": []}
        
    prompt = f"""
    Generate 5 interactive flashcards from this text. 
    Each flashcard MUST have a 'front' (question/concept) and a 'back' (answer/definition).
    Return ONLY a valid JSON list of objects like this:
    [
      {{"front": "What is...", "back": "It is..."}},
      ...
    ]
    
    Text:
    {context}
    """
    
    llm = get_llm()
    res = llm.invoke([HumanMessage(content=prompt)])
    
    import json
    import re
    
    # Try to extract JSON if LLM adds text
    try:
        match = re.search(r'\[.*\]', res.content, re.DOTALL)
        if match:
            cards = json.loads(match.group())
            return {"flashcards": cards}
    except:
        pass
        
    return {"flashcards": []}

@router.post("/transcribe")
async def transcribe(file: UploadFile):
    try:
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        # Read file
        audio_bytes = await file.read()
        
        # Whisper requires a filename with a supported extension. 
        # The frontend might just send a "blob", so we fake a filename.
        filename = file.filename if file.filename and '.' in file.filename else "audio.wav"
        
        transcription = client.audio.transcriptions.create(
            file=(filename, audio_bytes),
            model="whisper-large-v3",
        )
        return {"text": transcription.text}
    except Exception as e:
        print("Transcription Error:", e)
        return {"error": str(e)}