import Phaser from "phaser";
import { db, ref, set } from "../firebase";

export default class TaskScene extends Phaser.Scene {
  constructor() {
    super("TaskScene");
  }

  create() {
    this.add.text(100, 50, "Do your tasks!");

    this.tasksCompleted = 0;
    this.activeTime = 0;
    this.idleTime = 0;

    // Fake task button
    this.add.text(100, 120, "COMPLETE TASK")
      .setInteractive()
      .on("pointerdown", () => {
        this.tasksCompleted++;
      });

    // Simple timer (30 sec task phase)
    this.time.delayedCall(30000, () => {
      this.submitTaskData();
      this.scene.start("VotingScene");
    });
  }

  submitTaskData() {
    const playerId = "player1"; // later from auth
    set(
      ref(db, `rooms/demo-room/tasks/${playerId}`),
      {
        tasksCompleted: this.tasksCompleted,
        activeTime: 20,
        idleTime: 10
      }
    );
  }
}
