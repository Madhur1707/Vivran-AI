from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import process, health, search, email, team, actions, voice

app = FastAPI(title="MeetingMind API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(process.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(email.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(voice.router, prefix="/api")
