import sys
import os

# Add backend directory to path so we can import app modules
sys.path.append(os.path.abspath("backend"))

# Mock OpenAI before import
from unittest.mock import MagicMock
import sys

# Mock modules
sys.modules["openai"] = MagicMock()
sys.modules["dotenv"] = MagicMock()

# Setup Mock Client
mock_client = MagicMock()
sys.modules["openai"].OpenAI.return_value = mock_client
mock_client.chat.completions.create.return_value.choices[0].message.content = '{"fakeEmployeeId": "p2", "reason": "High idle time and fake task usage"}'

from app.ai_engine import evaluate_players

# Mock Data
# Player 1: GOOD Employee (High accuracy, low idle, 0 fake task)
player1 = {
    "role": "GOOD",
    "typedText": "We delivered the project on time",
    "keystrokes": 35,
    "timeTakenMs": 10000,
    "submittedRealTask": True,
    "idleTime": 2,
    "fakeTaskTime": 0,
    "contextSwitchCount": 0
}

# Player 2: FAKE Employee (Low accuracy, high idle, high fake task)
player2 = {
    "role": "FAKE",
    "typedText": "We delivered...",
    "keystrokes": 15,
    "timeTakenMs": 45000, # Handled busy work
    "submittedRealTask": True, 
    "idleTime": 20,       # High idle
    "fakeTaskTime": 25,   # High fake task usage
    "contextSwitchCount": 8 # Switching a lot
}

players = {
    "p1": player1,
    "p2": player2
}

print("Running AI Evaluation with Mock Data...")
try:
    # We want to see the rule_flags generated inside the function.
    # Since we can't easily inspect local vars, we rely on the final result for now,
    # or we could monkeypatch the prompt generation if we really wanted to be sure.
    # But the mock return above "force fixes" the result.
    # To truly test the logic, we should probably inspect the arguments passed to the mock.
    
    result = evaluate_players(players)
    
    # Check what was sent to the AI
    call_args = mock_client.chat.completions.create.call_args
    if call_args:
        prompt_sent = call_args[1]['messages'][0]['content']
        print("\n--- PROMPT SENT TO AI ---")
        print(prompt_sent)
        print("-------------------------")
        
    print("\n--- AI RESULT ---")
    print(result)
    print("-----------------")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
