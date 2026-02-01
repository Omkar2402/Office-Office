import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Configure for FastRouter
client = OpenAI(
    api_key=os.getenv("FASTROUTER_API_KEY"),
    base_url="https://fastrouter.ai/api/v1"
)
MODEL_NAME = os.getenv("AI_MODEL_NAME", "deepseek/deepseek-r1")

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
    Multi-layer AI analysis:
    1. Rule-based flags (metrics)
    2. Behavioral pattern analysis
    3. Combined AI decision
    
    players = {
      playerId: {
        typedText, timeTakenMs, keystrokes, submittedRealTask,
        role, idleTime, fakeTaskTime, contextSwitchCount,
        timeToStart, typingRhythm: {avg, variance, count}
      }
    }
    """

    rule_flags = {}
    behavioral_flags = {}

    # ---------- RULE BASED CHECK + BEHAVIORAL ANALYSIS ----------
    for pid, data in players.items():
        # Metric Extraction
        idle_time = data.get("idleTime", 0)
        move_time = data.get("moveTime", 0)
        real_work_time = data.get("realWorkTime", 0)
        fake_work_time = data.get("fakeWorkTime", 0)
        interruptions = data.get("interruptions", 0)
        
        # Derived Metrics
        total_time = idle_time + move_time + real_work_time + fake_work_time
        work_ratio = (real_work_time + fake_work_time) / (total_time or 1)
        
        # BEHAVIORAL FLAGS
        # 1. Obvious Fake: Working on unassigned tasks
        fake_working = fake_work_time > 1.0  # Tolerance for mis-clicks
        
        # 2. Suspicious Wandering: Moving/Idle too much without working
        slacking = work_ratio < 0.3
        
        # 3. Hesitation: Many interruptions (starting/stopping work)
        hesitant = interruptions > 3
        
        # 4. "Too Perfect": No idle time, perfect efficiency (might be a bot/hard-try fake)
        robot_like = idle_time < 1.0 and interruptions == 0

        rule_flags[pid] = {
            "realWorkAndFakeWork": f"{round(real_work_time,1)}s / {round(fake_work_time,1)}s",
            "idleAndMove": f"{round(idle_time,1)}s / {round(move_time,1)}s",
            "interruptions": interruptions,
            "workRatio": round(work_ratio, 2)
        }
        
        behavioral_flags[pid] = {
            "fakeWorking": fake_working,
            "slacking": slacking,
            "hesitant": hesitant,
            "robotLike": robot_like
        }

    print(f"DEBUG: Rule Flags: {rule_flags}")
    print(f"DEBUG: Behavioral Flags: {behavioral_flags}")

    # ---------- AI REASONING WITH BEHAVIORAL CONTEXT ----------
    prompt = f"""
You are an AI auditor in 'Office Office' detecting FAKE employees.
Analyze the following player metrics to assign a 'fakenessScore' to EACH player.

METRICS DATA:
{rule_flags}

BEHAVIORAL FLAGS:
{behavioral_flags}

DETECTION LOGIC:
1. HIGH FAKENESS (>0.8):
   - Any significant 'fakeWorkTime' (working at unassigned desks).
   - High hesitation (interruptions) combined with low real work.

2. MEDIUM FAKENESS (0.4 - 0.7):
   - Slacking (low work ratio) or excessive wandering.
   - erratic behavior or trying to look busy without progress.

3. LOW FAKENESS (<0.3):
   - Consistent 'realWorkTime'.
   - Reasonable idle/move times (natural behavior).

Return JSON format:
{{
  "players": {{
    "<playerId>": {{ "fakenessScore": <0.0-1.0>, "reason": "<short explanation>" }},
    ...
  }}
}}
"""

    try:
        res = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return res.choices[0].message.content
    
    except Exception as e:
        print(f"⚠️ OpenAI API Error: {e}")
        print("📌 Using fallback rule-based detection...")
        
        # Fallback: Simple Rule Based
        fallback_result = {}
        
        for pid, flags in behavioral_flags.items():
            score = 0.1
            reason = "Normal behavior"
            
            if flags["fakeWorking"]:
                score = 0.9
                reason = "Interacted with unassigned tasks (Fake Work)"
            elif flags["slacking"]:
                score = 0.6
                reason = "Low work output and high wandering"
            elif flags["hesitant"]:
                score = 0.5
                reason = "High hesitation/interruptions"
            elif flags["robotLike"]:
                score = 0.4
                reason = "Suspiciously mechanical efficiency"
                
            fallback_result[pid] = {
                "fakenessScore": score,
                "reason": reason + " (fallback)"
            }
        
        import json
        return json.dumps({"players": fallback_result})