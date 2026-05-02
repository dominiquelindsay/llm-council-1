"""Configuration for the LLM Council Command Module - V4.5 STABLE_ROSTER."""

import os
from dotenv import load_dotenv

# Actively override any stale system variables with the latest from the .env vault
load_dotenv(override=True)

# --- API CREDENTIALS ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# --- EXECUTIVE OVERRIDE (FROM .ENV) ---
CHAIRMAN_ENV = os.getenv("CHAIRMAN_MODEL", "google/gemini-3.1-pro-preview")

# Seat 5: Qwen (The Multi-Vision Specialist)
# Upgraded to 2.5-VL for superior multi-image stability.

# [ TIER 1: FAST ] 
FAST_COUNCIL = [
    "openai/gpt-5.4-mini", 
    "anthropic/claude-haiku-4.5",
    "x-ai/grok-3-mini",        # Corrected Speed ID
    "perplexity/sonar",        # Corrected Unified ID
    "qwen/qwen-2.5-vl-7b-instruct" # Upgraded Multi-Vision
]

# [ TIER 2: PRO ] 
PRO_COUNCIL = [
    "openai/gpt-5.4",
    "anthropic/claude-sonnet-4.6",
    "x-ai/grok-4.20-beta",
    "perplexity/sonar",
    "qwen/qwen-2.5-vl-72b-instruct" # Upgraded Multi-Vision
]

# [ TIER 3: OMEGA / GOD ] 
OMEGA_COUNCIL = [
    "openai/o3-mini",
    "anthropic/claude-3-7-sonnet",
    "x-ai/grok-4.20-beta",
    "perplexity/sonar-reasoning-pro",
    "qwen/qwen-2.5-vl-72b-instruct"
]

# --- THE ROUTING MATRIX ---
TIERS = {
    "fast": {
        "council": FAST_COUNCIL, 
        "chairman": "google/gemini-3-flash-preview"
    },
    "pro": {
        "council": PRO_COUNCIL, 
        "chairman": CHAIRMAN_ENV
    },
    "omega": {
        "council": OMEGA_COUNCIL, 
        "chairman": CHAIRMAN_ENV
    },
    "god": {
        "council": OMEGA_COUNCIL, 
        "chairman": "openai/gpt-5.4-pro"
    }
}

# --- PERFORMANCE PARAMETERS ---
MAX_TOKENS = 8192 
TEMPERATURE = 0.8 

# --- ENDPOINTS & PATHS ---
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
DATA_DIR = os.getenv("DATA_DIR", "G:/llm-council/data/conversations")