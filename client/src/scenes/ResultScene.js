import Phaser from "phaser";
import { db, ref, onValue } from "../firebase";

export default class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create() {
    this.add.text(100, 50, "Game Result");

    const resultRef = ref(db, "rooms/demo-room/gameState/result");
    onValue(resultRef, snap => {
      if (snap.exists()) {
        this.add.text(100, 100, snap.val());
      } else {
        this.add.text(100, 100, "AI Wins (Demo)");
      }
    });
  }
}
