# AI Study Helper

A full-stack application for AI-powered studying with PDF uploads, built with React, FastAPI, and LangChain.

## Deployment with Docker

The easiest way to deploy both the frontend and backend is using Docker Compose.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed on your machine.
- An OpenAI API key (or Groq API key depending on your LLM provider).

### Steps
1. Navigate to the `backend/` folder and create a `.env` file based on `.env.example`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Add your API keys to the `.env` file.

2. From the root directory (where `docker-compose.yml` is located), run:
   ```bash
   docker compose up --build -d
   ```

3. Access the application:
   - Frontend: [http://localhost](http://localhost)
   - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Stopping the app
To stop the containers, run:
```bash
docker compose down
```
