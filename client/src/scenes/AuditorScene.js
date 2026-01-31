import Phaser from "phaser";
import { db, ref, onValue } from "../firebase";

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

        // Listen for AI result
        const gameStateRef = ref(db, `rooms/${roomId}/gameState`);

        onValue(gameStateRef, snapshot => {
            const gameState = snapshot.val();

            if (gameState && gameState.aiResult) {
                this.showAIDecision(gameState.aiResult);
            }
        });
    }

    showAIDecision(aiResultJson) {
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
        // Remove "analyzing" text if it's not part of container
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

            // Name
            const nameText = this.add.text(-200, yOffset, `Player ${pid}`, {
                fontSize: "18px", color: "#ffffff"
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
            delay: 500
        });

        // Enable Enter key
        this.input.keyboard.once("keydown-ENTER", () => {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start("VotingScene");
            });
        });
    }
}
