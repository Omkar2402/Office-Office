import Phaser from "phaser";
import { db, ref, onValue, set } from "../firebase";

export default class VotingScene extends Phaser.Scene {
  constructor() {
    super("VotingScene");
  }

  create() {
    this.add.text(100, 50, "AI has identified a suspect!");

    const aiRef = ref(db, "rooms/demo-room/gameState/aiResult");
    onValue(aiRef, snap => {
      if (snap.exists()) {
        this.add.text(100, 100, snap.val());
      }
    });

    // Vote button (hardcoded for MVP)
    this.add.text(100, 160, "VOTE AI IS RIGHT")
      .setInteractive()
      .on("pointerdown", () => {
        set(ref(db, "rooms/demo-room/votes/player1"), "AI");
        this.scene.start("ResultScene");
      });
  }
}
