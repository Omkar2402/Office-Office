import random
from fastapi import APIRouter
from app.firebase import get_ref
from app.ai_engine import evaluate_players

router = APIRouter()

# ============================
# START GAME: ASSIGN ROLE + DESK
# ============================
@router.post("/game/start")
def start_game(data: dict):
    print("Starting game with data:", data)
    room = data["roomId"]

    players_ref = get_ref(f"rooms/{room}/players")
    players = players_ref.get() or {}

    player_ids = list(players.keys())

    if len(player_ids) < 1:
        return {"error": "Need at least 1 player to start the game"}

    # Shuffle players for desk assignment
    random.shuffle(player_ids)

    # Assign desks (cubicles)
    for i, pid in enumerate(player_ids):
        get_ref(f"rooms/{room}/players/{pid}").update({
            "deskId": i + 1,
            "isWorking": False
        })

    # Assign 1 fake employee
    fake_id = random.choice(player_ids)

    for pid in player_ids:
        role = "FAKE" if pid == fake_id else "GOOD"
        get_ref(f"rooms/{room}/players/{pid}/role").set(role)

    # Move game forward
    get_ref(f"rooms/{room}/gameState").set({
        "phase": "ROLE_REVEAL"
    })

    return {
        "message": "Game started",
        "fakeEmployee": fake_id
    }

# ============================
# PLAYER STARTS WORK AT DESK
# ============================
@router.post("/game/start-work")
def start_work(data: dict):
    room = data["roomId"]
    player_id = data["playerId"]

    get_ref(f"rooms/{room}/players/{player_id}/isWorking").set(True)

    return {"message": "Player started working"}

# ============================
# CHECK IF ALL PLAYERS WORKING
# ============================
@router.get("/game/check-progress")
def check_progress(roomId: str):
    players = get_ref(f"rooms/{roomId}/players").get() or {}

    all_working = all(
        p.get("isWorking") for p in players.values()
    )

    if all_working:
        get_ref(f"rooms/{roomId}/gameState/phase").set("TASK_ACTIVE")

    return {
        "allWorking": all_working
    }

# ============================
# SUBMIT TASKS
# ============================
@router.post("/game/submit-tasks")
def submit_tasks(data: dict):
    room = data["roomId"]
    tasks = data["tasks"]

    get_ref(f"rooms/{room}/tasks").set(tasks)
    get_ref(f"rooms/{room}/gameState").update({
        "phase": "AI_CHECK"
    })

    return {"message": "Tasks saved"}

# ============================
# AI EVALUATION
# ============================



@router.post("/ai/evaluate")
def ai_eval(data: dict):
    room = data["roomId"]

    players_metrics = get_ref(f"rooms/{room}/metrics").get()

    if not players_metrics:
        print("DEBUG: No metrics found in database!")
        return {"error": "No metrics found"}

    print(f"DEBUG: Received Player Metrics: {players_metrics}")

    result = evaluate_players(players_metrics)

    get_ref(f"rooms/{room}/gameState").update({
        "phase": "VOTING",
        "aiResult": result
    })

    return {"aiResult": result}


# ============================
# FIREBASE TEST
# ============================
@router.get("/test-firebase")
def test_firebase():
    ref = get_ref("test")
    ref.set({"ok": True})
    return {"firebase": "connected"}
