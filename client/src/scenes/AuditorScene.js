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
        } catch (e) {
            console.error("Failed to parse AI result:", e);
            aiResult = { fakeEmployeeId: "unknown", reason: "Analysis failed", confidence: 0 };
        }

        console.log("AI Decision:", aiResult);

        // Clear loading animation
        this.tweens.killAll();

        // Decision text
        const decisionTitle = this.add.text(0, -80, "AI AUDITOR HAS DECIDED", {
            fontSize: "24px",
            color: "#fbbf24",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const suspectText = this.add.text(0, -20, `🎯 SUSPECT: Player ${aiResult.fakeEmployeeId}`, {
            fontSize: "28px",
            color: "#ef4444",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const reasonText = this.add.text(0, 30, `Reason: ${aiResult.reason}`, {
            fontSize: "16px",
            color: "#e2e8f0",
            wordWrap: { width: 600 }
        }).setOrigin(0.5);

        const confidenceText = this.add.text(0, 70, `Confidence: ${Math.round((aiResult.confidence || 0.5) * 100)}%`, {
            fontSize: "14px",
            color: "#94a3b8",
            fontStyle: "italic"
        }).setOrigin(0.5);

        // Instruction
        const instructionText = this.add.text(0, 140, "Press ENTER to proceed to voting", {
            fontSize: "18px",
            color: "#22c55e"
        }).setOrigin(0.5);

        // Pulse animation
        this.tweens.add({
            targets: instructionText,
            alpha: 0.5,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // Add to container
        this.decisionContainer.add([decisionTitle, suspectText, reasonText, confidenceText, instructionText]);

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
