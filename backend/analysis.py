"""
Analysis functions for Tetris AI training
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import statistics

BASE_DIR = Path(__file__).parent
LOGS_PATH = BASE_DIR / "logs" / "games.jsonl"


def load_games(path: Path = LOGS_PATH) -> List[Dict[str, Any]]:
    """Load all games from log file"""
    games = []
    if not path.exists():
        return games
    
    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    games.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
    return games


def filter_by_weights(games: List[Dict], weights_version: str) -> List[Dict]:
    """Filter games by weights version"""
    return [g for g in games if g.get("weightsVersion") == weights_version]


def compute_stats(games: List[Dict]) -> Dict[str, float]:
    """Compute statistics for a set of games"""
    if not games:
        return {
            "count": 0,
            "avg_lines": 0,
            "std_lines": 0,
            "avg_pieces": 0,
            "avg_score": 0,
            "max_lines": 0,
            "max_pieces": 0,
        }
    
    lines = [g.get("lines", 0) for g in games]
    pieces = [g.get("pieces", 0) for g in games]
    scores = [g.get("score", 0) for g in games]
    
    return {
        "count": len(games),
        "avg_lines": statistics.mean(lines),
        "std_lines": statistics.stdev(lines) if len(lines) > 1 else 0,
        "avg_pieces": statistics.mean(pieces),
        "avg_score": statistics.mean(scores),
        "max_lines": max(lines),
        "max_pieces": max(pieces),
    }


def get_recent_stats(n: int = 100) -> Dict[str, float]:
    """Get stats for the most recent n games"""
    games = load_games()
    recent = games[-n:] if games else []
    return compute_stats(recent)


def get_weights_performance(weights_version: str) -> Dict[str, float]:
    """Get performance stats for a specific weights version"""
    games = load_games()
    filtered = filter_by_weights(games, weights_version)
    return compute_stats(filtered)


def print_summary():
    """Print summary of training progress"""
    games = load_games()
    
    if not games:
        print("No games logged yet.")
        return
    
    print(f"\n=== Training Summary ===")
    print(f"Total games: {len(games)}")
    
    # Overall stats
    stats = compute_stats(games)
    print(f"\nOverall:")
    print(f"  Avg lines: {stats['avg_lines']:.1f} (±{stats['std_lines']:.1f})")
    print(f"  Avg pieces: {stats['avg_pieces']:.1f}")
    print(f"  Max lines: {stats['max_lines']}")
    
    # Recent stats
    recent = compute_stats(games[-100:])
    print(f"\nLast 100 games:")
    print(f"  Avg lines: {recent['avg_lines']:.1f} (±{recent['std_lines']:.1f})")
    print(f"  Avg pieces: {recent['avg_pieces']:.1f}")
    print(f"  Max lines: {recent['max_lines']}")
    
    # By weights version
    versions = {}
    for g in games:
        v = g.get("weightsVersion", "unknown")
        if v not in versions:
            versions[v] = []
        versions[v].append(g)
    
    print(f"\nBy weights version ({len(versions)} versions):")
    for v, g_list in sorted(versions.items(), key=lambda x: -len(x[1]))[:5]:
        v_stats = compute_stats(g_list)
        print(f"  {v[:8]}: {len(g_list)} games, avg {v_stats['avg_lines']:.1f} lines")


if __name__ == "__main__":
    print_summary()
