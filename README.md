# Office Office - MVP Project Walkthrough

## Overview
**Office Office** is a real-time multiplayer social deduction game. Players are office employees; most are **Genuine**, but one is a **Fake** employee. The goal of the Genuine employees is to do tasks and identify the imposter, while the Fake employee tries to blend in. An **AI Auditor** analyzes movement and work patterns to help the players decide.

## Simplified Game Flow
The game follows a linear progression through five main scenes:

1.  **Lobby ([LobbyScene.js](file:///c:/Users/udaym/OneDrive/Documents/OfficeOffice/Office-Office/client/src/scenes/LobbyScene.js))**: Users join a room (`demo-room`). The first player becomes the Host and can start the game.
2.  **Role Reveal ([RoleScene.js](file:///c:/Users/udaym/OneDrive/Documents/OfficeOffice/Office-Office/client/src/scenes/RoleScene.js))**: Players are assigned either "GOOD" or "FAKE". This screen builds tension before work begins.
3.  **The Office ([TaskScene.js](file:///c:/Users/udaym/OneDrive/Documents/OfficeOffice/Office-Office/client/src/scenes/TaskScene.js))**: 
    *   Players move around a top-down office map.
    *   **Genuine Employees**: Have assigned desks/tasks (e.g., uploading files).
    *   **Fake Employees**: Can "fake work" at any desk or printer to look busy.
    *   **Metrics**: The game tracks `idleTime`, `moveTime`, `realWorkTime`, `fakeWorkTime`, and `interruptions`.
4.  **AI Analysis ([AuditorScene.js](file:///c:/Users/udaym/OneDrive/Documents/OfficeOffice/Office-Office/client/src/scenes/AuditorScene.js))**: 
    *   The AI evaluates the behavioral metrics collected in the Task phase.
    *   It presents a "Fakeness Score" report for every player with a specific reason for its suspicion.
    *   **Voting**: Players use an on-screen input to vote for the person they think is the imposter.
5.  **Final Verdict ([ResultScene.js](file:///c:/Users/udaym/OneDrive/Documents/OfficeOffice/Office-Office/client/src/scenes/ResultScene.js))**: The most voted player is revealed. If they were the FAKE, the Genuine team wins. Otherwise, the FAKE wins.

## Tech Stack
*   **Frontend**: Phaser 3 (Game Engine), Vite (Build Tool).
*   **Backend**: FastAPI (Python), OpenAI/FastRouter (AI Analysis).
*   **Real-time DB**: Firebase Realtime Database (State sync & Metrics).

## Core AI Logic ([ai_engine.py](file:///c:/Users/udaym/OneDrive/Documents/OfficeOffice/Office-Office/backend/app/ai_engine.py))
The AI doesn't just look for "wrong" answers; it analyzes **behavioral patterns**:
*   **Fake Working**: Significant time spent at unassigned stations.
*   **Slacking**: Low work output relative to movement.
*   **Hesitation**: High frequency of starting and stopping tasks (interruptions).
*   **Roboticism**: Suspiciously perfect timing with zero idle time.

## How to Run

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Activate the virtual environment
.\venv\Scripts\activate  # Windows
source venv/bin/activate # macOS/Linux

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```


### AI Impact Statement

In Office Office, AI acts as an in‑game auditor that analyzes player behavior during a multiplayer social deduction game to estimate the likelihood of each player being “fake.” The system uses lightweight behavioral models (rule-based scoring + optional LLM-assisted pattern reasoning via FastRouter models like GPT‑4o‑mini/DeepSeek) to evaluate movement patterns, task choices, idle time, and task consistency—chosen for fast inference, low cost, and explainability rather than real-world surveillance accuracy. All data is generated entirely within the game session (player positions, task events, timestamps) and stored temporarily in Firebase Realtime Database; no real personal, biometric, or external user data is collected, and all assets/code are original or open-source compliant. To mitigate bias and hallucination, the AI is intentionally designed to be imperfect: prediction scores are kept close, randomized noise is injected, and the AI’s output is advisory rather than authoritative, with final decisions driven by human voting. Guardrails prevent deterministic outcomes or labeling players as “bad,” framing results as probabilities within a game context. Expected outcomes include higher player engagement, replayability, and social interaction, while maintaining safety, fairness, and transparency. From a business and user perspective, the AI enhances fun, tension, and discussion without creating real-world judgments or risks.