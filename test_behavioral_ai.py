# Mock OpenAI before import
from unittest.mock import MagicMock
import sys
import json

# Mock modules
sys.modules["openai"] = MagicMock()
sys.modules["dotenv"] = MagicMock()

# Setup Mock Client
mock_client = MagicMock()
sys.modules["openai"].OpenAI.return_value = mock_client

# Add backend directory to path
sys.path.append("backend")
from app.ai_engine import evaluate_players

print("=" * 60)
print("BEHAVIORAL ANALYSIS TEST")
print("=" * 60)

# Test Case 1: OBVIOUS FAKE (Saboteur)
print("\n📋 TEST 1: Saboteur Strategy (Obvious)")
print("-" * 60)

mock_client.chat.completions.create.return_value.choices[0].message.content = json.dumps({
    "fakeEmployeeId": "p2",
    "reason": "Low accuracy (20%) and high fake task time (40s)",
    "confidence": 0.95
})

players_test1 = {
    "p1": {
        "role": "GOOD",
        "typedText": "We delivered the project on time",
        "keystrokes": 34,
        "timeTakenMs": 12000,
        "submittedRealTask": True,
        "idleTime": 3,
        "fakeTaskTime": 0,
        "contextSwitchCount": 0,
        "timeToStart": 1200,
        "typingRhythm": {"avg": 350, "variance": 280, "count": 33}
    },
    "p2": {  # FAKE - Saboteur
        "role": "FAKE",
        "typedText": "We del",
        "keystrokes": 8,
        "timeTakenMs": 55000,
        "submittedRealTask": True,
        "idleTime": 5,
        "fakeTaskTime": 40,
        "contextSwitchCount": 2,
        "timeToStart": 500,
        "typingRhythm": {"avg": 450, "variance": 320, "count": 7}
    }
}

result1 = evaluate_players(players_test1)
print("\n✅ Result:", result1)

# Test Case 2: PERFECT COVER (Too Perfect)
print("\n\n📋 TEST 2: Perfect Cover Strategy (Too Perfect)")
print("-" * 60)

mock_client.chat.completions.create.return_value.choices[0].message.content = json.dumps({
    "fakeEmployeeId": "p2",
    "reason": "Accuracy 98% with unnatural typing rhythm (variance 45)",
    "confidence": 0.75
})

players_test2 = {
    "p1": {
        "role": "GOOD",
        "typedText": "We deliverad the project on time",  # Natural typo
        "keystrokes": 36,
        "timeTakenMs": 14000,
        "submittedRealTask": True,
        "idleTime": 4,
        "fakeTaskTime": 0,
        "contextSwitchCount": 0,
        "timeToStart": 800,
        "typingRhythm": {"avg": 380, "variance": 250, "count": 35}
    },
    "p2": {  # FAKE - Perfect Cover (TOO PERFECT)
        "role": "FAKE",
        "typedText": "We delivered the project on tiem",  # 98% accurate, trying too hard
        "keystrokes": 35,
        "timeTakenMs": 16000,
        "submittedRealTask": True,
        "idleTime": 2,
        "fakeTaskTime": 3,  # Brief fake task check
        "contextSwitchCount": 1,
        "timeToStart": 3500,  # Hesitation
        "typingRhythm": {"avg": 320, "variance": 45, "count": 34}  # Too consistent!
    }
}

result2 = evaluate_players(players_test2)
print("\n✅ Result:", result2)

# Test Case 3: SUBTLE SLACKER
print("\n\n📋 TEST 3: Subtle Slacker Strategy (Medium)")
print("-" * 60)

mock_client.chat.completions.create.return_value.choices[0].message.content = json.dumps({
    "fakeEmployeeId": "p2",
    "reason": "Moderate accuracy (55%) with significant fake task time (22s)",
    "confidence": 0.68
})

players_test3 = {
    "p1": {
        "role": "GOOD",
        "typedText": "We delivered teh project on time",
        "keystrokes": 34,
        "timeTakenMs": 11000,
        "submittedRealTask": True,
        "idleTime": 2,
        "fakeTaskTime": 0,
        "contextSwitchCount": 0,
        "timeToStart": 1000,
        "typingRhythm": {"avg": 325, "variance": 210, "count": 33}
    },
    "p2": {  # FAKE - Slacker
        "role": "FAKE",
        "typedText": "We delivrd the projt on",
        "keystrokes": 26,
        "timeTakenMs": 35000,
        "submittedRealTask": True,
        "idleTime": 8,
        "fakeTaskTime": 22,
        "contextSwitchCount": 5,
        "timeToStart": 2000,
        "typingRhythm": {"avg": 400, "variance": 180, "count": 25}
    }
}

result3 = evaluate_players(players_test3)
print("\n✅ Result:", result3)

print("\n" + "=" * 60)
print("BEHAVIORAL FLAGS CHECK")
print("=" * 60)

# Check what AI saw in last call
call_args = mock_client.chat.completions.create.call_args
if call_args:
    prompt = call_args[1]['messages'][0]['content']
    print("\n📊 Last prompt sent to AI (truncated):")
    print(prompt[:800] + "...")

print("\n✅ All tests completed!")
