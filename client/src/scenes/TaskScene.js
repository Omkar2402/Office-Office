import Phaser from "phaser";
import { db, ref, onValue, update } from "../firebase";

export default class TaskScene extends Phaser.Scene {
  constructor() {
    super("TaskScene");
  }

  create() {
    /** ------------------------
     * BASIC SETUP
     * ------------------------ */
    this.roomId = "demo-room";
    this.playerId = localStorage.getItem("officeoffice_playerId");

    this.cameras.main.setBackgroundColor("#1e1e1e");

    this.add.text(400, 30, "OFFICE FLOOR", {
      fontSize: "24px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    /** ------------------------
     * DESK DEFINITIONS
     * ------------------------ */
    this.desks = [
      { id: "D1", x: 200, y: 200 },
      { id: "D2", x: 600, y: 200 },
      { id: "D3", x: 200, y: 420 },
      { id: "D4", x: 600, y: 420 }
    ];

    // Draw desks
    this.desks.forEach(desk => {
      const rect = this.add.rectangle(desk.x, desk.y, 140, 80, 0x3a3a3a);
      rect.setStrokeStyle(2, 0xf5c542);

      this.add.text(desk.x, desk.y - 55, `Desk ${desk.id}`, {
        fontSize: "14px",
        color: "#f5c542"
      }).setOrigin(0.5);
    });

    /** ------------------------
     * PLAYER STATE
     * ------------------------ */
    this.players = {};
    this.myPlayer = null;

    /** ------------------------
     * INPUT
     * ------------------------ */
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE = this.input.keyboard.addKey("E");

    /** ------------------------
     * FIREBASE LISTENER
     * ------------------------ */
    const playersRef = ref(db, `rooms/${this.roomId}/players`);

    onValue(playersRef, snapshot => {
      const data = snapshot.val() || {};
      this.syncPlayers(data);
    });

    /** ------------------------
     * UI
     * ------------------------ */
    this.hintText = this.add.text(400, 560, "", {
      fontSize: "14px",
      color: "#00ff00"
    }).setOrigin(0.5);
  }

  /** ------------------------
   * PLAYER SYNC
   * ------------------------ */
  syncPlayers(data) {
    Object.entries(data).forEach(([id, player]) => {
      if (!this.players[id]) {
        // Assign desk based on join order
        const deskIndex = Object.keys(this.players).length % this.desks.length;
        const desk = this.desks[deskIndex];

        const emoji = this.randomEmoji();

        const avatar = this.add.text(desk.x, desk.y + 10, emoji, {
          fontSize: "32px"
        }).setOrigin(0.5);

        const label = this.add.text(desk.x, desk.y - 90, "", {
          fontSize: "12px",
          color: "#ffffff",
          align: "center"
        }).setOrigin(0.5);

        this.players[id] = {
          id,
          name: player.name,
          deskId: desk.id,
          deskX: desk.x,
          deskY: desk.y,
          avatar,
          label,
          x: desk.x,
          y: desk.y
        };

        // Save desk to DB once
        update(ref(db, `rooms/${this.roomId}/players/${id}`), {
          deskId: desk.id,
          x: desk.x,
          y: desk.y,
          emoji
        });
      }

      // Update visuals
      const p = this.players[id];
      p.avatar.setPosition(player.x ?? p.x, player.y ?? p.y);
      p.label.setText(`${player.name}\nDesk ${p.deskId}`);
      p.label.setPosition(p.avatar.x, p.avatar.y - 45);

      if (id === this.playerId) {
        this.myPlayer = p;
      }
    });
  }

  /** ------------------------
   * UPDATE LOOP
   * ------------------------ */
  update() {
    if (!this.myPlayer) return;

    let moved = false;
    const speed = 2;

    if (this.cursors.left.isDown) {
      this.myPlayer.avatar.x -= speed;
      moved = true;
    }
    if (this.cursors.right.isDown) {
      this.myPlayer.avatar.x += speed;
      moved = true;
    }
    if (this.cursors.up.isDown) {
      this.myPlayer.avatar.y -= speed;
      moved = true;
    }
    if (this.cursors.down.isDown) {
      this.myPlayer.avatar.y += speed;
      moved = true;
    }

    if (moved) {
      update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), {
        x: this.myPlayer.avatar.x,
        y: this.myPlayer.avatar.y
      });
    }

    // Check distance to own desk
    const dx = this.myPlayer.avatar.x - this.myPlayer.deskX;
    const dy = this.myPlayer.avatar.y - this.myPlayer.deskY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 50) {
      this.hintText.setText("Press E to start working");
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
        this.startTask();
      }
    } else {
      this.hintText.setText("");
    }
  }

  /** ------------------------
   * TASK START
   * ------------------------ */
  startTask() {
    this.hintText.setText("📝 Task Started!");
    console.log("Task started by", this.playerId);

    // Later: open task UI / timer / submission
  }

  /** ------------------------
   * HELPERS
   * ------------------------ */
  randomEmoji() {
    const emojis = ["👩‍💻", "🧑‍💼", "👨‍💻", "🧑‍🔧", "👩‍🔧", "🧑‍🏫"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }
}
