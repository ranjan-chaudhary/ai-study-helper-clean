"""
ANTIGRAVITY Backend API
Main entry point for the FastAPI application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# import routes
from routes import auth, chat, pdf

# ✅ FIRST create app
app = FastAPI()

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- ROUTES ----------------
app.include_router(auth.router, prefix="/auth")
app.include_router(chat.router, prefix="/chat")
app.include_router(pdf.router, prefix="/pdf")

# ---------------- TEST ----------------
@app.get("/")
def home():
    return {"message": "ANTIGRAVITY Backend - v2 (FastEmbed) ✅"}


@app.get("/version")
def version():
    return {"version": "2.0.0", "engine": "FastEmbed"}


@app.get("/health")
def health_check():
    """Service health check endpoint."""
    return {"status": "healthy", "service": "ANTIGRAVITY Backend"}