import Phaser from "phaser";
import { db, ref, onValue, set } from "../firebase";

export default class AuditorScene extends Phaser.Scene {
    constructor() {
        super("AuditorScene");
    }

    create() {
        this.cameras.main.setBackgroundColor("#0a0a0a");

        const roomId = "demo-room";
        this.playerId = localStorage.getItem("officeoffice_playerId");

        // Title
        this.add.text(400, 100, "🤖 AI AUDITOR ANALYSIS", {
            fontSize: "36px",
            color: "#ef4444",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Analyzing message
        const analyzingText = this.add.text(400, 200, "Analyzing employee behavior...", {
            fontSize: "20px",
            color: "#94a3b8"
        }).setOrigin(0.5);

        // Loading animation
        this.tweens.add({
            targets: analyzingText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Decision container (hidden initially)
        this.decisionContainer = this.add.container(400, 320);
        this.decisionContainer.setAlpha(0);

        // Listen for players list to get names
        const playersRef = ref(db, `rooms/${roomId}/players`);
        onValue(playersRef, snap => {
            this.playerNamesMap = {};
            const players = snap.val() || {};
            Object.entries(players).forEach(([id, data]) => {
                this.playerNamesMap[id] = data.name || id;
            });
        });

        // Listen for AI result
        const gameStateRef = ref(db, `rooms/${roomId}/gameState`);
        onValue(gameStateRef, snapshot => {
            const gameState = snapshot.val();
            if (gameState && gameState.aiResult) {
                // Wait slightly for playerNamesMap if not yet ready
                if (!this.playerNamesMap) {
                    this.time.delayedCall(500, () => this.showAIDecision(gameState.aiResult));
                } else {
                    this.showAIDecision(gameState.aiResult);
                }
            }
        });
    }

    showAIDecision(aiResultJson) {
        if (this.showingDecision) return;
        this.showingDecision = true;

        // Parse AI result
        let aiResult;
        try {
            aiResult = JSON.parse(aiResultJson);
            if (!aiResult.players) throw new Error("Invalid AI format");
        } catch (e) {
            console.error("Failed to parse AI result:", e);
            aiResult = { players: {} };
        }

        console.log("AI Decision:", aiResult);

        // Clear loading animation
        this.tweens.killAll();
        // Remove "analyzing" text
        this.children.list.forEach(child => {
            if (child.text && child.text.includes("Analyzing")) child.destroy();
        });

        const decisionTitle = this.add.text(0, -150, "🤖 AI METRICS REPORT", {
            fontSize: "28px", color: "#fbbf24", fontStyle: "bold"
        }).setOrigin(0.5);
        this.decisionContainer.add(decisionTitle);

        // Display Scores
        let yOffset = -100;
        Object.entries(aiResult.players).forEach(([pid, data], index) => {
            const score = data.fakenessScore || 0;
            const barWidth = 400;
            const filledWidth = barWidth * score;
            const color = score > 0.7 ? 0xef4444 : (score > 0.4 ? 0xf59e0b : 0x22c55e);

            // Name - RESOLVE FROM MAP
            const displayName = this.playerNamesMap ? (this.playerNamesMap[pid] || pid) : pid;
            const nameText = this.add.text(-200, yOffset, displayName, {
                fontSize: "18px", color: "#ffffff", fontStyle: "bold"
            }).setOrigin(0, 0.5);

            // Bar Bg
            const barBg = this.add.rectangle(0, yOffset + 25, barWidth, 10, 0x333333).setOrigin(0.5);
            // Bar Fill
            const barFill = this.add.rectangle(-200, yOffset + 25, filledWidth, 10, color).setOrigin(0, 0.5);

            // Label
            const scoreText = this.add.text(220, yOffset + 25, `${Math.round(score * 100)}% Fake`, {
                fontSize: "14px", color: "#cccccc"
            }).setOrigin(0, 0.5);

            // Reason
            const reasonText = this.add.text(0, yOffset + 45, data.reason, {
                fontSize: "12px", color: "#94a3b8", fontStyle: "italic"
            }).setOrigin(0.5);

            this.decisionContainer.add([nameText, barBg, barFill, scoreText, reasonText]);
            yOffset += 80;
        });

        // Instruction
        const instructionText = this.add.text(0, 200, "Press ENTER to proceed to voting", {
            fontSize: "18px", color: "#22c55e"
        }).setOrigin(0.5);

        this.tweens.add({
            targets: instructionText, alpha: 0.5, duration: 600, yoyo: true, repeat: -1
        });
        this.decisionContainer.add(instructionText);

        // Fade in decision
        this.tweens.add({
            targets: this.decisionContainer,
            alpha: 1,
            duration: 1000,
            delay: 500,
            onComplete: () => this.showVotingUI()
        });
    }

    showVotingUI() {
        const cam = this.cameras.main;
        const roomId = "ok-room";

        // Create HTML Input for voting
        this.voteInput = this.add.dom(cam.centerX, cam.height - 150, 'input', {
            type: 'text',
            placeholder: 'Type Employee Name to Vote...',
            width: '300px',
            padding: '10px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '2px solid #ef4444',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            textAlign: 'center'
        });

        const voteBtn = this.add.rectangle(cam.centerX, cam.height - 80, 200, 40, 0xef4444)
            .setInteractive({ useHandCursor: true });

        const voteBtnText = this.add.text(cam.centerX, cam.height - 80, "SUBMIT VOTE", {
            fontSize: "18px", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0.5);

        voteBtn.on("pointerdown", () => {
            const votedName = this.voteInput.node.value.trim();
            if (!votedName) return alert("Please enter a name!");

            set(ref(db, `rooms/${roomId}/votes/${this.playerId}`), votedName);

            voteBtn.destroy();
            voteBtnText.destroy();
            this.voteInput.destroy();
            this.add.text(cam.centerX, cam.height - 100, "Waiting for others to vote...", {
                fontSize: "18px", color: "#94a3b8"
            }).setOrigin(0.5);
        });

        // Listen for all votes
        const votesRef = ref(db, `rooms/${roomId}/votes`);
        const playersRef = ref(db, `rooms/${roomId}/players`);

        onValue(votesRef, (voteSnap) => {
            const votes = voteSnap.val() || {};
            onValue(playersRef, (playerSnap) => {
                const players = playerSnap.val() || {};
                const voteCount = Object.keys(votes).length;
                const playerCount = Object.keys(players).length;

                if (voteCount >= playerCount && playerCount > 0) {
                    this.calculateAndShowResult(votes, players);
                }
            }, { onlyOnce: true });
        });
    }

    calculateAndShowResult(votes, players) {
        const roomId = "ok-room";

        // Count votes per name
        const tallies = {};
        Object.values(votes).forEach(name => {
            tallies[name] = (tallies[name] || 0) + 1;
        });

        // Find most voted name
        let winnerName = null;
        let maxVotes = -1;
        Object.entries(tallies).forEach(([name, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                winnerName = name;
            }
        });

        // Find role of winnerName
        let winnerRole = "UNKNOWN";
        Object.values(players).forEach(p => {
            if (p.name.toLowerCase() === winnerName.toLowerCase()) {
                winnerRole = p.role;
            }
        });

        // Go to ResultScene with data
        this.scene.start("ResultScene", { winnerName, winnerRole });
    }
}
