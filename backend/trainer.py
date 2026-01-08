"""
Trainer for Tetris AI weights optimization using simple evolutionary strategy
"""

import json
import time
import random
import hashlib
from pathlib import Path
from typing import Dict, List, Tuple
from dataclasses import dataclass, field
from analysis import load_games, compute_stats, filter_by_weights

BASE_DIR = Path(__file__).parent
WEIGHTS_PATH = BASE_DIR / "weights" / "weights.json"


@dataclass
class TrainerConfig:
    # Number of games to collect per candidate before evaluation
    games_per_candidate: int = 20
    
    # Number of candidates per generation
    population_size: int = 5
    
    # Number of top candidates to keep for next generation
    elite_size: int = 2
    
    # Mutation rate (standard deviation for gaussian noise)
    mutation_rate: float = 0.1
    
    # Check interval in seconds
    check_interval: float = 5.0
    
    # Maximum generations (0 = infinite)
    max_generations: int = 0


def load_weights() -> Dict[str, float]:
    """Load current weights from file"""
    with open(WEIGHTS_PATH, "r") as f:
        return json.load(f)


def save_weights(weights: Dict[str, float]) -> None:
    """Save weights to file"""
    with open(WEIGHTS_PATH, "w") as f:
        json.dump(weights, f, indent=2)


def hash_weights(weights: Dict[str, float]) -> str:
    """Generate hash for weights (for identification)"""
    s = json.dumps(weights, sort_keys=True)
    return hashlib.md5(s.encode()).hexdigest()[:8]


def mutate_weights(weights: Dict[str, float], rate: float) -> Dict[str, float]:
    """Create mutated copy of weights"""
    new_weights = {}
    for key, value in weights.items():
        # Add Gaussian noise
        noise = random.gauss(0, rate)
        new_weights[key] = value + noise
    return new_weights


def crossover(w1: Dict[str, float], w2: Dict[str, float]) -> Dict[str, float]:
    """Create child weights by crossing two parents"""
    child = {}
    for key in w1.keys():
        # Random blend
        alpha = random.random()
        child[key] = alpha * w1[key] + (1 - alpha) * w2[key]
    return child


def evaluate_weights(weights_hash: str, min_games: int = 10) -> Tuple[float, int]:
    """
    Get performance score for a weights version
    Returns (score, game_count)
    """
    games = load_games()
    filtered = filter_by_weights(games, weights_hash)
    
    if len(filtered) < min_games:
        return 0.0, len(filtered)
    
    stats = compute_stats(filtered)
    # Score based on average lines (primary goal)
    return stats["avg_lines"], len(filtered)


class Trainer:
    def __init__(self, config: TrainerConfig = None):
        self.config = config or TrainerConfig()
        self.generation = 0
        self.best_weights = load_weights()
        self.best_score = 0.0
        self.current_candidate = None
        self.candidates: List[Tuple[Dict[str, float], str]] = []  # (weights, hash)
        self.candidate_index = 0
    
    def generate_candidates(self) -> None:
        """Generate new candidate weights for this generation"""
        self.candidates = []
        
        # Always include the best weights
        best_hash = hash_weights(self.best_weights)
        self.candidates.append((self.best_weights.copy(), best_hash))
        
        # Generate mutations
        for _ in range(self.config.population_size - 1):
            mutated = mutate_weights(self.best_weights, self.config.mutation_rate)
            h = hash_weights(mutated)
            self.candidates.append((mutated, h))
        
        self.candidate_index = 0
        print(f"\nGeneration {self.generation}: {len(self.candidates)} candidates")
    
    def set_current_candidate(self) -> bool:
        """Set the next candidate as current weights. Returns False if no more candidates."""
        if self.candidate_index >= len(self.candidates):
            return False
        
        weights, h = self.candidates[self.candidate_index]
        save_weights(weights)
        self.current_candidate = h
        print(f"  Candidate {self.candidate_index + 1}/{len(self.candidates)}: {h}")
        return True
    
    def wait_for_games(self) -> bool:
        """Wait until enough games are played with current weights"""
        target = self.config.games_per_candidate
        
        while True:
            score, count = evaluate_weights(self.current_candidate, min_games=1)
            
            if count >= target:
                print(f"    → {count} games, avg lines: {score:.1f}")
                return True
            
            print(f"    Waiting... ({count}/{target} games)")
            time.sleep(self.config.check_interval)
    
    def evaluate_generation(self) -> None:
        """Evaluate all candidates and select best"""
        results = []
        
        for weights, h in self.candidates:
            score, count = evaluate_weights(h, min_games=self.config.games_per_candidate)
            results.append((weights, h, score, count))
            print(f"  {h}: {score:.1f} avg lines ({count} games)")
        
        # Sort by score (descending)
        results.sort(key=lambda x: -x[2])
        
        # Update best if improved
        if results[0][2] > self.best_score:
            self.best_weights = results[0][0]
            self.best_score = results[0][2]
            print(f"\n  ★ New best: {results[0][1]} with {self.best_score:.1f} avg lines")
        else:
            print(f"\n  Best unchanged: {self.best_score:.1f} avg lines")
        
        # Use elites for next generation
        if self.config.elite_size > 1:
            # Crossover top performers
            parent1 = results[0][0]
            parent2 = results[1][0]
            child = crossover(parent1, parent2)
            self.best_weights = child
    
    def run(self) -> None:
        """Main training loop"""
        print("=" * 50)
        print("Tetris AI Trainer")
        print("=" * 50)
        print(f"Config: {self.config.games_per_candidate} games/candidate, "
              f"{self.config.population_size} candidates/gen")
        print("Make sure the frontend is running with Auto mode ON!")
        print("=" * 50)
        
        try:
            while True:
                self.generation += 1
                
                if self.config.max_generations > 0 and self.generation > self.config.max_generations:
                    print("\nMax generations reached. Stopping.")
                    break
                
                # Generate candidates
                self.generate_candidates()
                
                # Test each candidate
                while self.set_current_candidate():
                    self.wait_for_games()
                    self.candidate_index += 1
                
                # Evaluate and select
                self.evaluate_generation()
                
                # Save best weights
                save_weights(self.best_weights)
                print(f"  Saved weights: {hash_weights(self.best_weights)}")
        
        except KeyboardInterrupt:
            print("\n\nTraining interrupted by user.")
            print(f"Best score: {self.best_score:.1f} avg lines")
            save_weights(self.best_weights)
            print(f"Saved final weights: {hash_weights(self.best_weights)}")


def main():
    config = TrainerConfig(
        games_per_candidate=20,    # Games per candidate
        population_size=5,         # Candidates per generation
        elite_size=2,              # Top candidates for crossover
        mutation_rate=0.1,         # Mutation strength
        check_interval=5.0,        # Seconds between checks
        max_generations=0,         # 0 = infinite
    )
    
    trainer = Trainer(config)
    trainer.run()


if __name__ == "__main__":
    main()
