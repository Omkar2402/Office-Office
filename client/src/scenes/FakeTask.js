import Phaser from "phaser";

export default class FakeTask extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    scene.add.existing(this);

    this.interactionCount = 0;
    this.lastInteractionTime = null;
    this.isActive = false;

    this.createEmailSorter();
  }

  createEmailSorter() {
    const emojis = ["📧", "📄", "📎", "📁"];
    const spacing = 50;
    const startY = 20;

    emojis.forEach((emoji, index) => {
      const emojiText = this.scene.add.text(
        -60 + (index * spacing),
        startY,
        emoji,
        { fontSize: "28px" }
      ).setOrigin(0.5);

      emojiText.setInteractive({ draggable: true });
      this.add(emojiText);

      this.scene.input.on("drag", (pointer, gameObject, dragX, dragY) => {
        if (gameObject === emojiText) {
          gameObject.x = dragX - this.x;
          gameObject.y = dragY - this.y;
          this.recordInteraction();
        }
      });
    });

    // Sort buttons
    const inboxBtn = this.scene.add.rectangle(-60, 80, 80, 30, 0x3b82f6);
    const trashBtn = this.scene.add.rectangle(60, 80, 80, 30, 0xef4444);

    const inboxText = this.scene.add.text(-60, 80, "Inbox", {
      fontSize: "12px",
      color: "#fff"
    }).setOrigin(0.5);

    const trashText = this.scene.add.text(60, 80, "Trash", {
      fontSize: "12px",
      color: "#fff"
    }).setOrigin(0.5);

    [inboxBtn, trashBtn].forEach(btn => {
      btn.setInteractive({ useHandCursor: true });
      btn.on("pointerdown", () => this.recordInteraction());
    });

    this.add([inboxBtn, trashBtn, inboxText, trashText]);
  }

  recordInteraction() {
    this.interactionCount++;
    this.lastInteractionTime = Date.now();
    this.isActive = true;
    this.scene.events.emit("fake-task-activity");
  }

  getMetrics() {
    return {
      interactionCount: this.interactionCount,
      lastActive: this.lastInteractionTime
    };
  }
}
