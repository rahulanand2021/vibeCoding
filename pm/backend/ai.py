import os
from typing import Any, Dict, List, Optional

from openai import OpenAI


def get_ai_client() -> OpenAI:
    """Initialize OpenAI client from environment."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not set")
    return OpenAI(api_key=api_key)


def ping_ai() -> str:
    """Test AI connectivity with a simple 2+2 prompt."""
    client = get_ai_client()
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "What is 2+2? Answer with just the number."}],
        temperature=0.7,
        max_tokens=10,
    )
    return response.choices[0].message.content or "No response"


def query_ai(
    query: str,
    board: Optional[Dict[str, Any]] = None,
    conversation: Optional[list[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Query AI with optional board context and conversation history.
    
    Returns structured response with text, boardUpdate, and actions.
    """
    if not query.strip():
        raise ValueError("query is required")

    client = get_ai_client()

    # Build system message with board context and structured output instructions
    system_msg = (
        "You are a helpful project management assistant. Help users manage their Kanban board efficiently.\n\n"
        "You can perform the following board operations:\n"
        "- add_card: Add a new card to a column\n"
        "- edit_card: Edit an existing card's title or details\n"
        "- delete_card: Delete a card\n"
        "- move_card: Move a card between columns\n"
        "- rename_column: Rename a column\n\n"
        "When the user asks you to make changes to the board, respond with a JSON object containing:\n"
        "{\n"
        '  "text": "Your response text to the user",\n'
        '  "boardUpdate": {\n'
        '    "operations": [\n'
        '      {\n'
        '        "type": "add_card|edit_card|delete_card|move_card|rename_column",\n'
        '        "columnId": "column_id",  // for add_card, move_card\n'
        '        "cardId": "card_id",      // for edit_card, delete_card, move_card\n'
        '        "title": "new_title",     // for add_card, edit_card, rename_column\n'
        '        "details": "new_details", // for add_card, edit_card\n'
        '        "sourceColumnId": "source_column_id", // for move_card\n'
        '        "destColumnId": "dest_column_id",     // for move_card\n'
        '        "position": 0  // position in destination column for move_card\n'
        '      }\n'
        '    ]\n'
        '  },\n'
        '  "actions": []  // reserved for future use\n'
        "}\n\n"
        "If no board changes are needed, set boardUpdate to null.\n"
        "Always respond with valid JSON."
    )
    
    if board:
        system_msg += f"\n\nCurrent board state: {board}"

    # Build messages with conversation history
    messages = [{"role": "system", "content": system_msg}]
    if conversation:
        messages.extend(conversation)
    messages.append({"role": "user", "content": query})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.7,
        max_tokens=1000,
        response_format={"type": "json_object"}  # Force JSON response
    )
    
    content = response.choices[0].message.content or "{}"
    
    try:
        import json
        result = json.loads(content)
        # Ensure required fields exist
        if "text" not in result:
            result["text"] = "I understood your request but couldn't process it properly."
        if "boardUpdate" not in result:
            result["boardUpdate"] = None
        if "actions" not in result:
            result["actions"] = None
        return result
    except json.JSONDecodeError:
        # Fallback if AI doesn't return valid JSON
        return {
            "text": content if content else "I couldn't process your request properly.",
            "boardUpdate": None,
            "actions": None
        }
