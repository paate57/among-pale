// ========================
// UTILITY FUNCTIONS
// ========================
function shake(scene, obj, intensity = 8) {
    scene.tweens.add({
        targets: obj,
        x: obj.x + intensity,
        duration: 50,
        yoyo: true,
        repeat: 2
    });
}

// ========================
// TASK MANAGER (modified for map integration)
// ========================
class TaskManager extends Phaser.Scene {
    constructor() {
        super({ key: "TaskManager" });
        this.tasks = Phaser.Utils.Array.Shuffle([
            "TaskCode",
            "TaskCables",
            "TaskPC",
            "TaskUpload",
            "TaskDownload",
            "TaskFirewall",
            "TaskDatabase",
            "TaskSecurity",
            "TaskEmail",
            "TaskBackup",
            "TaskPrinter",
            "TaskWifi"
        ]);
        this.index = 0;
        this.completedTasks = 0;
    }

    create() {
        this.cameras.main.fadeIn(400);
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Simple background
        this.add.rectangle(centerX, centerY, 800, 600, 0x111827);
        
        // Progress bar
        this.createProgressBar();
        
        this.startNext();
    }
    
    createProgressBar() {
        const barWidth = 600;
        const barHeight = 30;
        const x = this.cameras.main.centerX;
        const y = this.cameras.main.centerY - this.cameras.main.height / 2 + 50;
        
        // Background
        this.add.rectangle(x, y, barWidth, barHeight, 0x1e293b)
            .setStrokeStyle(2, 0x475569);
        
        // Progress fill
        this.progressBar = this.add.rectangle(x - barWidth/2, y, 0, barHeight - 6, 0x22c55e)
            .setOrigin(0, 0.5);
        
        // Label
        this.progressText = this.add.text(x, y, `TASK COMPLETATE: ${this.completedTasks}/${this.tasks.length}`, {
            fontSize: '18px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }
    
    updateProgress() {
        this.completedTasks++;
        this.progressText.setText(`TASK COMPLETATE: ${this.completedTasks}/${this.tasks.length}`);
        
        const targetWidth = (this.completedTasks / this.tasks.length) * 594;
        this.tweens.add({
            targets: this.progressBar,
            width: targetWidth,
            duration: 400
        });
    }

    startNext() {
        if (this.index >= this.tasks.length) {
            this.showVictory();
            return;
        }

        const key = this.tasks[this.index];
        this.scene.launch(key);

        this.scene.get(key).events.once("complete", () => {
            this.scene.stop(key);
            this.updateProgress();
            this.index++;
            this.time.delayedCall(800, () => {
                this.startNext();
            });
        });
    }
    
    showVictory() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Overlay
        const overlay = this.add.rectangle(centerX, centerY, 800, 600, 0x000000, 0.7);
        
        // Victory panel
        const panel = this.add.rectangle(centerX, centerY, 500, 200, 0x166534)
            .setStrokeStyle(4, 0x22c55e);
        
        // Checkmark
        const checkmark = this.add.text(centerX, centerY - 30, "✓", {
            fontSize: '80px',
            fill: '#22c55e',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Victory text
        const victoryText = this.add.text(centerX, centerY + 30, "TUTTE LE TASK COMPLETATE!", {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }
}

// ========================
// TASK 1: CODE DEBUG
// ========================
class TaskCode extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskCode" }); 
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(centerX, centerY, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(centerX, centerY - 250, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);

        const title = this.add.text(centerX, centerY - 250, "DEBUG DEL CODICE", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(centerX, centerY - 210, 
            "Trova e clicca le 3 righe con errori",
            {
                fontSize: "16px",
                fill: "#fbbf24"
            }
        ).setOrigin(0.5);
        
        // Counter
        this.found = 0;
        this.totalErrors = 3;
        this.wrongAttempts = 0;
        this.maxWrong = 3;
        
        this.counter = this.add.text(centerX, centerY - 180, 
            `Errori trovati: ${this.found}/${this.totalErrors} | Tentativi sbagliati: ${this.wrongAttempts}/${this.maxWrong}`,
            {
                fontSize: "18px",
                fill: "#ffffff",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Code lines pools - pick randomly each game
        const allCodePools = [
            [
                { t: "function calculate(items) {", ok: true },
                { t: "    let total = 0;", ok: true },
                { t: "    for (i = 0; i < items.length; i++) {", ok: false },
                { t: "        total += items[i];", ok: true },
                { t: "    }", ok: true },
                { t: "    return total", ok: false },
                { t: "}", ok: true },
                { t: "const x = 5", ok: false },
                { t: "console.log(x);", ok: true }
            ],
            [
                { t: "function greet(name) {", ok: true },
                { t: "    var message = 'Hello ' + name", ok: false },
                { t: "    console.log(message);", ok: true },
                { t: "}", ok: true },
                { t: "let count = 0;", ok: true },
                { t: "for (let i = 0 i < 10; i++) {", ok: false },
                { t: "    count++;", ok: true },
                { t: "}", ok: true },
                { t: "console.log(Count);", ok: false }
            ],
            [
                { t: "const arr = [1, 2, 3];", ok: true },
                { t: "let sum = 0", ok: false },
                { t: "arr.forEach(n => {", ok: true },
                { t: "    sum += n;", ok: true },
                { t: "});", ok: true },
                { t: "if (sum > 5) {", ok: true },
                { t: "    console.log('big')", ok: false },
                { t: "}", ok: true },
                { t: "let result = Sum * 2;", ok: false }
            ],
            [
                { t: "class Animal {", ok: true },
                { t: "    constructor(name) {", ok: true },
                { t: "        this.name = name", ok: false },
                { t: "    }", ok: true },
                { t: "    speak() {", ok: true },
                { t: "        return 'Sound by ' + this.Name;", ok: false },
                { t: "    }", ok: true },
                { t: "}", ok: true },
                { t: "const dog = new animal('Rex');", ok: false }
            ]
        ];
        const codeLines = Phaser.Utils.Array.GetRandom(allCodePools);
        
        // Code container
        const codeBg = this.add.rectangle(400, 340, 650, 320, 0x1e293b)
            .setStrokeStyle(2, 0x4b5563);
        
        this.lines = [];
        codeLines.forEach((lineData, i) => {
            const y = 200 + i * 35;
            
            // Line number
            this.add.text(150, y, (i + 1).toString().padStart(2, '0'), {
                fontSize: "16px",
                fontFamily: "'Courier New', monospace",
                fill: "#6b7280"
            }).setOrigin(1, 0.5);
            
            // Code line
            const lineBg = this.add.rectangle(420, y, 480, 30, 0x374151)
                .setInteractive({ cursor: 'pointer' });
            
            const line = this.add.text(180, y, lineData.t, {
                fontSize: "15px",
                fontFamily: "'Courier New', monospace",
                fill: "#e5e7eb"
            }).setOrigin(0, 0.5);
            
            line.isOk = lineData.ok;
            line.isFound = false;
            line.bg = lineBg;
            
            // Hover
            lineBg.on('pointerover', () => {
                if (!line.isFound) {
                    lineBg.setFillStyle(0x4b5563);
                }
            });
            
            lineBg.on('pointerout', () => {
                if (!line.isFound) {
                    lineBg.setFillStyle(0x374151);
                }
            });
            
            lineBg.on('pointerdown', () => {
                this.checkLine(line, lineData.ok);
            });
            
            this.lines.push(line);
        });
        
        // Help
        this.add.text(400, 520, 
            "Cerca: punti e virgola mancanti, variabili non dichiarate",
            {
                fontSize: "13px",
                fill: "#9ca3af",
                fontStyle: "italic"
            }
        ).setOrigin(0.5);
    }
    
    checkLine(line, isCorrect) {
        if (line.isFound) return;
        
        if (!isCorrect) {
            // Found an error line
            line.isFound = true;
            line.bg.setFillStyle(0x166534);
            line.bg.disableInteractive();
            line.setFill("#4ade80");
            this.found++;
            
            this.counter.setText(`Errori trovati: ${this.found}/${this.totalErrors} | Tentativi sbagliati: ${this.wrongAttempts}/${this.maxWrong}`);
            
            if (this.found === this.totalErrors) {
                this.time.delayedCall(500, () => {
                    this.completeTask();
                });
            }
        } else {
            // Clicked a correct line by mistake
            this.wrongAttempts++;
            this.counter.setText(`Errori trovati: ${this.found}/${this.totalErrors} | Tentativi sbagliati: ${this.wrongAttempts}/${this.maxWrong}`);

            shake(this, line.bg, 8);
            line.bg.setFillStyle(0x7f1d1d);
            line.setFill("#f87171");
            
            if (this.wrongAttempts >= this.maxWrong) {
                this.time.delayedCall(400, () => {
                    this.scene.restart();
                });
                return;
            }

            this.time.delayedCall(500, () => {
                if (!line.isFound) {
                    line.bg.setFillStyle(0x374151);
                    line.setFill("#e5e7eb");
                }
            });
        }
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ DEBUG COMPLETATO", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 2: NETWORK CABLING
// ========================
class TaskCables extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskCables" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6)
            .setDepth(1);
        
        const title = this.add.text(400, 50, "CABLAGGIO DI RETE", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1);
        
        // Instructions
        this.add.text(400, 95, 
            "Collega ogni porta alla corrispondente dello stesso colore",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5).setDepth(1);
        
        this.selected = null;
        this.completed = 0;
        this.wrongConnections = 0;
        this.maxWrong = 3;
        
        // Colors
        const colors = [0xef4444, 0x22c55e, 0x3b82f6, 0xf59e0b, 0x8b5cf6, 0x06b6d4];
        const labels = ["A", "B", "C", "D", "E", "F"];
        const rightOrder = Phaser.Utils.Array.Shuffle([...labels]);
        
        this.leftNodes = [];
        this.rightNodes = [];
        
        // Counter
        this.counter = this.add.text(400, 125, 
            `Collegamenti: ${this.completed}/${labels.length} | Errori: ${this.wrongConnections}/${this.maxWrong}`,
            {
                fontSize: "16px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5).setDepth(1);
        
        // Left panel - depth 1
        const leftPanel = this.add.rectangle(200, 340, 180, 400, 0x1e293b)
            .setStrokeStyle(2, 0x4b5563)
            .setDepth(1);
        
        this.add.text(200, 165, "ORIGINE", {
            fontSize: "18px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1);
        
        // Right panel - depth 1
        const rightPanel = this.add.rectangle(600, 340, 180, 400, 0x1e293b)
            .setStrokeStyle(2, 0x4b5563)
            .setDepth(1);
        
        this.add.text(600, 165, "DESTINAZIONE", {
            fontSize: "18px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1);
        
        // Graphics for cables - NOW AT DEPTH 5 (in front of panels)
        this.fixedGraphics = this.add.graphics().setDepth(5);
        this.tempGraphics = this.add.graphics().setDepth(5);
        
        // Create nodes - depth 10 (on top of everything)
        labels.forEach((label, i) => {
            const color = colors[i];
            
            // Left node
            const leftX = 200;
            const leftY = 210 + i * 60;
            
            const leftNode = this.add.circle(leftX, leftY, 18, color)
                .setInteractive({ cursor: 'pointer' })
                .setStrokeStyle(3, 0xffffff)
                .setDepth(10);
            
            this.add.text(leftX, leftY - 32, label, {
                fontSize: "18px",
                fill: "#ffffff",
                fontStyle: "bold"
            }).setOrigin(0.5).setDepth(10);
            
            leftNode.label = label;
            leftNode.color = color;
            this.leftNodes.push(leftNode);
            
            // Right node
            const rightIndex = rightOrder.indexOf(label);
            const rightX = 600;
            const rightY = 210 + rightIndex * 60;
            
            const rightNode = this.add.circle(rightX, rightY, 18, color)
                .setInteractive({ cursor: 'pointer' })
                .setStrokeStyle(3, 0xffffff)
                .setDepth(10);
            
            this.add.text(rightX, rightY - 32, label, {
                fontSize: "18px",
                fill: "#ffffff",
                fontStyle: "bold"
            }).setOrigin(0.5).setDepth(10);
            
            rightNode.label = label;
            rightNode.color = color;
            this.rightNodes.push(rightNode);
        });
        
        // Input handlers
        this.input.on('pointerdown', (pointer, objects) => {
            if (!objects[0]) return;
            
            const obj = objects[0];
            
            if (this.leftNodes.includes(obj)) {
                if (this.selected) {
                    this.selected.setStrokeStyle(3, 0xffffff);
                }
                this.selected = obj;
                obj.setStrokeStyle(4, 0xfbbf24);
            }
            else if (this.rightNodes.includes(obj) && this.selected) {
                if (obj.label === this.selected.label) {
                    // Correct
                    this.drawLine(this.selected, obj);
                    this.selected.disabled = true;
                    obj.disabled = true;
                    this.selected.setStrokeStyle(3, 0x22c55e);
                    obj.setStrokeStyle(3, 0x22c55e);
                    this.selected.disableInteractive();
                    obj.disableInteractive();
                    
                    this.completed++;
                    this.updateCounter();
                    
                    if (this.completed === labels.length) {
                        this.time.delayedCall(500, () => {
                            this.completeTask();
                        });
                    }
                } else {
                    // Wrong
                    this.wrongConnections++;
                    this.updateCounter();
                    
                    shake(this, obj, 10);
                    obj.setStrokeStyle(4, 0xef4444);
                    
                    if (this.wrongConnections >= this.maxWrong) {
                        this.resetTask();
                        return;
                    }
                    
                    this.time.delayedCall(700, () => {
                        obj.setStrokeStyle(3, 0xffffff);
                    });
                }
                
                if (this.selected) {
                    this.selected.setStrokeStyle(3, 0xffffff);
                    this.selected = null;
                }
                this.tempGraphics.clear();
            }
        });
        
        // Temporary line
        this.input.on('pointermove', (pointer) => {
            this.tempGraphics.clear();
            
            if (this.selected && !this.selected.disabled) {
                this.tempGraphics.lineStyle(5, this.selected.color, 0.7);
                this.tempGraphics.beginPath();
                this.tempGraphics.moveTo(this.selected.x, this.selected.y);
                this.tempGraphics.lineTo(pointer.x, pointer.y);
                this.tempGraphics.strokePath();
            }
        });
    }
    
    updateCounter() {
        this.counter.setText(
            `Collegamenti: ${this.completed}/${6} | Errori: ${this.wrongConnections}/${this.maxWrong}`
        );
    }
    
    drawLine(a, b) {
        this.fixedGraphics.lineStyle(6, a.color, 0.9);
        this.fixedGraphics.beginPath();
        this.fixedGraphics.moveTo(a.x, a.y);
        this.fixedGraphics.lineTo(b.x, b.y);
        this.fixedGraphics.strokePath();
    }
    
    resetTask() {
        this.time.delayedCall(300, () => {
            this.scene.restart();
        });
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6).setDepth(20);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e)
            .setDepth(20);
        
        this.add.text(400, 300, "✓ RETE CONNESSA", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(20);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 3: SYSTEM BOOT
// ========================
class TaskPC extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskPC" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 40, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        const title = this.add.text(400, 40, "AVVIO DEL SISTEMA", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(400, 80, 
            "Avvia i componenti nell'ordine tecnico corretto",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        // Boot sequence
        this.sequence = ["ALIMENTAZIONE", "CPU", "RAM", "GPU", "SSD", "BIOS", "BOOT"];
        this.currentStep = 0;
        this.wrongAttempts = 0;
        this.maxWrong = 3;
        
        // Status panel
        const statusPanel = this.add.rectangle(400, 120, 450, 45, 0x1e293b)
            .setStrokeStyle(2, 0x4b5563);
        
        this.status = this.add.text(400, 120, 
            "Sistema: SPENTO",
            {
                fontSize: "20px",
                fill: "#ef4444",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Error counter
        this.errorCounter = this.add.text(400, 155, 
            `Tentativi errati: ${this.wrongAttempts}/${this.maxWrong}`,
            {
                fontSize: "15px",
                fill: "#fbbf24"
            }
        ).setOrigin(0.5);
        
        // Component descriptions
        this.descriptions = {
            "ALIMENTAZIONE": "Attiva power supply",
            "CPU": "Inizializza processore",
            "RAM": "Test memoria",
            "GPU": "Avvia scheda video",
            "SSD": "Rileva storage",
            "BIOS": "Carica firmware",
            "BOOT": "Sequenza avvio",
            "FAN": "Controllo ventole",
            "USB": "Scansione periferiche",
            "NET": "Inizializza rete"
        };
        
        // All components
        const allComponents = [...this.sequence, "FAN", "USB", "NET"];
        const shuffled = Phaser.Utils.Array.Shuffle(allComponents);
        this.buttonObjects = [];
        
        // Create component buttons
        shuffled.forEach((key, i) => {
            const x = 400;
            const y = 200 + i * 40;
            
            const bg = this.add.rectangle(x, y, 360, 36, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ cursor: 'pointer' });
            
            const mainText = this.add.text(x - 130, y, key, {
                fontSize: "15px",
                fill: "#e5e7eb",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            
            const descText = this.add.text(x + 170, y, this.descriptions[key], {
                fontSize: "12px",
                fill: "#9ca3af"
            }).setOrigin(1, 0.5);
            
            const buttonObj = {
                bg: bg,
                mainText: mainText,
                descText: descText,
                key: key,
                isSequence: this.sequence.includes(key),
                completed: false
            };
            
            // Hover
            bg.on('pointerover', () => {
                if (!buttonObj.completed) {
                    bg.setFillStyle(0x374151);
                    mainText.setFill("#ffffff");
                }
            });
            
            bg.on('pointerout', () => {
                if (!buttonObj.completed) {
                    bg.setFillStyle(0x1e293b);
                    mainText.setFill("#e5e7eb");
                }
            });
            
            bg.on('pointerdown', () => {
                this.checkComponent(buttonObj);
            });
            
            this.buttonObjects.push(buttonObj);
        });
        
        // Help
        this.add.text(400, 565, 
            "Suggerimento: Pensa all'ordine logico di accensione di un computer",
            {
                fontSize: "12px",
                fill: "#64748b",
                fontStyle: "italic"
            }
        ).setOrigin(0.5);
    }
    
    checkComponent(button) {
        if (button.completed) return;
        
        if (!button.isSequence) {
            this.handleWrong(button);
            return;
        }
        
        if (button.key === this.sequence[this.currentStep]) {
            // Correct!
            button.completed = true;
            button.bg.setFillStyle(0x166534);
            button.bg.setStrokeStyle(2, 0x22c55e);
            button.mainText.setFill("#4ade80");
            button.descText.setFill("#86efac");
            button.bg.disableInteractive();
            
            this.currentStep++;
            
            // Update status
            const statuses = [
                "ALIMENTAZIONE ATTIVA",
                "CPU INIZIALIZZATA",
                "RAM TESTATA",
                "GPU AVVIATA",
                "STORAGE RILEVATO",
                "BIOS CARICATO",
                "BOOTLOADER AVVIATO"
            ];
            
            if (this.currentStep - 1 < statuses.length) {
                this.status.setText(`Sistema: ${statuses[this.currentStep - 1]}`);
                this.status.setFill("#22c55e");
            }
            
            if (this.currentStep >= this.sequence.length) {
                this.time.delayedCall(500, () => {
                    this.completeTask();
                });
            }
        } else {
            this.handleWrong(button);
        }
    }
    
    handleWrong(button) {
        this.wrongAttempts++;
        this.errorCounter.setText(`Tentativi errati: ${this.wrongAttempts}/${this.maxWrong}`);
        
        // Feedback
        button.bg.setFillStyle(0x7f1d1d);
        button.mainText.setFill("#fca5a5");
        shake(this, button.bg, 10);
        
        // Too many errors
        if (this.wrongAttempts >= this.maxWrong) {
            this.resetTask();
            return;
        }
        
        // Reset color
        this.time.delayedCall(600, () => {
            if (!button.completed) {
                button.bg.setFillStyle(0x1e293b);
                button.mainText.setFill("#e5e7eb");
            }
        });
    }
    
    resetTask() {
        this.time.delayedCall(300, () => {
            this.scene.restart();
        });
    }
    
    completeTask() {
        this.status.setText("Sistema: OPERATIVO");
        this.status.setFill("#22c55e");
        
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ SISTEMA AVVIATO", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 4: FILE UPLOAD
// ========================
class TaskUpload extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskUpload" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        const title = this.add.text(400, 50, "UPLOAD FILE", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(400, 95, 
            "Carica tutti i file nel server remoto",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        // Progress tracking
        this.uploaded = 0;
        this.totalUpload = 5;
        
        // Progress text
        this.progressText = this.add.text(400, 125, 
            `File caricati: ${this.uploaded}/${this.totalUpload}`,
            {
                fontSize: "18px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Files to upload
        const uploadFiles = [
            { name: "report.pdf", size: "2.5 MB", icon: "📄", color: 0xef4444 },
            { name: "data.csv", size: "1.2 MB", icon: "📊", color: 0x22c55e },
            { name: "image.png", size: "3.8 MB", icon: "🖼️", color: 0x3b82f6 },
            { name: "video.mp4", size: "45 MB", icon: "🎬", color: 0xf59e0b },
            { name: "archive.zip", size: "12 MB", icon: "📦", color: 0x8b5cf6 }
        ];
        
        this.uploadButtons = [];
        
        // Create upload file buttons
        uploadFiles.forEach((file, i) => {
            const x = 400;
            const y = 180 + i * 80;
            
            const bg = this.add.rectangle(x, y, 400, 70, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ cursor: 'pointer' });
            
            const icon = this.add.text(x - 170, y, file.icon, {
                fontSize: "32px"
            }).setOrigin(0.5);
            
            const name = this.add.text(x - 120, y - 10, file.name, {
                fontSize: "16px",
                fill: "#ffffff",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            
            const size = this.add.text(x - 120, y + 12, file.size, {
                fontSize: "13px",
                fill: "#9ca3af"
            }).setOrigin(0, 0.5);
            
            const uploadBtn = this.add.text(x + 140, y, "⬆️ UPLOAD", {
                fontSize: "14px",
                fill: "#22c55e",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const fileObj = { 
                bg, icon, name, size, uploadBtn, 
                uploaded: false, 
                progress: null,
                x: x,
                y: y,
                color: file.color
            };
            
            bg.on('pointerover', () => {
                if (!fileObj.uploaded) {
                    bg.setFillStyle(0x374151);
                }
            });
            
            bg.on('pointerout', () => {
                if (!fileObj.uploaded) {
                    bg.setFillStyle(0x1e293b);
                }
            });
            
            bg.on('pointerdown', () => {
                this.uploadFile(fileObj);
            });
            
            this.uploadButtons.push(fileObj);
        });
    }
    
    uploadFile(fileObj) {
        if (fileObj.uploaded) return;
        
        fileObj.bg.disableInteractive();
        fileObj.uploadBtn.setText("⏳ UPLOADING...");
        fileObj.uploadBtn.setFill("#fbbf24");
        
        // Progress bar background
        const progressBg = this.add.rectangle(fileObj.x, fileObj.y + 35, 360, 10, 0x374151)
            .setStrokeStyle(1, 0x4b5563);
        
        // Progress bar fill
        const progressBar = this.add.rectangle(fileObj.x - 180, fileObj.y + 35, 0, 8, fileObj.color)
            .setOrigin(0, 0.5);
        
        fileObj.progress = { bg: progressBg, bar: progressBar };
        
        // Animate upload
        this.tweens.add({
            targets: progressBar,
            width: 360,
            duration: 2500,
            onComplete: () => {
                fileObj.uploaded = true;
                fileObj.uploadBtn.setText("✓ COMPLETATO");
                fileObj.uploadBtn.setFill("#22c55e");
                fileObj.bg.setFillStyle(0x166534);
                fileObj.bg.setStrokeStyle(2, 0x22c55e);
                
                this.uploaded++;
                this.updateProgress();
                
                if (this.uploaded === this.totalUpload) {
                    this.completeTask();
                }
            }
        });
    }
    
    updateProgress() {
        this.progressText.setText(`File caricati: ${this.uploaded}/${this.totalUpload}`);
    }
    
    completeTask() {
        this.time.delayedCall(500, () => {
            const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
            
            const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
                .setStrokeStyle(3, 0x22c55e);
            
            this.add.text(400, 300, "✓ UPLOAD COMPLETATO", {
                fontSize: "24px",
                fill: "#22c55e",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            this.time.delayedCall(1200, () => {
                this.events.emit("complete");
            });
        });
    }
}

// ========================
// TASK 5: FILE DOWNLOAD
// ========================
class TaskDownload extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskDownload" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        const title = this.add.text(400, 50, "DOWNLOAD FILE", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(400, 95, 
            "Scarica tutti i file richiesti dal server",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        // Progress tracking
        this.downloaded = 0;
        this.totalDownload = 5;
        
        // Progress text
        this.progressText = this.add.text(400, 125, 
            `File scaricati: ${this.downloaded}/${this.totalDownload}`,
            {
                fontSize: "18px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Files to download
        const downloadFiles = [
            { name: "config.json", size: "0.5 MB", icon: "⚙️", color: 0xf59e0b },
            { name: "backup.zip", size: "15 MB", icon: "📦", color: 0x8b5cf6 },
            { name: "script.js", size: "0.8 MB", icon: "📝", color: 0x06b6d4 },
            { name: "database.sql", size: "8 MB", icon: "🗄️", color: 0xef4444 },
            { name: "photos.rar", size: "25 MB", icon: "🖼️", color: 0x22c55e }
        ];
        
        this.downloadButtons = [];
        
        // Create download file buttons
        downloadFiles.forEach((file, i) => {
            const x = 400;
            const y = 180 + i * 80;
            
            const bg = this.add.rectangle(x, y, 400, 70, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ cursor: 'pointer' });
            
            const icon = this.add.text(x - 170, y, file.icon, {
                fontSize: "32px"
            }).setOrigin(0.5);
            
            const name = this.add.text(x - 120, y - 10, file.name, {
                fontSize: "16px",
                fill: "#ffffff",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            
            const size = this.add.text(x - 120, y + 12, file.size, {
                fontSize: "13px",
                fill: "#9ca3af"
            }).setOrigin(0, 0.5);
            
            const downloadBtn = this.add.text(x + 130, y, "⬇️ DOWNLOAD", {
                fontSize: "14px",
                fill: "#3b82f6",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const fileObj = { 
                bg, icon, name, size, downloadBtn, 
                downloaded: false, 
                progress: null,
                x: x,
                y: y,
                color: file.color
            };
            
            bg.on('pointerover', () => {
                if (!fileObj.downloaded) {
                    bg.setFillStyle(0x374151);
                }
            });
            
            bg.on('pointerout', () => {
                if (!fileObj.downloaded) {
                    bg.setFillStyle(0x1e293b);
                }
            });
            
            bg.on('pointerdown', () => {
                this.downloadFile(fileObj);
            });
            
            this.downloadButtons.push(fileObj);
        });
    }
    
    downloadFile(fileObj) {
        if (fileObj.downloaded) return;
        
        fileObj.bg.disableInteractive();
        fileObj.downloadBtn.setText("⏳ DOWNLOADING...");
        fileObj.downloadBtn.setFill("#fbbf24");
        
        // Progress bar background
        const progressBg = this.add.rectangle(fileObj.x, fileObj.y + 35, 360, 10, 0x374151)
            .setStrokeStyle(1, 0x4b5563);
        
        // Progress bar fill
        const progressBar = this.add.rectangle(fileObj.x - 180, fileObj.y + 35, 0, 8, fileObj.color)
            .setOrigin(0, 0.5);
        
        fileObj.progress = { bg: progressBg, bar: progressBar };
        
        // Animate download
        this.tweens.add({
            targets: progressBar,
            width: 360,
            duration: 2500,
            onComplete: () => {
                fileObj.downloaded = true;
                fileObj.downloadBtn.setText("✓ COMPLETATO");
                fileObj.downloadBtn.setFill("#22c55e");
                fileObj.bg.setFillStyle(0x1e3a8a);
                fileObj.bg.setStrokeStyle(2, 0x3b82f6);
                
                this.downloaded++;
                this.updateProgress();
                
                if (this.downloaded === this.totalDownload) {
                    this.completeTask();
                }
            }
        });
    }
    
    updateProgress() {
        this.progressText.setText(`File scaricati: ${this.downloaded}/${this.totalDownload}`);
    }
    
    completeTask() {
        this.time.delayedCall(500, () => {
            const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
            
            const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
                .setStrokeStyle(3, 0x22c55e);
            
            this.add.text(400, 300, "✓ DOWNLOAD COMPLETATO", {
                fontSize: "24px",
                fill: "#22c55e",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            this.time.delayedCall(1200, () => {
                this.events.emit("complete");
            });
        });
    }
}

// ========================
// TASK 6: FIREWALL CONFIG
// ========================
class TaskFirewall extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskFirewall" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        const title = this.add.text(400, 50, "CONFIGURAZIONE FIREWALL", {
            fontSize: "26px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(400, 95, 
            "Blocca i pacchetti sospetti e permetti quelli sicuri",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        this.correctBlocks = 0;
        this.correctAllows = 0;
        this.totalSuspicious = 4;
        this.totalSafe = 4;
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.taskLocked = false;
        
        // Progress
        this.progressText = this.add.text(400, 120, 
            `Bloccati: ${this.correctBlocks}/${this.totalSuspicious} | Permessi: ${this.correctAllows}/${this.totalSafe} | Errori: ${this.mistakes}/${this.maxMistakes}`,
            {
                fontSize: "14px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Help - High enough to not be covered
        this.add.text(400, 145, 
            "Attenzione a: porte sospette, protocolli sconosciuti, sorgenti non attendibili",
            {
                fontSize: "11px",
                fill: "#64748b",
                fontStyle: "italic"
            }
        ).setOrigin(0.5);
        
        // Packets
        const packets = [
            { ip: "192.168.1.100", port: "80", protocol: "HTTP", safe: true, desc: "Web traffic" },
            { ip: "10.0.0.50", port: "443", protocol: "HTTPS", safe: true, desc: "Secure web" },
            { ip: "172.16.0.99", port: "22", protocol: "SSH", safe: true, desc: "Remote access" },
            { ip: "203.0.113.42", port: "3389", protocol: "RDP", safe: false, desc: "Unknown source" },
            { ip: "198.51.100.88", port: "1337", protocol: "???", safe: false, desc: "Suspicious port" },
            { ip: "93.184.216.34", port: "25", protocol: "SMTP", safe: true, desc: "Email server" },
            { ip: "185.220.101.7", port: "9050", protocol: "TOR", safe: false, desc: "Tor exit node" },
            { ip: "45.142.120.33", port: "445", protocol: "SMB", safe: false, desc: "Malware vector" }
        ];
        
        const shuffled = Phaser.Utils.Array.Shuffle(packets);
        this.packetObjects = [];
        
        // Create packet cards
        shuffled.forEach((packet, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            
            const x = 130 + col * 170;
            const y = 255 + row * 215;
            
            const bg = this.add.rectangle(x, y, 155, 195, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563);
            
            // Packet icon — inside card top
            const icon = this.add.text(x, y - 82, "📦", {
                fontSize: "24px"
            }).setOrigin(0.5);
            
            // IP
            this.add.text(x, y - 55, packet.ip, {
                fontSize: "10px",
                fill: "#60a5fa",
                fontFamily: "'Courier New', monospace"
            }).setOrigin(0.5);
            
            // Port
            this.add.text(x, y - 36, `Port: ${packet.port}`, {
                fontSize: "11px",
                fill: "#a78bfa"
            }).setOrigin(0.5);
            
            // Protocol
            this.add.text(x, y - 16, packet.protocol, {
                fontSize: "12px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            // Description
            this.add.text(x, y + 6, packet.desc, {
                fontSize: "9px",
                fill: "#9ca3af",
                fontStyle: "italic",
                wordWrap: { width: 140 },
                align: "center"
            }).setOrigin(0.5);
            
            // Action buttons
            const allowBtn = this.add.rectangle(x - 36, y + 72, 58, 26, 0x166534)
                .setStrokeStyle(2, 0x22c55e)
                .setInteractive({ cursor: 'pointer' });
            
            const allowText = this.add.text(x - 36, y + 72, "✓ ALLOW", {
                fontSize: "10px",
                fill: "#22c55e",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const blockBtn = this.add.rectangle(x + 36, y + 72, 58, 26, 0x7f1d1d)
                .setStrokeStyle(2, 0xef4444)
                .setInteractive({ cursor: 'pointer' });
            
            const blockText = this.add.text(x + 36, y + 72, "✕ BLOCK", {
                fontSize: "10px",
                fill: "#ef4444",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const packetObj = {
                bg, icon, allowBtn, allowText, blockBtn, blockText,
                safe: packet.safe,
                processed: false
            };
            
            allowBtn.on('pointerdown', () => {
                this.processPacket(packetObj, true);
            });
            
            blockBtn.on('pointerdown', () => {
                this.processPacket(packetObj, false);
            });
            
            this.packetObjects.push(packetObj);
        });
    }
    
    processPacket(packetObj, allowed) {
        if (packetObj.processed || this.taskLocked) return;
        
        const correct = (allowed && packetObj.safe) || (!allowed && !packetObj.safe);
        
        if (correct) {
            // Correct action - mark as processed permanently
            packetObj.processed = true;
            packetObj.allowBtn.disableInteractive();
            packetObj.blockBtn.disableInteractive();
            
            if (allowed) {
                this.correctAllows++;
                packetObj.bg.setFillStyle(0x166534);
                packetObj.bg.setStrokeStyle(2, 0x22c55e);
                packetObj.icon.setText("✓");
            } else {
                this.correctBlocks++;
                packetObj.bg.setFillStyle(0x7f1d1d);
                packetObj.bg.setStrokeStyle(2, 0xef4444);
                packetObj.icon.setText("✕");
            }
            
            if (this.correctBlocks === this.totalSuspicious && this.correctAllows === this.totalSafe) {
                this.time.delayedCall(500, () => {
                    this.completeTask();
                });
            }
        } else {
            // Wrong action - temporarily disable but don't mark as processed
            this.mistakes++;
            packetObj.allowBtn.disableInteractive();
            packetObj.blockBtn.disableInteractive();
            
            const originalIcon = packetObj.icon.text;
            packetObj.bg.setFillStyle(0x854d0e);
            packetObj.bg.setStrokeStyle(2, 0xfbbf24);
            packetObj.icon.setText("⚠️");
            shake(this, packetObj.bg, 10);
            
            if (this.mistakes >= this.maxMistakes) {
                this.taskLocked = true;
                this.time.delayedCall(800, () => {
                    this.scene.restart();
                });
                return;
            }
            
            // Reset after animation - re-enable interaction
            this.time.delayedCall(700, () => {
                if (!packetObj.processed) {
                    packetObj.bg.setFillStyle(0x1e293b);
                    packetObj.bg.setStrokeStyle(2, 0x4b5563);
                    packetObj.icon.setText(originalIcon);
                    packetObj.allowBtn.setInteractive({ cursor: 'pointer' });
                    packetObj.blockBtn.setInteractive({ cursor: 'pointer' });
                }
            });
        }
        
        this.updateProgress();
    }
    
    updateProgress() {
        this.progressText.setText(
            `Bloccati: ${this.correctBlocks}/${this.totalSuspicious} | Permessi: ${this.correctAllows}/${this.totalSafe} | Errori: ${this.mistakes}/${this.maxMistakes}`
        );
    }
    
    completeTask() {
        this.taskLocked = true;
        
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ FIREWALL CONFIGURATO", {
            fontSize: "22px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 7: DATABASE QUERY
// ========================
class TaskDatabase extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskDatabase" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        const title = this.add.text(400, 50, "QUERY DATABASE", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(400, 95, 
            "Esegui le query SQL seguendo il ciclo di vita di una tabella database",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        // Sequence
        this.sequence = ["CREATE", "INSERT", "SELECT", "UPDATE", "DELETE"];
        this.currentStep = 0;
        this.wrongAttempts = 0;
        this.maxWrong = 3;
        
        // Status
        this.statusText = this.add.text(400, 125, 
            "Passo 1/5: Crea prima la tabella",
            {
                fontSize: "16px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Error counter
        this.errorCounter = this.add.text(400, 155, 
            `Errori: ${this.wrongAttempts}/${this.maxWrong}`,
            {
                fontSize: "14px",
                fill: "#ef4444"
            }
        ).setOrigin(0.5);
        
        // SQL queries
        const queries = {
            "CREATE": "CREATE TABLE users (id INT, name VARCHAR(50));",
            "INSERT": "INSERT INTO users VALUES (1, 'Mario');",
            "SELECT": "SELECT * FROM users WHERE id = 1;",
            "UPDATE": "UPDATE users SET name = 'Luigi' WHERE id = 1;",
            "DELETE": "DELETE FROM users WHERE id = 1;",
            "DROP": "DROP TABLE users;",
            "ALTER": "ALTER TABLE users ADD email VARCHAR(100);",
            "JOIN": "SELECT * FROM users JOIN orders ON users.id = orders.user_id;"
        };
        
        const allQueries = [...this.sequence, "DROP", "ALTER", "JOIN"];
        const shuffled = Phaser.Utils.Array.Shuffle(allQueries);
        this.queryObjects = [];
        
        // Create query buttons
        shuffled.forEach((key, i) => {
            const x = 400;
            const y = 200 + i * 50;
            
            const bg = this.add.rectangle(x, y, 600, 45, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ cursor: 'pointer' });
            
            const queryText = this.add.text(x - 280, y, queries[key], {
                fontSize: "13px",
                fontFamily: "'Courier New', monospace",
                fill: "#e5e7eb"
            }).setOrigin(0, 0.5);
            
            const labelText = this.add.text(x + 260, y, key, {
                fontSize: "14px",
                fill: "#60a5fa",
                fontStyle: "bold"
            }).setOrigin(1, 0.5);
            
            const queryObj = {
                bg, queryText, labelText,
                key: key,
                isSequence: this.sequence.includes(key),
                completed: false
            };
            
            // Hover
            bg.on('pointerover', () => {
                if (!queryObj.completed) {
                    bg.setFillStyle(0x374151);
                }
            });
            
            bg.on('pointerout', () => {
                if (!queryObj.completed) {
                    bg.setFillStyle(0x1e293b);
                }
            });
            
            bg.on('pointerdown', () => {
                this.executeQuery(queryObj);
            });
            
            this.queryObjects.push(queryObj);
        });
        
        // Help
        this.add.text(400, 560, 
            "Ordine logico: 1.Crea tabella → 2.Inserisci dati → 3.Leggi dati → 4.Modifica dati → 5.Cancella dati",
            {
                fontSize: "11px",
                fill: "#64748b",
                fontStyle: "italic"
            }
        ).setOrigin(0.5);
    }
    
    executeQuery(queryObj) {
        if (queryObj.completed) return;
        
        if (!queryObj.isSequence) {
            this.handleWrong(queryObj);
            return;
        }
        
        if (queryObj.key === this.sequence[this.currentStep]) {
            // Correct!
            queryObj.completed = true;
            queryObj.bg.setFillStyle(0x166534);
            queryObj.bg.setStrokeStyle(2, 0x22c55e);
            queryObj.queryText.setFill("#4ade80");
            queryObj.labelText.setFill("#22c55e");
            queryObj.bg.disableInteractive();
            
            this.currentStep++;
            
            // Update status
            const statuses = [
                "Passo 2/5: Inserisci i dati",
                "Passo 3/5: Consulta i dati",
                "Passo 4/5: Aggiorna i dati",
                "Passo 5/5: Elimina i dati"
            ];
            
            if (this.currentStep < this.sequence.length) {
                this.statusText.setText(statuses[this.currentStep - 1]);
            } else {
                this.statusText.setText("✓ Ciclo database completato!");
                this.statusText.setFill("#22c55e");
                this.time.delayedCall(500, () => {
                    this.completeTask();
                });
            }
        } else {
            this.handleWrong(queryObj);
        }
    }
    
    handleWrong(queryObj) {
        this.wrongAttempts++;
        this.errorCounter.setText(`Errori: ${this.wrongAttempts}/${this.maxWrong}`);
        
        // Feedback
        queryObj.bg.setFillStyle(0x7f1d1d);
        queryObj.queryText.setFill("#fca5a5");
        shake(this, queryObj.bg, 10);
        
        // Too many errors
        if (this.wrongAttempts >= this.maxWrong) {
            this.time.delayedCall(300, () => {
                this.scene.restart();
            });
            return;
        }
        
        // Reset color
        this.time.delayedCall(600, () => {
            if (!queryObj.completed) {
                queryObj.bg.setFillStyle(0x1e293b);
                queryObj.queryText.setFill("#e5e7eb");
            }
        });
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ DATABASE OPERATIVO", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 8: PASSWORD SECURITY
// ========================
class TaskSecurity extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskSecurity" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Simple background
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        // Title
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        const title = this.add.text(400, 50, "VERIFICA SICUREZZA PASSWORD", {
            fontSize: "26px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(400, 95, 
            "Approva solo le password sicure e rifiuta quelle deboli",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        this.correctApproved = 0;
        this.correctRejected = 0;
        this.totalSecure = 4;
        this.totalWeak = 4;
        this.mistakes = 0;
        this.maxMistakes = 3;
        this.taskLocked = false;
        
        // Progress
        this.progressText = this.add.text(400, 120, 
            `Approvate: ${this.correctApproved}/${this.totalSecure} | Rifiutate: ${this.correctRejected}/${this.totalWeak} | Errori: ${this.mistakes}/${this.maxMistakes}`,
            {
                fontSize: "13px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Help - High enough to not be covered
        this.add.text(400, 145, 
            "Password sicure: lunghe, con maiuscole, numeri e simboli speciali",
            {
                fontSize: "11px",
                fill: "#64748b",
                fontStyle: "italic"
            }
        ).setOrigin(0.5);
        
        // Passwords - REMOVED strength indicator
        const passwords = [
            { pwd: "P@ssw0rd!", secure: true, note: "Maiuscole, numeri, simboli" },
            { pwd: "MyS3cur3P@ss", secure: true, note: "Lunga e complessa" },
            { pwd: "Tr0mb0n3#2024", secure: true, note: "Mix caratteri speciali" },
            { pwd: "admin", secure: false, note: "Troppo comune" },
            { pwd: "12345678", secure: false, note: "Solo numeri" },
            { pwd: "password", secure: false, note: "Parola comune" },
            { pwd: "Secure$2024!", secure: true, note: "Ottima combinazione" },
            { pwd: "qwerty", secure: false, note: "Sequenza tastiera" }
        ];
        
        const shuffled = Phaser.Utils.Array.Shuffle(passwords);
        this.passwordObjects = [];
        
        // 4 cards per row, 2 rows — fit in 800x600 with header at y=160
        // Available height: 600 - 160 = 440px → 2 rows of 210px each (card 185px + 25px gap)
        // Available width: 800px → 4 cols of 192px (card 168px + 24px gap)
        const CARD_W = 155;
        const CARD_H = 185;
        const COL_W = 192;
        const ROW_H = 210;
        const GRID_TOP = 168; // first card center y

        shuffled.forEach((pass, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            
            const x = COL_W * col + COL_W / 2 + (800 - COL_W * 4) / 2;
            const y = GRID_TOP + row * ROW_H;
            
            const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563);
            
            // All content offsets are relative to card center y
            // Card top edge = y - CARD_H/2 = y - 92
            const icon = this.add.text(x, y - 68, "🔒", {
                fontSize: "26px"
            }).setOrigin(0.5);
            
            this.add.text(x, y - 36, pass.pwd, {
                fontSize: "11px",
                fill: "#ffffff",
                fontFamily: "'Courier New', monospace",
                fontStyle: "bold",
                wordWrap: { width: CARD_W - 14 },
                align: "center"
            }).setOrigin(0.5);
            
            this.add.text(x, y - 4, pass.note, {
                fontSize: "9px",
                fill: "#9ca3af",
                fontStyle: "italic",
                align: "center",
                wordWrap: { width: CARD_W - 14 }
            }).setOrigin(0.5);
            
            // Action buttons — inside card bottom half (card bottom = y + 92)
            const approveBtn = this.add.rectangle(x - 35, y + 66, 55, 26, 0x166534)
                .setStrokeStyle(2, 0x22c55e)
                .setInteractive({ cursor: 'pointer' });
            
            const approveText = this.add.text(x - 35, y + 66, "✓ OK", {
                fontSize: "11px",
                fill: "#22c55e",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const rejectBtn = this.add.rectangle(x + 35, y + 66, 55, 26, 0x7f1d1d)
                .setStrokeStyle(2, 0xef4444)
                .setInteractive({ cursor: 'pointer' });
            
            const rejectText = this.add.text(x + 35, y + 66, "✕ NO", {
                fontSize: "11px",
                fill: "#ef4444",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const passObj = {
                bg, icon, approveBtn, approveText, rejectBtn, rejectText,
                secure: pass.secure,
                processed: false
            };
            
            approveBtn.on('pointerdown', () => {
                this.processPassword(passObj, true);
            });
            
            rejectBtn.on('pointerdown', () => {
                this.processPassword(passObj, false);
            });
            
            this.passwordObjects.push(passObj);
        });
    }
    
    processPassword(passObj, approved) {
        if (passObj.processed || this.taskLocked) return;
        
        const correct = (approved && passObj.secure) || (!approved && !passObj.secure);
        
        if (correct) {
            // Correct action - mark as processed permanently
            passObj.processed = true;
            passObj.approveBtn.disableInteractive();
            passObj.rejectBtn.disableInteractive();
            
            if (approved) {
                this.correctApproved++;
                passObj.bg.setFillStyle(0x166534);
                passObj.bg.setStrokeStyle(2, 0x22c55e);
                passObj.icon.setText("✅");
            } else {
                this.correctRejected++;
                passObj.bg.setFillStyle(0x7f1d1d);
                passObj.bg.setStrokeStyle(2, 0xef4444);
                passObj.icon.setText("❌");
            }
            
            if (this.correctApproved === this.totalSecure && this.correctRejected === this.totalWeak) {
                this.time.delayedCall(500, () => {
                    this.completeTask();
                });
            }
        } else {
            // Wrong action - temporarily disable but don't mark as processed
            this.mistakes++;
            passObj.approveBtn.disableInteractive();
            passObj.rejectBtn.disableInteractive();
            
            const originalIcon = passObj.icon.text;
            passObj.bg.setFillStyle(0x854d0e);
            passObj.bg.setStrokeStyle(2, 0xfbbf24);
            passObj.icon.setText("⚠️");
            shake(this, passObj.bg, 10);
            
            if (this.mistakes >= this.maxMistakes) {
                this.taskLocked = true;
                this.time.delayedCall(800, () => {
                    this.scene.restart();
                });
                return;
            }
            
            // Reset after animation - re-enable interaction
            this.time.delayedCall(700, () => {
                if (!passObj.processed) {
                    passObj.bg.setFillStyle(0x1e293b);
                    passObj.bg.setStrokeStyle(2, 0x4b5563);
                    passObj.icon.setText(originalIcon);
                    passObj.approveBtn.setInteractive({ cursor: 'pointer' });
                    passObj.rejectBtn.setInteractive({ cursor: 'pointer' });
                }
            });
        }
        
        this.updateProgress();
    }
    
    updateProgress() {
        this.progressText.setText(
            `Approvate: ${this.correctApproved}/${this.totalSecure} | Rifiutate: ${this.correctRejected}/${this.totalWeak} | Errori: ${this.mistakes}/${this.maxMistakes}`
        );
    }
    
    completeTask() {
        this.taskLocked = true;
        
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ SICUREZZA VERIFICATA", {
            fontSize: "22px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 9: EMAIL SORTING (Easy)
// ========================
class TaskEmail extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskEmail" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        this.add.text(400, 50, "SMISTAMENTO EMAIL", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.add.text(400, 95, 
            "Sposta le email nelle cartelle corrette: Lavoro, Personale o Spam",
            {
                fontSize: "14px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        this.sorted = 0;
        this.totalEmails = 6;
        
        this.counter = this.add.text(400, 125, 
            `Email smistata: ${this.sorted}/${this.totalEmails}`,
            {
                fontSize: "16px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        // Email list
        const emails = [
            { from: "boss@company.com", subject: "Riunione urgente domani", folder: "Lavoro", icon: "💼" },
            { from: "noreply@bank.com", subject: "Estratto conto mensile", folder: "Personale", icon: "🏦" },
            { from: "winner@prize.xyz", subject: "HAI VINTO 1 MILIONE!", folder: "Spam", icon: "⚠️" },
            { from: "team@office.it", subject: "Report settimanale", folder: "Lavoro", icon: "💼" },
            { from: "mamma@email.it", subject: "Cena domenica?", folder: "Personale", icon: "👨‍👩‍👦" },
            { from: "offer@deals.com", subject: "CLICCA QUI SUBITO!!!", folder: "Spam", icon: "⚠️" }
        ];
        
        this.emailObjects = [];
        
        // Create folders
        const folders = [
            { name: "Lavoro", x: 150, color: 0x1e3a8a, icon: "💼" },
            { name: "Personale", x: 400, color: 0x166534, icon: "👤" },
            { name: "Spam", x: 650, color: 0x7f1d1d, icon: "🗑️" }
        ];
        
        folders.forEach(folder => {
            const folderBg = this.add.rectangle(folder.x, 520, 180, 100, folder.color)
                .setStrokeStyle(3, 0xffffff);
            
            this.add.text(folder.x, 495, folder.icon, {
                fontSize: "32px"
            }).setOrigin(0.5);
            
            this.add.text(folder.x, 540, folder.name, {
                fontSize: "18px",
                fill: "#ffffff",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            folderBg.folderName = folder.name;
            folderBg.setInteractive({ dropZone: true });
        });
        
        // Create emails
        emails.forEach((email, i) => {
            const y = 180 + i * 52;
            
            const emailBg = this.add.rectangle(400, y, 650, 48, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ draggable: true });
            
            const icon = this.add.text(140, y, email.icon, {
                fontSize: "24px"
            }).setOrigin(0.5);
            
            const from = this.add.text(180, y - 10, email.from, {
                fontSize: "12px",
                fill: "#60a5fa"
            }).setOrigin(0, 0.5);
            
            const subject = this.add.text(180, y + 10, email.subject, {
                fontSize: "14px",
                fill: "#ffffff",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);
            
            const emailObj = {
                bg: emailBg,
                icon: icon,
                from: from,
                subject: subject,
                correctFolder: email.folder,
                startX: 400,
                startY: y,
                isDragging: false
            };
            
            emailBg.emailObj = emailObj;
            
            this.emailObjects.push(emailObj);
        });
        
        // Drag events
        this.input.on('dragstart', (pointer, gameObject) => {
            const emailObj = gameObject.emailObj;
            emailObj.isDragging = true;
            // Shrink to small square while dragging
            gameObject.setSize(40, 40);
            emailObj.icon.setVisible(false);
            emailObj.from.setVisible(false);
            emailObj.subject.setVisible(false);
            gameObject.setFillStyle(0x3b82f6);
            gameObject.setStrokeStyle(2, 0x93c5fd);
            gameObject.setDepth(10);
        });

        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            gameObject.x = dragX;
            gameObject.y = dragY;
        });
        
        this.input.on('drop', (pointer, gameObject, dropZone) => {
            const emailObj = gameObject.emailObj;
            
            if (dropZone.folderName === emailObj.correctFolder) {
                // Correct! — fade out and disappear
                gameObject.disableInteractive();
                this.tweens.add({
                    targets: gameObject,
                    alpha: 0,
                    scaleX: 0,
                    scaleY: 0,
                    duration: 300,
                    onComplete: () => { gameObject.destroy(); }
                });
                
                this.sorted++;
                this.counter.setText(`Email smistate: ${this.sorted}/${this.totalEmails}`);
                
                if (this.sorted === this.totalEmails) {
                    this.time.delayedCall(500, () => {
                        this.completeTask();
                    });
                }
            } else {
                // Wrong folder - return to start, restore full size
                shake(this, gameObject, 10);
                emailObj.isDragging = false;
                gameObject.setSize(650, 48);
                gameObject.setFillStyle(0x1e293b);
                gameObject.setStrokeStyle(2, 0x4b5563);
                gameObject.setDepth(0);
                emailObj.icon.setVisible(true);
                emailObj.from.setVisible(true);
                emailObj.subject.setVisible(true);
                emailObj.icon.x = emailObj.startX - 260;
                emailObj.icon.y = emailObj.startY;
                emailObj.from.x = emailObj.startX - 220;
                emailObj.from.y = emailObj.startY - 10;
                emailObj.subject.x = emailObj.startX - 220;
                emailObj.subject.y = emailObj.startY + 10;
                this.tweens.add({
                    targets: gameObject,
                    x: emailObj.startX,
                    y: emailObj.startY,
                    duration: 300
                });
                this.tweens.add({
                    targets: emailObj.from,
                    x: emailObj.startX - 220,
                    y: emailObj.startY - 10,
                    duration: 300
                });
                this.tweens.add({
                    targets: emailObj.subject,
                    x: emailObj.startX - 220,
                    y: emailObj.startY + 10,
                    duration: 300
                });
                this.tweens.add({
                    targets: emailObj.icon,
                    x: emailObj.startX - 260,
                    y: emailObj.startY,
                    duration: 300
                });
            }
        });
        
        this.input.on('dragend', (pointer, gameObject, dropped) => {
            if (!dropped) {
                const emailObj = gameObject.emailObj;
                emailObj.isDragging = false;
                // Restore full size
                gameObject.setSize(650, 48);
                gameObject.setFillStyle(0x1e293b);
                gameObject.setStrokeStyle(2, 0x4b5563);
                gameObject.setDepth(0);
                emailObj.icon.setVisible(true);
                emailObj.from.setVisible(true);
                emailObj.subject.setVisible(true);
                emailObj.icon.x = emailObj.startX - 260;
                emailObj.icon.y = emailObj.startY;
                emailObj.from.x = emailObj.startX - 220;
                emailObj.from.y = emailObj.startY - 10;
                emailObj.subject.x = emailObj.startX - 220;
                emailObj.subject.y = emailObj.startY + 10;
                this.tweens.add({
                    targets: gameObject,
                    x: emailObj.startX,
                    y: emailObj.startY,
                    duration: 300
                });
            }
        });
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ EMAIL SMISTATE", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 10: BACKUP FILES (Easy)
// ========================
class TaskBackup extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskBackup" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        this.add.text(400, 50, "BACKUP DATI", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.add.text(400, 95, 
            "Seleziona tutti i file importanti da includere nel backup",
            {
                fontSize: "15px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);
        
        this.selected = 0;
        this.correctSelections = 0;
        this.totalImportant = 5;
        
        this.counter = this.add.text(400, 125, 
            `File selezionati: ${this.selected} | Corretti: ${this.correctSelections}/${this.totalImportant}`,
            {
                fontSize: "15px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        
        const filesRaw = [
            { name: "documenti_aziendali.pdf", important: true, icon: "📄" },
            { name: "foto_vacanze.jpg", important: false, icon: "🖼️" },
            { name: "database_clienti.sql", important: true, icon: "🗄️" },
            { name: "gioco.exe", important: false, icon: "🎮" },
            { name: "contratti_2024.docx", important: true, icon: "📝" },
            { name: "musica.mp3", important: false, icon: "🎵" },
            { name: "codici_sorgente.zip", important: true, icon: "📦" },
            { name: "video_divertenti.mp4", important: false, icon: "🎬" },
            { name: "backup_password.txt", important: true, icon: "🔐" },
            { name: "meme.gif", important: false, icon: "😂" }
        ];
        const files = Phaser.Utils.Array.Shuffle(filesRaw);
        
        this.fileObjects = [];
        
        files.forEach((file, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            
            const x = 240 + col * 320;
            const y = 180 + row * 75;
            
            const bg = this.add.rectangle(x, y, 280, 65, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ cursor: 'pointer' });
            
            const icon = this.add.text(x - 120, y, file.icon, {
                fontSize: "28px"
            }).setOrigin(0.5);
            
            const nameText = this.add.text(x - 80, y, file.name, {
                fontSize: "13px",
                fill: "#ffffff"
            }).setOrigin(0, 0.5);
            
            const checkbox = this.add.rectangle(x + 110, y, 24, 24, 0x374151)
                .setStrokeStyle(2, 0x4b5563);
            
            const checkmark = this.add.text(x + 110, y, "", {
                fontSize: "18px",
                fill: "#22c55e",
                fontStyle: "bold"
            }).setOrigin(0.5);
            
            const fileObj = {
                bg, icon, nameText, checkbox, checkmark,
                important: file.important,
                selected: false
            };
            
            bg.on('pointerover', () => {
                if (!fileObj.selected) {
                    bg.setFillStyle(0x374151);
                }
            });
            
            bg.on('pointerout', () => {
                if (!fileObj.selected) {
                    bg.setFillStyle(0x1e293b);
                }
            });
            
            bg.on('pointerdown', () => {
                this.toggleFile(fileObj);
            });
            
            this.fileObjects.push(fileObj);
        });
        
        // Confirm button
        const confirmBtn = this.add.rectangle(400, 540, 200, 45, 0x166534)
            .setStrokeStyle(3, 0x22c55e)
            .setInteractive({ cursor: 'pointer' });
        
        const confirmText = this.add.text(400, 540, "AVVIA BACKUP", {
            fontSize: "18px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        confirmBtn.on('pointerdown', () => {
            this.checkBackup();
        });
    }
    
    toggleFile(fileObj) {
        fileObj.selected = !fileObj.selected;
        
        if (fileObj.selected) {
            this.selected++;
            fileObj.checkbox.setFillStyle(0x22c55e);
            fileObj.checkmark.setText("✓");
            if (fileObj.important) {
                this.correctSelections++;
            }
        } else {
            this.selected--;
            fileObj.checkbox.setFillStyle(0x374151);
            fileObj.checkmark.setText("");
            if (fileObj.important) {
                this.correctSelections--;
            }
        }
        
        this.counter.setText(
            `File selezionati: ${this.selected} | Corretti: ${this.correctSelections}/${this.totalImportant}`
        );
    }
    
    checkBackup() {
        if (this.correctSelections === this.totalImportant && this.selected === this.totalImportant) {
            this.completeTask();
        } else {
            // Show which files are wrong
            this.fileObjects.forEach(fileObj => {
                if (fileObj.selected && !fileObj.important) {
                    // Selected but not important
                    fileObj.bg.setFillStyle(0x7f1d1d);
                    shake(this, fileObj.bg, 8);
                    this.time.delayedCall(600, () => {
                        fileObj.bg.setFillStyle(0x1e293b);
                    });
                } else if (!fileObj.selected && fileObj.important) {
                    // Not selected but important
                    fileObj.bg.setFillStyle(0x854d0e);
                    shake(this, fileObj.bg, 8);
                    this.time.delayedCall(600, () => {
                        fileObj.bg.setFillStyle(0x1e293b);
                    });
                }
            });
        }
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ BACKUP COMPLETATO", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 11: PRINTER SETUP (Easy)
// ========================
class TaskPrinter extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskPrinter" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        this.add.rectangle(400, 300, 800, 600, 0x111827);
        
        const titleBg = this.add.rectangle(400, 50, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6);
        
        this.add.text(400, 50, "CONFIGURAZIONE STAMPANTE", {
            fontSize: "26px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.add.text(400, 88, 
            "Seleziona le impostazioni corrette per stampare un documento aziendale a colori",
            {
                fontSize: "13px",
                fill: "#ffffff"
            }
        ).setOrigin(0.5);

        this.add.text(400, 110,
            "📋 Obiettivo: formato standard europeo  |  massima qualità  |  stampa a colori",
            {
                fontSize: "12px",
                fill: "#94a3b8",
                fontStyle: "italic"
            }
        ).setOrigin(0.5);
        
        this.settings = {
            paperSize: null,
            quality: null,
            color: null
        };
        
        this.correctSettings = {
            paperSize: "A4",
            quality: "Alta",
            color: "Colore"
        };
        
        // Paper Size
        this.createSetting(200, "FORMATO CARTA", ["A4", "Letter", "A3"], "paperSize");
        
        // Quality
        this.createSetting(330, "QUALITÀ STAMPA", ["Bozza", "Normale", "Alta"], "quality");
        
        // Color
        this.createSetting(460, "MODALITÀ COLORE", ["B/N", "Colore", "Scala grigi"], "color");
        
        // Print button
        const printBtn = this.add.rectangle(400, 540, 250, 50, 0x166534)
            .setStrokeStyle(3, 0x22c55e)
            .setInteractive({ cursor: 'pointer' });
        
        this.add.text(400, 540, "🖨️ AVVIA STAMPA", {
            fontSize: "20px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        printBtn.on('pointerdown', () => {
            this.checkSettings();
        });
    }
    
    createSetting(y, label, options, key) {
        this.add.text(400, y - 40, label, {
            fontSize: "16px",
            fill: "#fbbf24",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        options.forEach((option, i) => {
            const x = 250 + i * 150;
            
            const btn = this.add.rectangle(x, y, 130, 40, 0x1e293b)
                .setStrokeStyle(2, 0x4b5563)
                .setInteractive({ cursor: 'pointer' });
            
            const text = this.add.text(x, y, option, {
                fontSize: "14px",
                fill: "#ffffff"
            }).setOrigin(0.5);
            
            btn.on('pointerover', () => {
                if (this.settings[key] !== option) {
                    btn.setFillStyle(0x374151);
                }
            });
            
            btn.on('pointerout',  () => {
                if (this.settings[key] !== option) {
                    btn.setFillStyle(0x1e293b);
                }
            });
            
            btn.on('pointerdown', () => {
                // Deselect others
                this.children.list.forEach(child => {
                    if (child.settingKey === key && child !== btn) {
                        child.setFillStyle(0x1e293b);
                        child.setStrokeStyle(2, 0x4b5563);
                    }
                });
                
                // Select this
                btn.setFillStyle(0x1e3a8a);
                btn.setStrokeStyle(2, 0x3b82f6);
                this.settings[key] = option;
            });
            
            btn.settingKey = key;
        });
    }
    
    checkSettings() {
        if (!this.settings.paperSize || !this.settings.quality || !this.settings.color) {
            // Not all settings selected
            return;
        }
        
        if (this.settings.paperSize === this.correctSettings.paperSize &&
            this.settings.quality === this.correctSettings.quality &&
            this.settings.color === this.correctSettings.color) {
            this.completeTask();
        } else {
            // Wrong settings - flash screen red
            const flash = this.add.rectangle(400, 300, 800, 600, 0xff0000, 0.3);
            this.time.delayedCall(200, () => {
                flash.destroy();
            });
        }
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
        
        const panel = this.add.rectangle(400, 300, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e);
        
        this.add.text(400, 300, "✓ STAMPA IN CORSO", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// ========================
// TASK 12: WIFI CONNECTION (Easy)
// ========================
class TaskWifi extends Phaser.Scene {
    constructor() { 
        super({ key: "TaskWifi" }); 
    }
    
    create() {
        this.cameras.main.fadeIn(300);
        
        // Dark gradient background
        this.add.rectangle(400, 300, 800, 600, 0x0a1628);

        // Subtle grid lines for tech feel
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x1e3a5f, 0.3);
        for (let x = 0; x <= 800; x += 40) {
            grid.moveTo(x, 0); grid.lineTo(x, 600);
        }
        for (let y = 0; y <= 600; y += 40) {
            grid.moveTo(0, y); grid.lineTo(800, y);
        }
        grid.strokePath();

        // ── TITLE BAR ──
        this.add.rectangle(400, 38, 800, 76, 0x0f2240);
        this.add.rectangle(400, 76, 800, 2, 0x3b82f6, 0.8);
        this.add.text(400, 28, "📡  CONNESSIONE WIFI", {
            fontSize: "26px", fill: "#60a5fa", fontStyle: "bold"
        }).setOrigin(0.5);
        this.add.text(400, 58, "Connetti il tuo computer alla rete aziendale sicura",
            { fontSize: "13px", fill: "#94a3b8" }
        ).setOrigin(0.5);

        // ── STEP BADGES ──
        const steps = [
            { n: "1", label: "Scegli la rete", x: 180 },
            { n: "2", label: "Scegli la password", x: 400 },
            { n: "3", label: "Premi CONNETTI", x: 620 }
        ];
        steps.forEach(s => {
            this.add.circle(s.x, 100, 14, 0x1e3a8a).setStrokeStyle(2, 0x3b82f6);
            this.add.text(s.x, 100, s.n, { fontSize: "13px", fill: "#60a5fa", fontStyle: "bold" }).setOrigin(0.5);
            this.add.text(s.x, 118, s.label, { fontSize: "11px", fill: "#94a3b8" }).setOrigin(0.5);
        });
        const g = this.add.graphics();
        g.lineStyle(1, 0x3b82f6, 0.4);
        g.moveTo(194, 100); g.lineTo(386, 100);
        g.moveTo(414, 100); g.lineTo(606, 100);
        g.strokePath();

        // Layout constants
        const PANEL_TOP = 135;       // top y of panels
        const PANEL_H = 380;         // total height
        const PANEL_BOT = PANEL_TOP + PANEL_H;   // = 515
        const HDR_H = 28;
        const CONTENT_TOP = PANEL_TOP + HDR_H;   // = 163  (where content starts)
        const CONTENT_H = PANEL_H - HDR_H;       // = 352

        // ── LEFT PANEL: Networks ──
        this.add.rectangle(215, PANEL_TOP + PANEL_H / 2, 390, PANEL_H, 0x0d1f3a).setStrokeStyle(2, 0x1e3a8a);
        this.add.rectangle(215, PANEL_TOP + HDR_H / 2, 390, HDR_H, 0x1e3a8a);
        this.add.text(215, PANEL_TOP + HDR_H / 2, "🌐  RETI DISPONIBILI", {
            fontSize: "13px", fill: "#93c5fd", fontStyle: "bold"
        }).setOrigin(0.5);

        this.selectedNetwork = null;
        this.correctNetwork = "OFFICE_WIFI_5G";
        this.correctPassword = "SecurePass2024!";

        const networks = [
            { name: "OFFICE_WIFI_5G",  signal: 5, secure: true,  hint: "Rete aziendale ufficiale" },
            { name: "Guest_Network",   signal: 3, secure: false, hint: "Rete ospiti (non sicura)" },
            { name: "TP-Link_2.4GHz", signal: 2, secure: true,  hint: "Router privato" },
            { name: "FreeWiFi",        signal: 4, secure: false, hint: "Rete pubblica aperta" },
            { name: "Neighbor_WiFi",   signal: 1, secure: true,  hint: "Vicino di casa" }
        ];

        // Distribute 5 rows evenly inside content area
        const NET_ROW_H = Math.floor(CONTENT_H / networks.length); // 70px each
        this.networkObjects = [];
        networks.forEach((net, i) => {
            const y = CONTENT_TOP + NET_ROW_H * i + NET_ROW_H / 2;
            const isCorrect = net.name === this.correctNetwork;

            const bg = this.add.rectangle(215, y, 366, NET_ROW_H - 8, 0x111e33)
                .setStrokeStyle(2, 0x1e3a5f)
                .setInteractive({ cursor: 'pointer' });

            // Signal bars
            const sg = this.add.graphics();
            const bx = 42, bars = 5;
            for (let b = 0; b < bars; b++) {
                const filled = b < net.signal;
                const bh = 5 + b * 3;
                sg.fillStyle(filled ? (net.signal >= 4 ? 0x22c55e : net.signal >= 2 ? 0xfbbf24 : 0xef4444) : 0x374151);
                sg.fillRect(bx + b * 8, y + 8 - bh, 6, bh);
            }

            this.add.text(82, y, net.secure ? "🔒" : "🔓", { fontSize: "15px" }).setOrigin(0.5);
            this.add.text(98, y - 9, net.name, { fontSize: "13px", fill: "#e2e8f0", fontStyle: "bold" }).setOrigin(0, 0.5);
            this.add.text(98, y + 10, net.hint, { fontSize: "9px", fill: "#64748b", fontStyle: "italic" }).setOrigin(0, 0.5);

            if (isCorrect) {
                this.add.rectangle(358, y, 64, 16, 0x166534).setStrokeStyle(1, 0x22c55e);
                this.add.text(358, y, "AZIENDALE", { fontSize: "7px", fill: "#4ade80", fontStyle: "bold" }).setOrigin(0.5);
            }

            const netObj = { bg, netName: net.name, sg };
            bg.on('pointerover', () => { if (this.selectedNetwork !== net.name) bg.setFillStyle(0x1e3a5f); });
            bg.on('pointerout',  () => { if (this.selectedNetwork !== net.name) bg.setFillStyle(0x111e33); });
            bg.on('pointerdown', () => {
                this.networkObjects.forEach(o => { o.bg.setFillStyle(0x111e33); o.bg.setStrokeStyle(2, 0x1e3a5f); });
                bg.setFillStyle(0x1e3a8a); bg.setStrokeStyle(2, 0x3b82f6);
                this.selectedNetwork = net.name;
                this.step1Done.setVisible(true);
            });
            this.networkObjects.push(netObj);
        });

        // ── RIGHT PANEL: Password ──
        this.add.rectangle(610, PANEL_TOP + PANEL_H / 2, 340, PANEL_H, 0x0d1f3a).setStrokeStyle(2, 0x1e3a8a);
        this.add.rectangle(610, PANEL_TOP + HDR_H / 2, 340, HDR_H, 0x1e3a8a);
        this.add.text(610, PANEL_TOP + HDR_H / 2, "🔑  INSERISCI PASSWORD", {
            fontSize: "13px", fill: "#93c5fd", fontStyle: "bold"
        }).setOrigin(0.5);

        const passwords = ["password123", "admin", "SecurePass2024!", "wifi1234"];
        this.passwordBtns = [];

        const PWD_ROW_H = Math.floor(CONTENT_H / passwords.length); // 88px each
        passwords.forEach((pwd, i) => {
            const y = CONTENT_TOP + PWD_ROW_H * i + PWD_ROW_H / 2;

            const btn = this.add.rectangle(610, y, 300, PWD_ROW_H - 12, 0x111e33)
                .setStrokeStyle(2, 0x1e3a5f)
                .setInteractive({ cursor: 'pointer' });

            this.add.text(610, y, pwd, {
                fontSize: "14px", fill: "#e2e8f0",
                fontFamily: "'Courier New', monospace", fontStyle: "bold"
            }).setOrigin(0.5);

            btn.on('pointerover', () => { if (this.selectedPassword !== pwd) btn.setFillStyle(0x1e3a5f); });
            btn.on('pointerout',  () => { if (this.selectedPassword !== pwd) btn.setFillStyle(0x111e33); });
            btn.on('pointerdown', () => {
                this.passwordBtns.forEach(b => { b.btn.setFillStyle(0x111e33); b.btn.setStrokeStyle(2, 0x1e3a5f); });
                btn.setFillStyle(0x1e3a8a); btn.setStrokeStyle(2, 0x3b82f6);
                this.selectedPassword = pwd;
                this.step2Done.setVisible(true);
            });
            this.passwordBtns.push({ btn, pwd });
        });

        // ── STEP CHECKMARKS ──
        this.step1Done = this.add.text(284, 100, "✓", { fontSize: "14px", fill: "#22c55e", fontStyle: "bold" }).setOrigin(0.5).setVisible(false);
        this.step2Done = this.add.text(506, 100, "✓", { fontSize: "14px", fill: "#22c55e", fontStyle: "bold" }).setOrigin(0.5).setVisible(false);

        // ── CONNECT BUTTON (panels end at y=515, button at y=548) ──
        const connectBtnBg = this.add.rectangle(400, 548, 260, 44, 0x166534)
            .setStrokeStyle(3, 0x22c55e)
            .setInteractive({ cursor: 'pointer' });
        this.add.text(400, 548, "📡  CONNETTI", {
            fontSize: "18px", fill: "#22c55e", fontStyle: "bold"
        }).setOrigin(0.5);

        connectBtnBg.on('pointerover', () => { connectBtnBg.setFillStyle(0x14532d); });
        connectBtnBg.on('pointerout',  () => { connectBtnBg.setFillStyle(0x166534); });
        connectBtnBg.on('pointerdown', () => { this.tryConnect(); });

        this.statusMsg = this.add.text(400, 582, "", {
            fontSize: "12px", fill: "#ef4444", fontStyle: "bold"
        }).setOrigin(0.5);
    }

    tryConnect() {
        if (!this.selectedNetwork) {
            this.statusMsg.setText("⚠️ Seleziona prima una rete WiFi!");
            this.statusMsg.setFill("#fbbf24");
            return;
        }
        if (!this.selectedPassword) {
            this.statusMsg.setText("⚠️ Seleziona una password!");
            this.statusMsg.setFill("#fbbf24");
            return;
        }

        if (this.selectedNetwork === this.correctNetwork && 
            this.selectedPassword === this.correctPassword) {
            this.step2Done.setVisible(true);
            // Show step 3 checkmark
            this.add.text(720, 100, "✓", { fontSize: "14px", fill: "#22c55e", fontStyle: "bold" }).setOrigin(0.5);
            this.completeTask();
        } else {
            shake(this, this.statusMsg, 8);
            if (this.selectedNetwork !== this.correctNetwork && this.selectedPassword !== this.correctPassword) {
                this.statusMsg.setText("❌ Rete e password errate! Cerca la rete AZIENDALE e una password SICURA.");
            } else if (this.selectedNetwork !== this.correctNetwork) {
                this.statusMsg.setText("❌ Rete sbagliata! Cerca quella con il tag AZIENDALE.");
            } else {
                this.statusMsg.setText("❌ Password errata! Scegli quella più lunga e sicura.");
            }
            this.statusMsg.setFill("#ef4444");
            this.time.delayedCall(2500, () => { this.statusMsg.setText(""); });
        }
    }
    
    completeTask() {
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.75).setDepth(20);
        const panel = this.add.rectangle(400, 300, 440, 150, 0x0d2a1a).setStrokeStyle(3, 0x22c55e).setDepth(20);
        this.add.text(400, 275, "✓", { fontSize: "48px", fill: "#22c55e", fontStyle: "bold" }).setOrigin(0.5).setDepth(20);
        this.add.text(400, 335, "CONNESSO AL WIFI AZIENDALE", {
            fontSize: "20px", fill: "#22c55e", fontStyle: "bold"
        }).setOrigin(0.5).setDepth(20);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}