import copy
import logging
from typing import Any, Dict, List
import uuid

logger = logging.getLogger(__name__)

MAX_TITLE_LEN = 255
MAX_DETAILS_LEN = 2000
MAX_COLUMNS = 20


def generate_id() -> str:
    """Generate a unique ID for cards."""
    return f"card-{uuid.uuid4().hex[:8]}"


def generate_column_id() -> str:
    """Generate a unique ID for columns."""
    return f"col-{uuid.uuid4().hex[:8]}"


def apply_board_operations(board: Dict[str, Any], operations: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Apply a list of operations to a board and return the updated board."""
    if not operations:
        return board

    updated_board = copy.deepcopy(board)

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
        elif op_type == "add_column":
            updated_board = _add_column(updated_board, operation)
        elif op_type == "delete_column":
            updated_board = _delete_column(updated_board, operation)
        elif op_type == "reorder_columns":
            updated_board = _reorder_columns(updated_board, operation)
        else:
            logger.warning("Unknown operation type: %s — skipped", op_type)

    return updated_board


def _add_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Add a new card to a column."""
    column_id = operation.get("columnId")
    title = operation.get("title", "").strip()
    details = operation.get("details", "").strip()

    if not column_id or not title:
        logger.warning("add_card skipped: missing columnId or title")
        return board

    title = title[:MAX_TITLE_LEN]
    details = details[:MAX_DETAILS_LEN]

    new_card: Dict[str, Any] = {
        "id": generate_id(),
        "title": title,
        "details": details,
    }

    # Preserve optional card fields if provided
    if operation.get("priority") in ("low", "medium", "high"):
        new_card["priority"] = operation["priority"]
    if operation.get("due_date"):
        new_card["due_date"] = str(operation["due_date"])[:10]
    if operation.get("labels") and isinstance(operation["labels"], list):
        new_card["labels"] = [str(l)[:50] for l in operation["labels"][:10]]

    for column in board.get("columns", []):
        if column["id"] == column_id:
            column["cards"].append(new_card)
            return board

    logger.warning("add_card skipped: column '%s' not found", column_id)
    return board


def _edit_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Edit an existing card."""
    card_id = operation.get("cardId")
    title = operation.get("title")
    details = operation.get("details")

    if not card_id:
        logger.warning("edit_card skipped: missing cardId")
        return board

    for column in board.get("columns", []):
        for card in column.get("cards", []):
            if card["id"] == card_id:
                if title is not None:
                    card["title"] = title.strip()[:MAX_TITLE_LEN]
                if details is not None:
                    card["details"] = details.strip()[:MAX_DETAILS_LEN]
                if operation.get("priority") in ("low", "medium", "high", None):
                    if operation.get("priority") is not None:
                        card["priority"] = operation["priority"]
                if "due_date" in operation:
                    card["due_date"] = str(operation["due_date"])[:10] if operation["due_date"] else None
                if "labels" in operation and isinstance(operation.get("labels"), list):
                    card["labels"] = [str(l)[:50] for l in operation["labels"][:10]]
                return board

    logger.warning("edit_card skipped: card '%s' not found", card_id)
    return board


def _delete_card(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Delete a card from the board."""
    card_id = operation.get("cardId")

    if not card_id:
        logger.warning("delete_card skipped: missing cardId")
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
        logger.warning("move_card skipped: missing cardId or destColumnId")
        return board

    moving_card = None
    for column in board.get("columns", []):
        for i, card in enumerate(column.get("cards", [])):
            if card["id"] == card_id:
                moving_card = column["cards"].pop(i)
                break
        if moving_card:
            break

    if not moving_card:
        logger.warning("move_card skipped: card '%s' not found", card_id)
        return board

    for column in board.get("columns", []):
        if column["id"] == dest_column_id:
            cards = column["cards"]
            position = max(0, min(position, len(cards)))
            cards.insert(position, moving_card)
            return board

    logger.warning("move_card skipped: destination column '%s' not found", dest_column_id)
    return board


def _rename_column(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Rename a column."""
    column_id = operation.get("columnId")
    title = operation.get("title", "").strip()

    if not column_id or not title:
        logger.warning("rename_column skipped: missing columnId or title")
        return board

    title = title[:MAX_TITLE_LEN]

    for column in board.get("columns", []):
        if column["id"] == column_id:
            column["title"] = title
            return board

    logger.warning("rename_column skipped: column '%s' not found", column_id)
    return board


def _add_column(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Add a new empty column to the board."""
    title = operation.get("title", "").strip()

    if not title:
        logger.warning("add_column skipped: missing title")
        return board

    if len(board.get("columns", [])) >= MAX_COLUMNS:
        logger.warning("add_column skipped: max column limit reached (%d)", MAX_COLUMNS)
        return board

    title = title[:MAX_TITLE_LEN]
    col_id = operation.get("columnId") or generate_column_id()

    new_column = {"id": col_id, "title": title, "cards": []}
    board.setdefault("columns", []).append(new_column)
    return board


def _delete_column(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Delete a column and all its cards."""
    column_id = operation.get("columnId")

    if not column_id:
        logger.warning("delete_column skipped: missing columnId")
        return board

    columns = board.get("columns", [])
    if len(columns) <= 1:
        logger.warning("delete_column skipped: cannot delete the last column")
        return board

    board["columns"] = [col for col in columns if col["id"] != column_id]
    return board


def _reorder_columns(board: Dict[str, Any], operation: Dict[str, Any]) -> Dict[str, Any]:
    """Reorder columns given an ordered list of column IDs."""
    column_ids = operation.get("columnIds", [])

    if not column_ids:
        logger.warning("reorder_columns skipped: missing columnIds")
        return board

    col_map = {col["id"]: col for col in board.get("columns", [])}
    reordered = [col_map[cid] for cid in column_ids if cid in col_map]
    # Append any columns not in the provided order at the end
    provided_ids = set(column_ids)
    for col in board.get("columns", []):
        if col["id"] not in provided_ids:
            reordered.append(col)

    board["columns"] = reordered
    return board
