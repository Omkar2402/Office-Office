import Phaser from "phaser";
import { db, ref, set, onValue } from "../firebase";
import FakeTask from "./FakeTask";

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

    // NEW METRICS
    this.idleTime = 0;
    this.lastInputTime = Date.now();
    this.contextSwitchCount = 0;
    this.fakeTaskTime = 0;
    this.isFocusOnRealTask = true;

    // BEHAVIORAL METRICS
    this.keystrokeTimestamps = [];
    this.firstInputTime = null;  // Track when user first starts typing
    this.timeToStart = 0;        // Time from scene start to first input

    // Track idle time loop
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (Date.now() - this.lastInputTime > 2000) {
          this.idleTime += 1;
        }
      }
    });

    this.events.on("fake-task-activity", () => {
      this.lastInputTime = Date.now();
      if (this.isFocusOnRealTask) {
        this.contextSwitchCount++;
        this.isFocusOnRealTask = false;
      }
      this.fakeTaskTime += 1;
    });

    // ==================== NEW LAPTOP-STYLE UI ====================

    // Laptop body (dark background)
    const laptopBg = this.add.rectangle(400, 350, 900, 600, 0x1a1a1a);
    laptopBg.setStrokeStyle(4, 0x2a2a2a);

    // Screen area
    const screenBg = this.add.rectangle(400, 300, 850, 480, 0x0f172a);
    screenBg.setStrokeStyle(3, 0x475569);

    // Keyboard base (bottom)
    const keyboardBase = this.add.rectangle(400, 580, 900, 80, 0x1f2937);

    // Trackpad
    const trackpad = this.add.rectangle(400, 590, 150, 50, 0x111827);
    trackpad.setStrokeStyle(1, 0x374151);

    // Fetch role
    const roleRef = ref(db, `rooms/${roomId}/players/${playerId}/role`);

    onValue(roleRef, snap => {
      const role = snap.val();
      if (!role) return;
      this.renderTask(role, roomId, playerId);
    }, { onlyOnce: true });
  }

  renderTask(role, roomId, playerId) {
    // Clear existing UI if any
    this.children.list.forEach(child => {
      if (child.type === 'Text' && child.y < 250) {
        child.destroy();
      }
    });

    // Timer settings
    const TOTAL_TIME = 60; // seconds
    let timeLeft = TOTAL_TIME;
    this.timerText = this.add.text(400, 80, `⏱️ Time Left: ${timeLeft}s`, {
      fontSize: "24px",
      color: "#f87171",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Timer countdown
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        timeLeft--;
        this.timerText.setText(`⏱️ Time Left: ${timeLeft}s`);
        if (timeLeft <= 0) {
          this.timerEvent.remove(false);
          this.autoSubmitTask(role, roomId, playerId);
        }
      }
    });

    // ==================== LAYOUT BASED ON ROLE ====================

    if (role === "GOOD") {
      // GOOD: Simple single task layout
      this.renderGoodEmployeeTask(roomId, playerId);
    } else {
      // FAKE: Dual-panel layout
      this.renderFakeEmployeeTask(roomId, playerId);
    }
  }

  renderGoodEmployeeTask(roomId, playerId) {
    // Title
    this.add.text(400, 130, "📝 YOUR TASK", {
      fontSize: "20px",
      color: "#22c55e",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Task instruction
    this.add.text(400, 170, "Type exactly:", {
      fontSize: "16px",
      color: "#94a3b8"
    }).setOrigin(0.5);

    this.add.text(400, 200, "We delivered the project on time", {
      fontSize: "18px",
      color: "#60a5fa",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Input box
    this.inputBox = this.add.dom(400, 270, "input", {
      width: "600px",
      padding: "14px",
      fontSize: "16px",
      border: "2px solid #475569",
      borderRadius: "4px",
      backgroundColor: "#1e293b",
      color: "#ffffff",
      outline: "none"
    });

    this.setupInputHandlers();

    // Submit button
    this.createSubmitButton(400, 350, playerId, roomId);
  }

  renderFakeEmployeeTask(roomId, playerId) {
    // Two-column layout - adjusted positioning

    // LEFT: Real Task
    this.add.rectangle(250, 260, 380, 340, 0x1e293b);
    this.add.text(250, 130, "📝 REAL TASK", {
      fontSize: "16px",
      color: "#22c55e",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(250, 170, "Type exactly:", {
      fontSize: "14px",
      color: "#94a3b8"
    }).setOrigin(0.5);

    this.add.text(250, 200, "We delivered the\nproject on time", {
      fontSize: "16px",
      color: "#60a5fa",
      align: "center"
    }).setOrigin(0.5);

    // Real task input
    this.inputBox = this.add.dom(250, 280, "input", {
      width: "320px",
      padding: "10px",
      fontSize: "14px",
      border: "2px solid #475569",
      borderRadius: "4px",
      backgroundColor: "#0f172a",
      color: "#ffffff",
      outline: "none"
    });

    this.setupInputHandlers();

    // RIGHT: Fake Task
    this.add.rectangle(550, 260, 380, 340, 0x1e293b);
    this.add.text(550, 130, "🎯 BUSY WORK", {
      fontSize: "16px",
      color: "#fb7185",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(550, 165, "Drag emails to look busy", {
      fontSize: "13px",
      color: "#94a3b8"
    }).setOrigin(0.5);

    // Fake task container - moved down
    this.fakeTask = new FakeTask(this, 550, 270);
    this.fakeTask.setScale(0.7);

    this.createSubmitButton(400, 460, playerId, roomId);
  }

  setupInputHandlers() {
    // Track keystrokes for behavioral analysis
    this.inputBox.node.addEventListener("keydown", (e) => {
      const now = Date.now();

      // Track first input time
      if (this.firstInputTime === null) {
        this.firstInputTime = now;
        this.timeToStart = now - this.startTime;
      }

      // Track all keystroke timestamps for rhythm analysis
      this.keystrokeTimestamps.push(now);

      this.keystrokes++;
      this.lastInputTime = now;
    });

    // Track context switching
    this.inputBox.node.addEventListener("focus", () => {
      if (!this.isFocusOnRealTask) {
        this.contextSwitchCount++;
        this.isFocusOnRealTask = true;
      }
      this.lastInputTime = Date.now();
    });

    // Auto-focus the input
    this.time.delayedCall(200, () => {
      this.inputBox.node.focus();
    });
  }

  createSubmitButton(x, y, playerId, roomId) {
    // Get role from player data
    const roleRef = ref(db, `rooms/${roomId}/players/${playerId}/role`);

    const btn = this.add.rectangle(x, y, 160, 40, 0x22c55e)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, "SUBMIT", {
      color: "#000",
      fontStyle: "bold"
    }).setOrigin(0.5);

    btn.on("pointerdown", () => {
      if (this.submitted) return;

      // Get role and submit
      onValue(roleRef, snap => {
        const role = snap.val();
        this.submitTask(role, roomId, playerId);
      }, { onlyOnce: true });
    });
  }

  submitTask(role, roomId, playerId) {
    this.submitted = true;
    if (this.timerEvent) this.timerEvent.remove(false);
    const endTime = Date.now();
    const typedText = this.inputBox.node.value;
    // const fakeText = this.fakeInput ? this.fakeInput.node.value : ""; // Removed old logic

    const fakeMetrics = this.fakeTask ? this.fakeTask.getMetrics() : { interactionCount: 0 };

    // Calculate typing rhythm variance
    const typingRhythm = this.calculateTypingRhythm();

    const metrics = {
      role,
      typedText,
      keystrokes: this.keystrokes,
      timeTakenMs: endTime - this.startTime,
      submittedRealTask: typedText.length > 0,

      // NEW PRD METRICS
      idleTime: this.idleTime,
      fakeTaskTime: this.fakeTaskTime, // tracked via events
      contextSwitchCount: this.contextSwitchCount,
      fakeInteractions: fakeMetrics.interactionCount,

      // BEHAVIORAL METRICS
      timeToStart: this.timeToStart,
      typingRhythm: typingRhythm
    };
    set(ref(db, `rooms/${roomId}/metrics/${playerId}`), metrics);

    // Mark player as submitted
    set(ref(db, `rooms/${roomId}/players/${playerId}/submitted`), true);

    // Return to TaskScene to roam
    this.scene.start("TaskScene");
  }

  autoSubmitTask(role, roomId, playerId) {
    if (this.submitted) return;
    this.submitTask(role, roomId, playerId);
  }

  calculateTypingRhythm() {
    if (this.keystrokeTimestamps.length < 2) {
      return { avg: 0, variance: 0, count: 0 };
    }

    // Calculate intervals between keystrokes
    const intervals = [];
    for (let i = 1; i < this.keystrokeTimestamps.length; i++) {
      intervals.push(this.keystrokeTimestamps[i] - this.keystrokeTimestamps[i - 1]);
    }

    // Calculate average
    const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

    // Calculate variance
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;

    return {
      avg: Math.round(avg),
      variance: Math.round(variance),
      count: intervals.length
    };
  }
}
