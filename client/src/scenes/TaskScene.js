import Phaser from "phaser";
import { db, ref, onValue, set } from "../firebase";

const ROOM_ID = "demo-room";

// Desk positions (shared contract with backend)
const DESKS = [
  { id: 1, x: 200, y: 180 },
  { id: 2, x: 600, y: 180 },
  { id: 3, x: 200, y: 380 },
  { id: 4, x: 600, y: 380 }
];

export default class TaskScene extends Phaser.Scene {
  constructor() {
    super("TaskScene");
  }

  create() {
    // =========================
    // BASIC SETUP
    // =========================
    this.cameras.main.setBackgroundColor("#1e1e1e");

    this.playerId = localStorage.getItem("officeoffice_playerId");
    this.playerName = localStorage.getItem("officeoffice_playerName");

    // Title
    this.add.text(400, 20, "OFFICE FLOOR", {
      fontSize: "24px",
      color: "#f5c542",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // =========================
    // DRAW DESKS
    // =========================
    this.desks = [];

    DESKS.forEach(desk => {
      const deskBox = this.add.rectangle(desk.x, desk.y, 120, 80, 0x2a2a2a);
      this.add.text(desk.x, desk.y - 40, `Desk ${desk.id}`, {
        fontSize: "12px",
        color: "#aaaaaa"
      }).setOrigin(0.5);

      this.desks.push({ ...desk, rect: deskBox });
    });

    // =========================
    // PLAYER AVATAR
    // =========================
    this.player = this.add.rectangle(400, 520, 30, 30, 0x4aa3ff);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // =========================
    // CONTROLS
    // =========================
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.E
    );

    // =========================
    // UI TEXT
    // =========================
    this.hintText = this.add.text(400, 560, "", {
      fontSize: "14px",
      color: "#ffffff"
    }).setOrigin(0.5);

    // =========================
    // FIREBASE: DESK ASSIGNMENT
    // =========================
    this.myDeskId = null;

    const deskRef = ref(db, `rooms/${ROOM_ID}/players/${this.playerId}/deskId`);
    onValue(deskRef, snap => {
      this.myDeskId = snap.val();
    });

    // =========================
    // FIREBASE: POSITION SYNC
    // =========================
    this.posRef = ref(
      db,
      `rooms/${ROOM_ID}/players/${this.playerId}/pos`
    );

    // Save position every 300ms
    this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        set(this.posRef, {
          x: Math.round(this.player.x),
          y: Math.round(this.player.y)
        });
      }
    });
  }

  update() {
    if (!this.player.body) return;

    // =========================
    // PLAYER MOVEMENT
    // =========================
    const speed = 200;
    this.player.body.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.body.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.body.setVelocityY(speed);
    }

    // =========================
    // DESK INTERACTION CHECK
    // =========================
    this.checkDeskProximity();
  }

  checkDeskProximity() {
    if (!this.myDeskId) {
      this.hintText.setText("Waiting for desk assignment...");
      return;
    }

    const myDesk = this.desks.find(d => d.id === this.myDeskId);
    if (!myDesk) return;

    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      myDesk.x,
      myDesk.y
    );

    if (dist < 60) {
      this.hintText.setText("Press E to start working");

      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        this.startWorking();
      }
    } else {
      this.hintText.setText("");
    }
  }

  startWorking() {
    // Visual feedback only (backend logic handled by Member B)
    this.hintText.setText("💻 Working...");
    this.player.setFillStyle(0x2ecc71);

    set(
      ref(db, `rooms/${ROOM_ID}/players/${this.playerId}/isWorking`),
      true
    );
  }
}
