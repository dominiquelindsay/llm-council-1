"""JSON-based storage for conversations with Visual Persistence support."""

import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
from config import DATA_DIR


def ensure_data_dir():
    """Ensure the data directory exists."""
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)


def get_conversation_path(conversation_id: str) -> str:
    """Get the file path for a conversation."""
    return os.path.join(DATA_DIR, f"{conversation_id}.json")


def create_conversation(conversation_id: str) -> Dict[str, Any]:
    """Create a new conversation entry."""
    ensure_data_dir()

    conversation = {
        "id": conversation_id,
        "created_at": datetime.utcnow().isoformat(),
        "title": "New Conversation",
        "messages": []
    }

    path = get_conversation_path(conversation_id)
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)

    return conversation


def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Load a conversation from storage."""
    path = get_conversation_path(conversation_id)

    if not os.path.exists(path):
        return None

    with open(path, 'r') as f:
        return json.load(f)


def save_conversation(conversation: Dict[str, Any]):
    """Save a conversation to the drive."""
    ensure_data_dir()

    path = get_conversation_path(conversation['id'])
    with open(path, 'w') as f:
        json.dump(conversation, f, indent=2)


def list_conversations() -> List[Dict[str, Any]]:
    """List all conversations with enhanced error handling for corrupted files."""
    ensure_data_dir()
    conversations = []
    
    for filename in os.listdir(DATA_DIR):
        if filename.endswith('.json'):
            path = os.path.join(DATA_DIR, filename)
            try:
                with open(path, 'r') as f:
                    data = json.load(f)
                    conversations.append({
                        "id": data["id"],
                        "created_at": data["created_at"],
                        "title": data.get("title", "New Conversation"),
                        "message_count": len(data.get("messages", []))
                    })
            except (json.JSONDecodeError, KeyError, OSError):
                # Skip corrupted or locked files so the Sidebar doesn't break
                continue

    # Sort by creation time, newest first
    conversations.sort(key=lambda x: x["created_at"], reverse=True)
    return conversations


# --- V9.0 VISUAL PERSISTENCE UPGRADE ---
def add_user_message(conversation_id: str, content: str, attachments: List[str] = None):
    """
    Add a user message containing permanent Base64 visual data strings.
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "user",
        "content": content,
        "attachments": attachments or []  # This array now holds the physical image data
    })

    save_conversation(conversation)


def add_assistant_message(
    conversation_id: str,
    stage1: List[Dict[str, Any]] = None,
    stage2: List[Dict[str, Any]] = None,
    stage3: Dict[str, Any] = None
):
    """
    Add an assistant message with robust null-checks for failed model stages.
    """
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"].append({
        "role": "assistant",
        "stage1": stage1 or [],
        "stage2": stage2 or [],
        "stage3": stage3 or {"content": "Synthesis failed or Chairman unavailable."}
    })

    save_conversation(conversation)


def update_conversation_title(conversation_id: str, title: str):
    """Update the title of a conversation."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["title"] = title
    save_conversation(conversation)


def clear_messages(conversation_id: str):
    """Clear all messages in a conversation while preserving the title."""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise ValueError(f"Conversation {conversation_id} not found")

    conversation["messages"] = []
    save_conversation(conversation)