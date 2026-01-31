import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

REAL_TASK_TEXT = "We delivered the project on time"


def calculate_accuracy(expected, typed):
    if not typed:
        return 0.0

    matches = 0
    for i in range(min(len(expected), len(typed))):
        if expected[i] == typed[i]:
            matches += 1

    return matches / len(expected)


def evaluate_players(players):
    """
    players = {
      playerId: {
        typedText,
        timeTakenMs,
        keystrokes,
        submittedRealTask,
        role
      }
    }
    """

    rule_flags = {}

    # ---------- RULE BASED CHECK ----------
    for pid, data in players.items():
        accuracy = calculate_accuracy(
            REAL_TASK_TEXT,
            data.get("typedText", "")
        )

        suspicious = (
            accuracy < 0.6 or
            data.get("timeTakenMs", 99999) < 3000 or
            not data.get("submittedRealTask", False)
        )

        rule_flags[pid] = {
            "accuracy": accuracy,
            "timeTakenMs": data.get("timeTakenMs"),
            "suspicious": suspicious
        }

    # ---------- AI REASONING ----------
    prompt = f"""
You are an AI manager in a game.

Employee performance data (with rule-based flags):
{rule_flags}

Identify the FAKE employee.
Explain briefly why.
Return JSON only in this format:
{{
  "fakeEmployeeId": "<id>",
  "reason": "<short reason>"
}}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    return res.choices[0].message.content
