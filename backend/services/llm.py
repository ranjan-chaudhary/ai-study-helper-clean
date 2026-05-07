import os
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from dotenv import load_dotenv

load_dotenv(override=True)

def get_llm():
    return ChatGroq(
        model_name="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        streaming=True
    )

def ask_llm_stream(messages: list, persona: str = "Supportive Peer"):
    """
    persona: "Socratic Sage", "Strict Professor", "Supportive Peer", "Direct Learner"
    """
    
    persona_prompts = {
        "Socratic Sage": "You are a Socratic Sage. Never give direct answers. Instead, ask guiding questions that help the student discover the answer themselves.",
        "Strict Professor": "You are a Strict Professor. Use high-level academic language, be very formal, and demand rigorous explanations. Focus on first principles.",
        "Supportive Peer": "You are a Supportive Peer. Use casual, encouraging language. Use relatable analogies and emojis to make learning fun and accessible.",
        "Direct Learner": "You are a Direct Learner assistant. Be extremely concise. Use bullet points and bold text. No fluff, just the core facts."
    }
    
    system_instruction = f"""
    {persona_prompts.get(persona, persona_prompts["Supportive Peer"])}
    ALWAYS use Markdown for formatting (headers, bold, lists).
    Never output raw walls of text. Break into clear paragraphs.
    If the user asks a question, ensure the explanation is structured.
    """
    
    llm = get_llm()
    full_messages = [SystemMessage(content=system_instruction)] + messages
    return llm.stream(full_messages)