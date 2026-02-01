import Phaser from "phaser";
import { db, ref, onValue } from "../firebase";

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  init(data) {
    this.winnerName = data?.winnerName || "Unknown";
    this.winnerRole = data?.winnerRole || "UNKNOWN";
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0a0a");
    const cam = this.cameras.main;

    this.add.text(cam.centerX, 100, "🏆 FINAL VERDICT", {
      fontSize: "48px", color: "#f5c542", fontStyle: "bold"
    }).setOrigin(0.5);

    const resultColor = this.winnerRole === "FAKE" ? "#22c55e" : "#ef4444";

    this.add.text(cam.centerX, 200, `The most voted was ${this.winnerName.toUpperCase()}`, {
      fontSize: "24px", color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(cam.centerX, 250, `ROLE: ${this.winnerRole}`, {
      fontSize: "32px", color: resultColor, fontStyle: "bold"
    }).setOrigin(0.5);

    // Win Message
    let winMessage = "";
    if (this.winnerRole === "FAKE") {
      winMessage = "AI & GOOD employees win!";
    } else {
      winMessage = "FAKE employee wins!";
    }

    this.add.text(cam.centerX, 350, winMessage, {
      fontSize: "40px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: resultColor, padding: { x: 20, y: 10 }
    }).setOrigin(0.5);

    this.add.text(cam.centerX, cam.height - 100, "Game Over. Refresh to play again.", {
      fontSize: "16px", color: "#94a3b8"
    }).setOrigin(0.5);
  }
}
