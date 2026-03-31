from typing import Any, Dict, List, Optional
import uuid


def generate_id() -> str:
    """Generate a unique ID for cards."""
    return f"card-{uuid.uuid4().hex[:8]}"


def apply_board_operations(board: Dict[str, Any], operations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply a list of operations to a board and return the updated board."""
    if not operations:
        return board
    
    updated_board = board.copy()
    updated_board["columns"] = [col.copy() for col in board.get("columns", [])]
    
    for col in updated_board["columns"]:
        col["cards"] = [card.copy() for card in col.get("cards", [])]
    
    for operation in operations:
        op_type = operation.get("type")
        
        if op_type == "add_card":
            updated_board = _add_card(updated_board, operation)
        elif op_type == "edit_card":
            updated_board = _edit_card(updated_board, operation)
        elif op_type == "delete_card":
            updated_board = _delete_card(updated_board, operation)
        elif op_type == "move_card":
            updated_board = _move_card(updated_board, operation)
        elif op_type == "rename_column":
            updated_board = _rename_column(updated_board, operation)
        # Ignore unknown operation types
    
    return updated_board


def _add_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Add a new card to a column."""
    column_id = operation.get("columnId")
    title = operation.get("title", "").strip()
    details = operation.get("details", "").strip()
    
    if not column_id or not title or not details:
        return board
    
    new_card = {
        "id": generate_id(),
        "title": title,
        "details": details
    }
    
    for column in board.get("columns", []):
        if column["id"] == column_id:
            column["cards"].append(new_card)
            break
    
    return board


def _edit_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Edit an existing card."""
    card_id = operation.get("cardId")
    title = operation.get("title")
    details = operation.get("details")
    
    if not card_id:
        return board
    
    for column in board.get("columns", []):
        for card in column.get("cards", []):
            if card["id"] == card_id:
                if title is not None:
                    card["title"] = title.strip()
                if details is not None:
                    card["details"] = details.strip()
                break
    
    return board


def _delete_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Delete a card from the board."""
    card_id = operation.get("cardId")
    
    if not card_id:
        return board
    
    for column in board.get("columns", []):
        column["cards"] = [card for card in column.get("cards", []) if card["id"] != card_id]
    
    return board


def _move_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Move a card between columns."""
    card_id = operation.get("cardId")
    dest_column_id = operation.get("destColumnId")
    position = operation.get("position", 0)
    
    if not card_id or not dest_column_id:
        return board
    
    # Find and remove the card from its current location
    moving_card = None
    for column in board.get("columns", []):
        for i, card in enumerate(column.get("cards", [])):
            if card["id"] == card_id:
                moving_card = column["cards"].pop(i)
                break
        if moving_card:
            break
    
    if not moving_card:
        return board
    
    # Add the card to the destination column at the specified position
    for column in board.get("columns", []):
        if column["id"] == dest_column_id:
            cards = column["cards"]
            position = max(0, min(position, len(cards)))
            cards.insert(position, moving_card)
            break
    
    return board


def _rename_column(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Rename a column."""
    column_id = operation.get("columnId")
    title = operation.get("title", "").strip()
    
    if not column_id or not title:
        return board
    
    for column in board.get("columns", []):
        if column["id"] == column_id:
            column["title"] = title
            break
    
    return board