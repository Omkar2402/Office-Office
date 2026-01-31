import random
from fastapi import APIRouter
from app.firebase import get_ref
from app.ai_engine import evaluate_players

router = APIRouter()

@router.post("/game/start")
def start_game(data: dict):
    print("Starting game with data:", data)
    room = data["roomId"]

    players_ref = get_ref(f"rooms/{room}/players")
    players = players_ref.get()

    player_ids = list(players.keys())

    # Safety check
    if len(player_ids) < 1:
        return {"error": "Need at least 1 player to start the game"}

    # Choose 1 fake employee randomly
    fake_id = random.choice(player_ids)

    for pid in player_ids:
        role = "FAKE" if pid == fake_id else "GOOD"
        get_ref(f"rooms/{room}/players/{pid}/role").set(role)

    # Move game forward
    get_ref(f"rooms/{room}/gameState").set({
        "phase": "ROLE_REVEAL"
    })

    return {"message": "Roles assigned"}


@router.post("/game/submit-tasks")
def submit_tasks(data: dict):
    room = data["roomId"]
    tasks = data["tasks"]
    get_ref(f"rooms/{room}/tasks").set(tasks)
    get_ref(f"rooms/{room}/gameState").update({"phase": "AI_CHECK"})
    return {"message": "Tasks saved"}

@router.post("/ai/evaluate")
def ai_eval(data: dict):
    room = data["roomId"]
    players = get_ref(f"rooms/{room}/tasks").get()

    result = evaluate_players(players)

    get_ref(f"rooms/{room}/gameState").update({
        "phase": "VOTING",
        "aiResult": result
    })

    return {"aiResult": result}

@router.get("/test-firebase")
def test_firebase():
    ref = get_ref("test")
    ref.set({"ok": True})
    return {"firebase": "connected"}

