"""
FastAPI server for Tetris AI training
Endpoints: /log, /weights, /summary
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Paths
BASE_DIR = Path(__file__).parent
WEIGHTS_PATH = BASE_DIR / "weights" / "weights.json"
LOGS_DIR = BASE_DIR / "logs"
LOGS_PATH = LOGS_DIR / "games.jsonl"

# Ensure directories exist
LOGS_DIR.mkdir(exist_ok=True)
(BASE_DIR / "weights").mkdir(exist_ok=True)

# Create initial weights if not exists
if not WEIGHTS_PATH.exists():
    default_weights = {
        "linesCleared": 0.76,
        "holes": -0.36,
        "aggregateHeight": -0.51,
        "bumpiness": -0.18,
        "maxHeight": -0.1,
        "wells": -0.05
    }
    with open(WEIGHTS_PATH, "w") as f:
        json.dump(default_weights, f, indent=2)


# Pydantic models
class GameResult(BaseModel):
    gameId: str
    seed: int
    startedAt: str
    endedAt: str
    lines: int
    pieces: int
    score: int
    deathMaxHeight: int
    weightsVersion: str
    endedReason: str = "TOP_OUT"  # TOP_OUT, NO_VALID_PLAN, MAX_PIECES, MAX_LINES, MAX_TIME, MAX_STEPS, STALLED
    durationMs: int = 0


class Weights(BaseModel):
    linesCleared: float
    holes: float
    aggregateHeight: float
    bumpiness: float
    maxHeight: float
    wells: float


class Summary(BaseModel):
    totalGames: int
    recentGames: int
    avgLines: float
    avgPieces: float
    avgScore: float
    maxLines: int
    maxPieces: int
    avgDeathMaxHeight: float


# FastAPI app
app = FastAPI(title="Tetris AI Backend")

# CORS (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/log")
async def post_log(result: GameResult):
    """Append game result to logs"""
    try:
        with open(LOGS_PATH, "a") as f:
            f.write(json.dumps(result.model_dump()) + "\n")
        return {"status": "ok", "gameId": result.gameId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/weights")
async def get_weights() -> Weights:
    """Return current weights"""
    try:
        with open(WEIGHTS_PATH, "r") as f:
            data = json.load(f)
        return Weights(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/summary")
async def get_summary(n: int = 100) -> Summary:
    """Return summary of recent games"""
    games = []
    
    if LOGS_PATH.exists():
        with open(LOGS_PATH, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        games.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
    
    total_games = len(games)
    recent_games = games[-n:] if games else []
    
    if not recent_games:
        return Summary(
            totalGames=0,
            recentGames=0,
            avgLines=0,
            avgPieces=0,
            avgScore=0,
            maxLines=0,
            maxPieces=0,
            avgDeathMaxHeight=0,
        )
    
    lines = [g.get("lines", 0) for g in recent_games]
    pieces = [g.get("pieces", 0) for g in recent_games]
    scores = [g.get("score", 0) for g in recent_games]
    death_heights = [g.get("deathMaxHeight", 0) for g in recent_games]
    
    return Summary(
        totalGames=total_games,
        recentGames=len(recent_games),
        avgLines=sum(lines) / len(lines),
        avgPieces=sum(pieces) / len(pieces),
        avgScore=sum(scores) / len(scores),
        maxLines=max(lines),
        maxPieces=max(pieces),
        avgDeathMaxHeight=sum(death_heights) / len(death_heights),
    )


@app.get("/health")
async def health():
    """Health check"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
