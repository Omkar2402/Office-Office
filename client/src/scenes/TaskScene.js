import Phaser from "phaser";
import { db, ref, onValue, update } from "../firebase";

export default class TaskScene extends Phaser.Scene {
  constructor() {
    super("TaskScene");
  }

  preload() {
    // Only load the map background
    this.load.image('office_map', '/office_map_topdown_1769879446227.png');
  }

  create() {
    console.log("🎮 TaskScene create() started - EMOJI VERSION");

    this.roomId = "demo-room";
    this.playerId = localStorage.getItem("officeoffice_playerId");

    // Add office map as background
    const map = this.add.image(0, 0, 'office_map');
    map.setOrigin(0, 0);

    // Scale to fit screen
    const scaleX = this.cameras.main.width / map.width;
    const scaleY = this.cameras.main.height / map.height;
    const scale = Math.min(scaleX, scaleY);
    map.setScale(scale);

    // Center the map
    this.mapOffsetX = (this.cameras.main.width - map.width * scale) / 2;
    this.mapOffsetY = (this.cameras.main.height - map.height * scale) / 2;
    map.x = this.mapOffsetX;
    map.y = this.mapOffsetY;
    this.mapScale = scale;

    // Title
    this.add.text(this.cameras.main.centerX, 40, "🏢 OFFICE OFFICE", {
      fontSize: "32px",
      color: "#000000",
      fontStyle: "bold",
      backgroundColor: "#ffffff",
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Instructions
    this.instructionsText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.height - 40,
      "Arrow keys to move",
      {
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "#000000",
        padding: { x: 10, y: 5 }
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    // Desk Definitions (Relative to map image)
    this.desks = [
      { id: "D1", laptopX: 180, laptopY: 130, spawnX: 120, spawnY: 130 },
      { id: "D2", laptopX: 400, laptopY: 130, spawnX: 240, spawnY: 130 },
      { id: "D3", laptopX: 240, laptopY: 400, spawnX: 120, spawnY: 250 },
      { id: "D4", laptopX: 310, laptopY: 400, spawnX: 240, spawnY: 250 },
      { id: "D5", laptopX: 180, laptopY: 540, spawnX: 120, spawnY: 370 },
      { id: "D6", laptopX: 310, laptopY: 600, spawnX: 240, spawnY: 370 }
    ];

    this.players = {};
    this.myPlayer = null;
    this.transitioningToAuditor = false;

    // Create desk collision zones
    this.createDeskZones();

    // Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyE = this.input.keyboard.addKey('E');

    // Firebase Listener
    const playersRef = ref(db, `rooms/${this.roomId}/players`);
    onValue(playersRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        this.syncPlayers(data);
        this.checkAllSubmitted(data);
      }
    });

    this.ensureLocalPlayer();

    // UI Rectangle (Bottom Right)
    const cam = this.cameras.main;
    this.add.rectangle(cam.width - 150, cam.height - 100, 300, 200, 0x111111)
      .setScrollFactor(0)
      .setDepth(100);

    this.taskDisplay = this.add.text(cam.width - 280, cam.height - 180, "Loading...", {
      fontSize: "18px", fill: "#ffffff", wordWrap: { width: 280 }
    }).setScrollFactor(0).setDepth(101);

    // Fetch Role & Assign Task
    const roleRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}/role`);
    onValue(roleRef, (snap) => {
      const role = snap.val();
      if (role) {
        const fakeTasks = [{ "type": "printer", "task": "Go to printer and print document" }];
        const goodTasks = [{ "type": "desk", "task": "Go to desk 1 and upload file" }];

        const tasks = (role === "FAKE" ? fakeTasks : goodTasks);
        const myTask = tasks.map(t => t.task).join('\n');
        this.currentTaskTypes = tasks.map(t => t.type);

        this.taskDisplay.setText(`ROLE: ${role}\nYOUR TASK: ${myTask}`);
        update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), {
          tasks: this.currentTaskTypes
        });

      }
    });

    // Start Task Timer (2 Minutes)
    this.timeLeft = 120;
    this.timerText = this.add.text(cam.width - 280, 80, "⏱️ 2:00", {
      fontSize: "24px", color: "#ffcc00", fontStyle: "bold"
    }).setScrollFactor(0).setDepth(101);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTimerTick,
      callbackScope: this,
      loop: true
    });
  }

  ensureLocalPlayer() {
    if (!this.playerId) return;
    const playerRef = ref(db, `rooms/${this.roomId}/players/${this.playerId}`);
    onValue(playerRef, (snap) => {
      if (!snap.exists()) {
        update(playerRef, {
          name: "Player " + this.playerId.substr(0, 4),
          x: 0, y: 0, submitted: false,
          emoji: this.getRandomEmoji()
        });
      }
    }, { onlyOnce: true });
  }

  createDeskZones() {
    this.deskZones = this.physics.add.staticGroup();
    this.desks.forEach(desk => {
      this.add.text(
        this.mapOffsetX + desk.laptopX * this.mapScale,
        this.mapOffsetY + desk.laptopY * this.mapScale - 40 * this.mapScale,
        `Desk ${desk.id}`,
        { fontSize: '14px', fill: '#00000' }
      ).setOrigin(0.5);

      this.printerZone = this.add.rectangle(
        this.mapOffsetX + 600 * this.mapScale, // Printer X
        this.mapOffsetY + 150 * this.mapScale, // Printer Y
        80 * this.mapScale, 60 * this.mapScale, 0x0000ff, 0.2
      );
      this.physics.add.existing(this.printerZone, true);
      this.deskZones.add(this.printerZone); // Treat as collidable/zone

      this.add.text(
        this.printerZone.x,
        this.printerZone.y - 40 * this.mapScale,
        "Printer",
        { fontSize: '14px', fill: '#000000' }
      ).setOrigin(0.5);

      const screenX = this.mapOffsetX + desk.laptopX * this.mapScale;
      const screenY = this.mapOffsetY + desk.laptopY * this.mapScale;

      const zone = this.add.rectangle(screenX, screenY, 80 * this.mapScale, 60 * this.mapScale, 0xff0000, 0.2);
      this.physics.add.existing(zone, true);
      this.deskZones.add(zone);
      desk.zone = zone;

      desk.screenSpawnX = this.mapOffsetX + desk.spawnX * this.mapScale;
      desk.screenSpawnY = this.mapOffsetY + desk.spawnY * this.mapScale;
    });

    // Cubicle Walls
    const vertX = this.mapOffsetX + 265 * this.mapScale;
    const vertY = this.mapOffsetY + 350 * this.mapScale;
    const vertHeight = 550 * this.mapScale;
    const vertWall = this.add.rectangle(vertX, vertY, 10 * this.mapScale, vertHeight, 0x00ff00, 0.2);
    this.physics.add.existing(vertWall, true);
    this.deskZones.add(vertWall);

    const horzX = this.mapOffsetX + 265 * this.mapScale;
    const horzWidth = 350 * this.mapScale;
    const horzY1 = this.mapOffsetY + 280 * this.mapScale;
    const horzWall1 = this.add.rectangle(horzX, horzY1, horzWidth, 10 * this.mapScale, 0x00ff00, 0.2);
    this.physics.add.existing(horzWall1, true);
    this.deskZones.add(horzWall1);

    const horzY2 = this.mapOffsetY + 480 * this.mapScale;
    const horzWall2 = this.add.rectangle(horzX, horzY2, horzWidth, 10 * this.mapScale, 0x00ff00, 0.2);
    this.physics.add.existing(horzWall2, true);
    this.deskZones.add(horzWall2);
  }

  getRandomEmoji() {
    const emojis = ["👨‍💼", "👩‍💼", "👨‍💻", "👩‍💻", "🤵", "👷"];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  syncPlayers(data) {
    Object.entries(data).forEach(([id, playerData]) => {
      // Create EMOJI AVATAR if not exists
      if (!this.players[id]) {
        // Assign desk
        let deskId = playerData.deskId;
        if (!deskId) {
          const assigned = Object.values(data).map(p => p.deskId).filter(Boolean);
          const freeDesk = this.desks.find(d => !assigned.includes(d.id));
          if (freeDesk) {
            deskId = freeDesk.id;
            update(ref(db, `rooms/${this.roomId}/players/${id}`), { deskId });
          }
        }

        const desk = this.desks.find(d => d.id === deskId) || this.desks[0];
        const spawnX = playerData.x || desk.screenSpawnX;
        const spawnY = playerData.y || desk.screenSpawnY;

        // --- THE CHANGE: Using Text instead of Sprite ---
        const emojiSymbol = playerData.emoji || this.getRandomEmoji();
        const avatar = this.add.text(spawnX, spawnY, emojiSymbol, {
          fontSize: "32px",
          align: "center"
        }).setOrigin(0.5).setDepth(10);

        // Add physics to text object
        this.physics.add.existing(avatar);
        avatar.body.setCollideWorldBounds(true);
        avatar.body.setSize(30, 30);
        this.physics.add.collider(avatar, this.deskZones);

        const nameText = this.add.text(spawnX, spawnY - 30, playerData.name || id, {
          fontSize: "12px", color: "white", backgroundColor: "black"
        }).setOrigin(0.5).setDepth(11);

        this.players[id] = { sprite: avatar, nameText, desk, id };

        if (!playerData.x || !playerData.emoji) {
          update(ref(db, `rooms/${this.roomId}/players/${id}`), { x: spawnX, y: spawnY, emoji: emojiSymbol });
        }
      }

      const player = this.players[id];
      if (id !== this.playerId && playerData.x) {
        player.sprite.setPosition(playerData.x, playerData.y);
      }
      player.nameText.setPosition(player.sprite.x, player.sprite.y - 30);
    });

    if (this.players[this.playerId]) {
      this.myPlayer = this.players[this.playerId];
    }
  }

  update() {
    if (!this.myPlayer) return;

    const speed = 200;
    const body = this.myPlayer.sprite.body;
    body.setVelocity(0);

    let isMoving = false;
    if (this.cursors.left.isDown) { body.setVelocityX(-speed); isMoving = true; }
    else if (this.cursors.right.isDown) { body.setVelocityX(speed); isMoving = true; }

    if (this.cursors.up.isDown) { body.setVelocityY(-speed); isMoving = true; }
    else if (this.cursors.down.isDown) { body.setVelocityY(speed); isMoving = true; }

    this.checkInteraction();
    this.updateMetrics(isMoving);

    if (!this.lastSync || Date.now() - this.lastSync > 100) {
      update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), {
        x: this.myPlayer.sprite.x,
        y: this.myPlayer.sprite.y
      });
      this.lastSync = Date.now();
    }
  }

  updateMetrics(isMoving) {
    if (!this.metrics) {
      this.metrics = {
        idleTime: 0,
        moveTime: 0,
        realWorkTime: 0,
        fakeWorkTime: 0,
        interruptions: 0
      };
      this.lastMetricTime = Date.now();
    }

    const dt = (Date.now() - this.lastMetricTime) / 1000;
    this.lastMetricTime = Date.now();

    if (isMoving) {
      this.metrics.moveTime += dt;
    } else if (this.isWorking) {
      // Work time tracked in checkInteraction
    } else {
      this.metrics.idleTime += dt;
    }

    // Sync metrics occasionally (every 2s) to avoid spamming
    if (!this.lastMetricSync || Date.now() - this.lastMetricSync > 2000) {
      const metricRef = ref(db, `rooms/${this.roomId}/metrics/${this.playerId}`);
      update(metricRef, this.metrics);
      this.lastMetricSync = Date.now();
    }
  }

  checkInteraction() {
    if (!this.myPlayer || !this.currentTaskTypes) return;

    let canInteract = false;
    let instruction = "";
    this.interactingWith = null;
    let isZoneValid = false; // Is this zone ASSIGNED to me?

    // Check ALL Desks (fake employees can use any)
    this.desks.forEach(desk => {
      const dx = this.myPlayer.sprite.x - desk.screenSpawnX;
      const dy = this.myPlayer.sprite.y - desk.screenSpawnY;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        canInteract = true;
        this.interactingWith = `desk_${desk.id}`;
        // Check if this specific desk is assigned
        if (this.myPlayer.desk && this.myPlayer.desk.id === desk.id && this.currentTaskTypes.includes("desk")) {
          isZoneValid = true;
        }
      }
    });

    // Check Printer
    if (!canInteract && this.printerZone) {
      const pdx = this.myPlayer.sprite.x - this.printerZone.x;
      const pdy = this.myPlayer.sprite.y - this.printerZone.y;
      if (Math.sqrt(pdx * pdx + pdy * pdy) < 60) {
        canInteract = true;
        this.interactingWith = "printer";
        if (this.currentTaskTypes.includes("printer")) {
          isZoneValid = true;
        }
      }
    }

    if (canInteract) {
      instruction = isZoneValid ? `Hold E to Work (${this.interactingWith})` : "Hold E to Fake Work";
      this.instructionsText.setText(instruction);

      if (!this.keyE) this.keyE = this.input.keyboard.addKey('E');

      if (this.keyE.isDown) {
        this.isWorking = true;
        const dt = 1 / 60; // Approx frame time

        if (isZoneValid) {
          this.metrics.realWorkTime += dt;
          this.taskProgress = (this.taskProgress || 0) + 1;
        } else {
          this.metrics.fakeWorkTime += dt;
          // Fake progress bar also moves to fool others
          this.taskProgress = (this.taskProgress || 0) + 1;
        }

        // Draw Progress Bar
        if (!this.progressBar) this.progressBar = this.add.graphics().setDepth(20);
        this.progressBar.clear()
          .fillStyle(0x000000, 0.5)
          .fillRect(this.myPlayer.sprite.x - 30, this.myPlayer.sprite.y - 50, 60, 10)
          .fillStyle(isZoneValid ? 0x00ff00 : 0xff0000) // Red for fake, Green for real (Maybe keep green to trick others? - Let's use Green for both visually)
          .fillStyle(0x00ff00)
          .fillRect(this.myPlayer.sprite.x - 30, this.myPlayer.sprite.y - 50, (this.taskProgress / 100) * 60, 10);

        if (this.taskProgress >= 100) {
          if (isZoneValid) {
            update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), {
              submitted: true // Mark as done only if REAL task
            });
            this.instructionsText.setText("Task Submitted!");
            this.isWorking = false;
            this.keyE.isDown = false;
          } else {
            // Fake complete - reset but don't submit
            this.taskProgress = 0;
            this.progressBar.clear();
          }
        }
      } else {
        // Key Released
        if (this.isWorking) {
          this.metrics.interruptions++;
          this.isWorking = false;
        }
        if (this.taskProgress > 0) {
          this.taskProgress = 0;
          if (this.progressBar) this.progressBar.clear();
        }
      }
    } else {
      this.instructionsText.setText("Arrow keys to move");
      this.isWorking = false;
      if (this.taskProgress > 0) {
        this.taskProgress = 0;
        if (this.progressBar) this.progressBar.clear();
      }
    }
  }


  onTimerTick() {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      this.timerText.setText(`⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    } else {
      // Time's up! Force end.
      this.forceEndRound();
    }
  }

  forceEndRound() {
    if (this.transitioningToAuditor) return;
    this.transitioningToAuditor = true;
    this.instructionsText.setText("TIME'S UP! Analyzing...");

    // Stop timer
    if (this.timerEvent) this.timerEvent.remove(false);

    // Trigger AI Evaluation
    fetch("http://localhost:8000/ai/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: this.roomId })
    }).then(() => {
      this.time.delayedCall(1000, () => this.scene.start("AuditorScene"));
    });
  }

  checkAllSubmitted(data) {
    const list = Object.values(data);
    // Auto-end if ALL submitted, OR if generic check
    if (list.length > 0 && list.every(p => p.submitted) && !this.transitioningToAuditor) {
      this.forceEndRound();
    }
  }
}
