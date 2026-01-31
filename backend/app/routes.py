from fastapi import APIRouter
from app.firebase import get_ref
from app.ai_engine import evaluate_players

router = APIRouter()

@router.post("/game/start")
def start_game(data: dict):
    room = data["roomId"]
    ref = get_ref(f"rooms/{room}/gameState")
    ref.set({"phase": "TASK"})
    return {"message": "Game started"}

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

