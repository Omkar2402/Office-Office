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
        accuracy = calculate_accuracy(
            REAL_TASK_TEXT,
            data.get("typedText", "")
        )

        # Metrics
        idle_time = data.get("idleTime", 0)
        fake_time = data.get("fakeTaskTime", 0)
        switches = data.get("contextSwitchCount", 0)
        fake_interactions = data.get("fakeInteractions", 0)
        
        # Behavioral data
        time_to_start = data.get("timeToStart", 0)
        typing_rhythm = data.get("typingRhythm", {})
        rhythm_variance = typing_rhythm.get("variance", 999)
        
        # BEHAVIORAL FLAGS
        # 1. "Too Perfect" Detection
        too_perfect = accuracy > 0.95 and rhythm_variance < 100
        
        # 2. Suspicious Start (hesitation before committing)
        suspicious_start = time_to_start > 3000  # >3s delay
        
        # 3. Unnatural consistency (robot-like typing)
        too_consistent = rhythm_variance < 50 and typing_rhythm.get("count", 0) > 10
        
        # 4. Any fake task interaction reveals intent
        touched_fake_task = fake_time > 0 or fake_interactions > 0

        # Traditional suspicious flags
        traditional_suspicious = (
            accuracy < 0.5 or
            idle_time > 20 or
            fake_time > 15
        )
        
        # Combined suspicion
        suspicious = traditional_suspicious or too_perfect or touched_fake_task

        rule_flags[pid] = {
            "accuracy": round(accuracy, 2),
            "timeTakenMs": data.get("timeTakenMs"),
            "idleTime": idle_time,
            "fakeTaskTime": fake_time,
            "contextSwitches": switches,
            "fakeInteractions": fake_interactions,
            "suspicious": suspicious
        }
        
        behavioral_flags[pid] = {
            "timeToStart": time_to_start,
            "typingRhythmVariance": rhythm_variance,
            "tooPerfect": too_perfect,
            "tooConsistent": too_consistent,
            "suspiciousStart": suspicious_start,
            "touchedFakeTask": touched_fake_task
        }

    print(f"DEBUG: Rule Flags: {rule_flags}")
    print(f"DEBUG: Behavioral Flags: {behavioral_flags}")

    # ---------- AI REASONING WITH BEHAVIORAL CONTEXT ----------
    prompt = f"""
You are an AI auditor in 'Office Office' detecting a FAKE employee among GOOD ones.

METRICS DATA:
{rule_flags}

BEHAVIORAL PATTERNS:
{behavioral_flags}

DETECTION FRAMEWORK:

1. OBVIOUS FAKE (High Confidence):
   - Low accuracy (<50%) + high fake task time (>15s)
   - High idle time (>20s) + barely any typing
   - Touched fake task for >10s

2. "TOO PERFECT" FAKE (Medium Confidence):
   - Accuracy >95% with unnatural typing rhythm (variance <100)
   - Suspiciously consistent keystrokes (variance <50, acting like a robot)
   - Delayed start (>3s hesitation) then perfect execution

3. GENUINELY GOOD (Exclude):
   - 80-95% accuracy with natural typing variance (100-500)
   - Started quickly (<2s)
   - Zero fake task interaction
   - Natural rhythm with mistakes/corrections

CRITICAL RULES:
- ANY fake task interaction (even 1s) proves FAKE intent
- Being "too perfect" is MORE suspicious than having typos
- Humans have typing variance 100-500ms; <50 is robot-like
- FAKE players on "Perfect Cover" strategy try too hard to be perfect

Return JSON:
{{
  "fakeEmployeeId": "<playerId>",
  "reason": "<brief detection method (1 sentence)>",
  "confidence": <0.0-1.0>
}}
"""

    try:
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return res.choices[0].message.content
    
    except Exception as e:
        print(f"⚠️ OpenAI API Error: {e}")
        print("📌 Using fallback rule-based detection...")
        
        # Fallback: Rule-based detection with randomness for game balance
        most_suspicious_id = None
        max_suspicion = 0
        
        for pid, flags in rule_flags.items():
            # Calculate suspicion score
            score = 0
            if flags["suspicious"]:
                score += 50
            if behavioral_flags[pid]["touchedFakeTask"]:
                score += 30
            if behavioral_flags[pid]["tooPerfect"]:
                score += 20
            
            # Add random noise (±10 points) to make AI fallible
            import random
            score += random.randint(-10, 10)
            
            if score > max_suspicion:
                max_suspicion = score
                most_suspicious_id = pid
        
        # Determine reason
        b_flags = behavioral_flags.get(most_suspicious_id, {})
        if b_flags.get("touchedFakeTask"):
            reason = "Interacted with fake task (rule-based detection)"
        elif b_flags.get("tooPerfect"):
            reason = "Too perfect typing pattern (rule-based detection)"
        else:
            reason = "Suspicious metrics detected (rule-based detection)"
        
        # Vary confidence based on score (60-85%)
        confidence = min(0.85, max(0.55, max_suspicion / 100))
        
        import json
        return json.dumps({
            "fakeEmployeeId": most_suspicious_id or "unknown",
            "reason": reason,
            "confidence": round(confidence, 2)
        })
