import Phaser from "phaser";
import { db, ref, set } from "../firebase";

export default class StrategyScene extends Phaser.Scene {
    constructor() {
        super("StrategyScene");
    }

    create() {
        this.cameras.main.setBackgroundColor("#0f172a");

        const roomId = "demo-room";
        this.playerId = localStorage.getItem("officeoffice_playerId");

        // Title
        this.add.text(400, 80, "🕵️ Choose Your Strategy", {
            fontSize: "32px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(400, 130, "Pick how you'll FAKE being productive:", {
            fontSize: "18px",
            color: "#94a3b8"
        }).setOrigin(0.5);

        // Strategy options
        const strategies = [
            {
                id: "saboteur",
                name: "🔥 Saboteur",
                desc: "Ignore real work, have fun with fake tasks",
                risk: "⚠️ HIGH detection risk (~80%)",
                color: 0xef4444
            },
            {
                id: "slacker",
                name: "😎 Subtle Slacker",
                desc: "Balance real work with fake tasks",
                risk: "⚠️ MEDIUM detection risk (~50%)",
                color: 0xf59e0b
            },
            {
                id: "perfect",
                name: "🕵️ Perfect Cover",
                desc: "Do real task perfectly, minimal fake work",
                risk: "⚠️ RISKY: AI detects 'too perfect' patterns",
                color: 0x3b82f6
            }
        ];

        let yPos = 200;
        strategies.forEach(strategy => {
            this.createStrategyButton(strategy, 400, yPos);
            yPos += 120;
        });

        // Info text
        this.add.text(400, 550, "Your choice affects gameplay, not just difficulty!", {
            fontSize: "14px",
            color: "#64748b",
            fontStyle: "italic"
        }).setOrigin(0.5);
    }

    createStrategyButton(strategy, x, y) {
        const container = this.add.container(x, y);

        // Button background
        const bg = this.add.rectangle(0, 0, 500, 100, strategy.color, 0.2);
        bg.setStrokeStyle(2, strategy.color);
        bg.setInteractive({ useHandCursor: true });

        // Strategy name
        const name = this.add.text(0, -25, strategy.name, {
            fontSize: "22px",
            color: "#ffffff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Description
        const desc = this.add.text(0, 5, strategy.desc, {
            fontSize: "14px",
            color: "#e2e8f0"
        }).setOrigin(0.5);

        // Risk level
        const risk = this.add.text(0, 30, strategy.risk, {
            fontSize: "12px",
            color: "#fbbf24",
            fontStyle: "italic"
        }).setOrigin(0.5);

        container.add([bg, name, desc, risk]);

        // Hover effects
        bg.on("pointerover", () => {
            bg.setFillStyle(strategy.color, 0.4);
            this.tweens.add({
                targets: container,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100
            });
        });

        bg.on("pointerout", () => {
            bg.setFillStyle(strategy.color, 0.2);
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        // Click handler
        bg.on("pointerdown", () => {
            this.selectStrategy(strategy.id);
        });
    }

    selectStrategy(strategyId) {
        console.log("Selected strategy:", strategyId);

        // Save strategy to Firebase
        const roomId = "demo-room";
        set(ref(db, `rooms/${roomId}/players/${this.playerId}/strategy`), strategyId);

        // Flash feedback
        this.cameras.main.flash(300);

        // Proceed to work scene
        this.time.delayedCall(500, () => {
            this.scene.start("WorkScene");
        });
    }
}
