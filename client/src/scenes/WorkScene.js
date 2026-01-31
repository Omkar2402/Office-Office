import Phaser from "phaser";
import { db, ref, set, onValue } from "../firebase";

export default class WorkScene extends Phaser.Scene {
  constructor() {
    super("WorkScene");
  }

  create() {
    console.log("DOM container:", this.sys.game.domContainer);

  if (!this.sys.game.domContainer) {
    alert("DOM NOT ENABLED – CHECK GAME CONFIG");
    return;
  }

    const roomId = "demo-room";
    const playerId = localStorage.getItem("officeoffice_playerId");

    this.startTime = Date.now();
    this.keystrokes = 0;
    this.submitted = false;

    // Background
    this.add.rectangle(400, 300, 800, 600, 0x0f172a);

    // Laptop screen
    this.add.rectangle(400, 300, 600, 380, 0x020617);
    this.add.text(400, 120, "💻 WORK TERMINAL", {
      fontSize: "22px",
      color: "#22c55e"
    }).setOrigin(0.5);

    // Fetch role
    const roleRef = ref(db, `rooms/${roomId}/players/${playerId}/role`);

    onValue(roleRef, snap => {
      const role = snap.val();
      if (!role) return;
      this.renderTask(role, roomId, playerId);
    }, { onlyOnce: true });
  }

  renderTask(role, roomId, playerId) {
    const realTask = "Type exactly: We delivered the project on time";
    const fakeTask = "Write a fake status update (any text)";

    // Real Task
    this.add.text(400, 180, "REAL TASK:", { color: "#ffffff" }).setOrigin(0.5);
    this.add.text(400, 205, realTask, {
      fontSize: "16px",
      color: "#38bdf8",
      wordWrap: { width: 520 }
    }).setOrigin(0.5);

    // Fake Task (only FAKE)
    if (role === "FAKE") {
      this.add.text(400, 245, "FAKE TASK (MANDATORY):", {
        color: "#fb7185"
      }).setOrigin(0.5);

      this.fakeInput = this.add.dom(400, 275, "input", {
        width: "500px",
        padding: "8px"
      });
    }

    // Input box
    this.inputBox = this.add.dom(400, 320, "input", {
      width: "500px",
      padding: "8px"
    });

    this.inputBox.node.addEventListener("keydown", () => {
      this.keystrokes++;
    });

    // Submit button
    const btn = this.add.rectangle(400, 380, 160, 40, 0x22c55e)
      .setInteractive({ useHandCursor: true });

    this.add.text(400, 380, "SUBMIT", {
      color: "#000",
      fontStyle: "bold"
    }).setOrigin(0.5);

    btn.on("pointerdown", () => {
      if (this.submitted) return;
      this.submitted = true;

      const endTime = Date.now();
      const typedText = this.inputBox.node.value;
      const fakeText = this.fakeInput ? this.fakeInput.node.value : "";

      const metrics = {
        role,
        typedText,
        fakeText,
        keystrokes: this.keystrokes,
        timeTakenMs: endTime - this.startTime,
        submittedRealTask: typedText.length > 0
      };
      console.log("Task submitted:", metrics);
      console.log("Player ID:", playerId);
      console.log("Room ID:", roomId);
      set(ref(db, `rooms/${roomId}/metrics/${playerId}`), metrics);

      this.scene.start("TaskScene");
    });
  }
}
