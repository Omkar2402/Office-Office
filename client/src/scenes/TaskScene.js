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

    if (this.cursors.left.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right.isDown) body.setVelocityX(speed);

    if (this.cursors.up.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down.isDown) body.setVelocityY(speed);

    this.checkDeskInteraction();

    if (!this.lastSync || Date.now() - this.lastSync > 100) {
      update(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), {
        x: this.myPlayer.sprite.x,
        y: this.myPlayer.sprite.y
      });
      this.lastSync = Date.now();
    }
  }

  checkDeskInteraction() {
    if (!this.myPlayer || !this.myPlayer.desk) return;
    const dx = this.myPlayer.sprite.x - this.myPlayer.desk.screenSpawnX;
    const dy = this.myPlayer.sprite.y - this.myPlayer.desk.screenSpawnY;
    if (Math.sqrt(dx * dx + dy * dy) < 60) {
      this.instructionsText.setText("Press E to Work");
      if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.scene.start("WorkScene");
    } else {
      this.instructionsText.setText("Arrow keys to move");
    }
  }

  checkAllSubmitted(data) {
    const list = Object.values(data);
    if (list.length > 0 && list.every(p => p.submitted) && !this.transitioningToAuditor) {
      this.transitioningToAuditor = true;
      fetch("http://localhost:8000/ai/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: this.roomId })
      }).then(() => {
        this.time.delayedCall(1000, () => this.scene.start("AuditorScene"));
      });
    }
  }
}
