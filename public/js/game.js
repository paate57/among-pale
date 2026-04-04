// game.js - Classe principale del gioco Phaser
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        
        this.players = new Map();
        this.localPlayer = null;
        this.cursors = null;
        this.wasd = null;
        this.lastMoveTime = 0;
        this.moveThrottle = 50;
        this.mapLayers = [];
        this.map = null;
        this.role = null;
        this.impostorNames = [];
        this.totalCompleted = 0;
        this.totalRequired = 0;
        this.killCooldown = 0;
        this.emergencyActive = false;
        this.emergencyMeetingCalled = false;
        this.meetingParticipant = false;
        this.meetingJoinPrompt = null;
        this.emergencyMeetingPoint = null;
        this.emergencyButton = null;
        this.killCooldownText = null;
        this.roleScreenVisible = false;
        this.gameEnded = false;

        this.meetingChatEntries = [];
        this.meetingDraft = '';
        this.meetingInputElement = null;

        // Report con immagine dead.png
        this.killReportAvailable = false;
        this.killReportTimer = null;
        this.deadImageButton = null;
    }

    init(data) {
        if (data) {
            this.role = data.role || this.role;
            this.impostorNames = data.impostorNames || this.impostorNames || [];
        }
    }

    setRole(role, impostorNames) {
        this.role = role || this.role;
        this.impostorNames = impostorNames || this.impostorNames || [];
        console.log('GameScene setRole:', this.role, this.impostorNames);
        if (this.role) {
            this.showRoleScreen();
            this.showTaskProgressBarIfCrewmate();
            if (network) {
                this.completedTasks = network.tasksCompleted || 0;
                this.totalTasks = network.totalTasks || 5;
            }
        }
    }

    preload() {
        this.load.image('tiles', 'assets/tileset.jpg');
        this.load.image('tiles2', 'assets/tileset2.png');
        this.load.image('interni', 'assets/interni.jpg');
        this.load.tilemapTiledJSON('map', 'assets/map-layer1.json');
        this.load.spritesheet('player', 'assets/player.png', { frameWidth: 32, frameHeight: 48 });
        this.load.image('task', 'assets/task.png');
        this.load.image('emergency', 'assets/emergency.png');
        this.load.image('dead', 'assets/dead.png');
        
        this.createLoadingBar();
    }

    // ── INDOOR SYSTEM (invariato) ─────────────────────────────────────────────
    checkIndoorState() {
        if (!this.localPlayer || !this.roofLayers || !this.map) return;
        const px = this.localPlayer.x;
        const py = this.localPlayer.y;
        let underRoof = false;
        for (const layer of this.roofLayers) {
            if (layer.getTileAtWorldXY(px, py)) { underRoof = true; break; }
        }
        if (this._debugText) {
            this._debugText.setText(`POS: ${Math.round(px)}, ${Math.round(py)}\nTETTO: ${underRoof ? 'dentro' : 'fuori'}`);
        }
        if (underRoof && !this.isInsideBuilding) {
            this.isInsideBuilding = true;
            this._enterBuilding();
        } else if (!underRoof && this.isInsideBuilding) {
            this.isInsideBuilding = false;
            this._exitBuilding();
        }
    }

    _enterBuilding() {
        this.mapLayers.forEach(layer => layer.setVisible(false));
        this.interniImage.setVisible(true);
        if (this.localPlayer) this.localPlayer.setDepth(3500);
        this.players.forEach(p => { if (p.nameText) p.nameText.setDepth(3501); });
    }

    _exitBuilding() {
        this.mapLayers.forEach(layer => layer.setVisible(true));
        this.interniImage.setVisible(false);
        if (this.localPlayer) this.localPlayer.setDepth(1000);
        this.players.forEach(p => { if (p.nameText) p.nameText.setDepth(1001); });
    }
    // ─────────────────────────────────────────────────────────────────────────

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Caricamento...', { font: '20px Arial', fill: '#ffffff' }).setOrigin(0.5);
        const percentText = this.add.text(width / 2, height / 2, '0%', { font: '18px Arial', fill: '#ffffff' }).setOrigin(0.5);
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        this.load.on('complete', () => {
            progressBar.destroy(); progressBox.destroy(); loadingText.destroy(); percentText.destroy();
        });
    }

    create() {
        this.setupPixelArt();
        this.createMap();
        console.log('=== DEBUG MAPPA ===');
        if (this.map) console.log('Layers:', this.map.layers.map(l => l.name));
        this.setupInput();
        // Overlay morto (sempre sopra tutto)
        this.deadBodies = []; // array dei cadaveri
        this.createNetworkPlayers();
        this.setupNetworkEvents();
        this._debugText = this.add.text(10, 50, '', { font: '13px monospace', fill: '#ffff00', backgroundColor: '#000000cc', padding: { x:5, y:3 } }).setScrollFactor(0).setDepth(99999);
        this.createAnimations();
        this.createTasks();
        this.createTaskProgressBar();
        this.createEmergencyButton();
        this.createDebugInfo();
    }

    setupPixelArt() {
        this.cameras.main.roundPixels = true;
        if (this.textures && this.textures.list) {
            Object.values(this.textures.list).forEach(texture => {
                if (texture && texture.setFilter) texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
            });
        }
    }

    createMap() {
        this.map = this.make.tilemap({ key: 'map' });
        const tilesets = this.map.tilesets.map(ts => this.map.addTilesetImage(ts.name, ts.name === 'tileset2' ? 'tiles2' : 'tiles'));
        this.mapLayers = [];
        this.map.layers.forEach((layerData, index) => {
            const layer = this.map.createLayer(layerData.name, tilesets, 0, 0);
            if (!layer) return;
            if (layerData.properties) {
                const collides = layerData.properties.find(p => p.name === 'collides' && p.value === true);
                if (collides) layer.setCollisionByExclusion([-1]);
            }
            const name = layerData.name.toLowerCase();
            if (name.includes('paviment')) layer.setDepth(600);
            else if (name.includes('tetto')) layer.setDepth(3000 + index);
            else layer.setDepth(500 + index);
            this.mapLayers.push(layer);
        });
        this.roofLayers = this.mapLayers.filter(l => l.layer.name.toLowerCase().includes('tetto'));
        this.isInsideBuilding = false;
        const mapWidth = this.map.widthInPixels;
        const mapHeight = this.map.heightInPixels;
        const interniTexture = this.textures.get('interni');
        const interniWidth = interniTexture.getSourceImage().width;
        const interniHeight = interniTexture.getSourceImage().height;
        const scale = Math.max(mapWidth / interniWidth, mapHeight / interniHeight);
        this.interniImage = this.add.image(0, 0, 'interni').setOrigin(0, 0).setDepth(2999).setVisible(false).setScrollFactor(1).setScale(scale);
        const offsetX = (mapWidth - interniWidth * scale) / 2;
        const offsetY = (mapHeight - interniHeight * scale) / 2;
        this.interniImage.setPosition(offsetX, offsetY);
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        this.emergencyMeetingPoint = { x: mapWidth / 2, y: mapHeight / 2 };
        this.emergencyTable = this.add.image(this.emergencyMeetingPoint.x, this.emergencyMeetingPoint.y, 'emergency').setOrigin(0.5).setDepth(650).setScale(0.2);
        this.spawnOffsets = [
            { x: -70, y: -70 }, { x: 0, y: -90 }, { x: 70, y: -70 },
            { x: -90, y: 0 }, { x: 90, y: 0 },
            { x: -70, y: 70 }, { x: 0, y: 90 }, { x: 70, y: 70 }
        ];
        this.nextSpawnIndex = 0;
    }

    createTasks() {
        this.taskLocations = [];
        this.completedTasks = 0;
        this.totalTasks = 5;
        if (this.localPlayer && this.localPlayer.id) Phaser.Math.RND.sow([this.localPlayer.id]);
        this.taskTypes = Phaser.Utils.Array.Shuffle([
            "TaskCode", "TaskCables", "TaskPC", "TaskUpload", "TaskDownload",
            "TaskFirewall", "TaskDatabase", "TaskSecurity", "TaskEmail",
            "TaskBackup", "TaskPrinter", "TaskWifi"
        ]).slice(0, 5);
        const positions = [];
        for (let i = 0; i < 5; i++) {
            let x, y, attempts = 0;
            do { x = Phaser.Math.RND.between(100, 4000); y = Phaser.Math.RND.between(100, 4000); attempts++; }
            while (attempts < 10 && this.isPositionTooClose(x, y, positions));
            positions.push({ x, y });
        }
        positions.forEach((pos, index) => {
            const taskSprite = this.add.image(pos.x, pos.y, 'task').setDisplaySize(32, 32).setDepth(3500);
            taskSprite.taskType = this.taskTypes[index];
            taskSprite.completed = false;
            taskSprite.index = index;
            const taskText = this.add.text(pos.x, pos.y - 40, `TASK ${index + 1}`, { font: '12px Arial', fill: '#ffffff', backgroundColor: '#000000', padding: { x: 3, y: 2 } }).setOrigin(0.5);
            taskSprite.textLabel = taskText;
            taskSprite.textLabel.setDepth(3501);
            this.taskLocations.push(taskSprite);
        });
    }

    createTaskProgressBar() {
        if (this.role !== 'crewmate') return;
        const barWidth = 300, barHeight = 20;
        const x = this.cameras.main.centerX;
        const y = this.cameras.main.centerY - this.cameras.main.height / 2 + 50;
        this.add.rectangle(x, y, barWidth, barHeight, 0x1e293b).setStrokeStyle(2, 0x475569).setScrollFactor(0);
        this.taskProgressBar = this.add.rectangle(x - barWidth/2, y, 0, barHeight - 4, 0x22c55e).setOrigin(0, 0.5).setScrollFactor(0);
        this.taskProgressText = this.add.text(x, y, `TASK: ${this.completedTasks}/${this.totalTasks}`, { fontSize: '14px', fill: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0);
        this.updateTaskProgressBar();
    }

    updateTaskProgressBar() {
        if (!this.taskProgressBar || !this.taskProgressText) return;
        const progress = this.completedTasks / this.totalTasks;
        this.taskProgressBar.width = progress * 296;
        this.taskProgressText.setText(`TASK: ${this.completedTasks}/${this.totalTasks}`);
    }

    updateTaskProgress(totalCompleted, totalRequired) {}

    isPositionTooClose(x, y, existingPositions, minDistance = 200) {
        for (const pos of existingPositions)
            if (Phaser.Math.Distance.Between(x, y, pos.x, pos.y) < minDistance) return true;
        return false;
    }

    createFallbackMap() {
        const tileSize = 32, gridWidth = 50, gridHeight = 50;
        const graphics = this.add.graphics();
        graphics.fillStyle(0x1a1a2e, 1);
        graphics.fillRect(0, 0, gridWidth * tileSize, gridHeight * tileSize);
        graphics.lineStyle(1, 0x2d2d44, 0.3);
        for (let x = 0; x <= gridWidth; x++) { graphics.moveTo(x * tileSize, 0); graphics.lineTo(x * tileSize, gridHeight * tileSize); }
        for (let y = 0; y <= gridHeight; y++) { graphics.moveTo(0, y * tileSize); graphics.lineTo(gridWidth * tileSize, y * tileSize); }
        graphics.strokePath();
        const mapWidth = gridWidth * tileSize, mapHeight = gridHeight * tileSize;
        this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => { if (this.scale.isFullscreen) this.scale.stopFullscreen(); });
        this.killKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.killKey.on('down', () => { if (this.role === 'impostor') this.tryKill(); });
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.interactKey.on('down', () => { if (this.role === 'crewmate') this.tryInteract(); });
        this.emergencyKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.emergencyKey.on('down', () => {

            // I fantasmi NON possono chiamare il meeting
            if (this.localPlayer && this.localPlayer.isGhost) return;
            // Nasconde dead.png quando parte il meeting
            if (this.deadOverlay) {
                this.deadOverlay.setVisible(false);
            }
            if (this.gameEnded) return;
            if (this.killReportAvailable) {
                this.triggerEmergencyMeeting(false);
                this.hideKillReportButton();
            } else if (!this.emergencyMeetingCalled) {
                this.triggerEmergencyMeeting(false);
            } else if (!this.meetingParticipant) {
                this.joinEmergencyMeeting();
            }
        });
        this.joinMeetingKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.declineMeetingKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    createNetworkPlayers() {
        if (network && network.getAllPlayers) {
            const players = network.getAllPlayers();
            players.forEach(playerData => {
                if (!this.players.has(playerData.id)) {
                    const player = this.createPlayer(playerData, this.role, this.impostorNames);
                    if (playerData.id === network.playerId) {
                        this.localPlayer = player;
                        this.localPlayerId = playerData.id;
                    }
                }
            });
        }
    }

    setupNetworkEvents() {
        if (!network || !network.on) return;
        network.on('onPlayerJoined', (msg) => {
            if (msg.players) msg.players.forEach(p => { if (!this.players.has(p.id)) this.createPlayer(p, this.role, this.impostorNames); });
        });
        network.on('onPlayerLeft', (msg) => {
            if (msg.players) {
                const existingIds = new Set(msg.players.map(p => p.id));
                this.players.forEach((player, id) => {
                    if (!existingIds.has(id)) { player.nameText.destroy(); player.destroy(); this.players.delete(id); }
                });
            }
        });
        network.on('onPlayerMoved', (msg) => {
            const player = this.players.get(msg.playerId);
            if (player && player !== this.localPlayer) {
                this.tweens.add({ targets: player, x: msg.x, y: msg.y, duration: this.moveThrottle, ease: 'Linear' });
                if (player.nameText) player.nameText.setPosition(msg.x, msg.y - 30);
            }
        });
        network.on('onPlayerKilled', (msg) => {
            const killedPlayer = this.players.get(msg.targetId);

            // 1. CREA IL CADAVERE NEL PUNTO ESATTO DELLA KILL (visibile a tutti)
            if (killedPlayer) {
                const deadBody = this.add.image(killedPlayer.x, killedPlayer.y, 'dead')
                    .setOrigin(0.5)
                    .setDepth(1500)
                    .setDisplaySize(50, 45); // dimensione stile Among Us

                // Salviamo il cadavere per poterlo rimuovere al meeting
                if (!this.deadBodies) this.deadBodies = [];
                this.deadBodies.push(deadBody);
            }

            // 2. NASCONDE IL PLAYER UCCISO
            if (killedPlayer) {
                killedPlayer.setVisible(false);
                if (killedPlayer.nameText) killedPlayer.nameText.setVisible(false);
            }

            // Trasforma il giocatore ucciso in fantasma
            if (msg.targetId === network.playerId) {
                // Il giocatore locale diventa fantasma
                this.localPlayer.isGhost = true;

                // Lui si vede normalmente
                this.localPlayer.setVisible(true);
                if (this.localPlayer.nameText) this.localPlayer.nameText.setVisible(true);

                // Ma gli altri non lo vedono
            } else {
                // Gli altri client nascondono il giocatore morto
                if (killedPlayer) {
                    killedPlayer.setVisible(false);
                    if (killedPlayer.nameText) killedPlayer.nameText.setVisible(false);
                }
            }

            // 3. COOLDOWN IMPOSTORE
            if (this.role === 'impostor' && msg.killerId === network.playerId) {
                this.killCooldown = 5;
            }

            // 4. MOSTRA IL BOTTONE REPORT SE È UNA KILL VALIDA
            const isKillerImpostor = this.impostorNames.some(imp => imp.id === msg.killerId);
            const isVictimCrewmate = !this.impostorNames.some(imp => imp.id === msg.targetId);

            if (isKillerImpostor && isVictimCrewmate && !this.gameEnded && !this.emergencyActive) {
                this.showKillReportButton();
            }
        });
        network.on('onTaskProgress', (msg) => { this.totalCompleted = msg.totalCompleted; this.totalRequired = msg.totalRequired; this.updateTaskProgress(); });
        network.on('onEmergencyMeeting', (msg) => { this.hideKillReportButton(); this.onEmergencyMeetingReceived(msg); this.deadBodies.forEach(body => body.setVisible(false));});
        network.on('onMeetingChat', (msg) => { this.addMeetingChatMessage(msg.sender || 'Anonimo', msg.text || ''); });
        network.on('onMeetingVote', (msg) => { if (msg.voterName && msg.targetName) this.addMeetingChatMessage('Sistema', `${msg.voterName} ha votato ${msg.targetName}`); });
        network.on('onMeetingResult', (msg) => {
            if (msg.result === 'ejected') this.addMeetingChatMessage('Sistema', `Votazione terminata: ${msg.targetName} è stato espulso (${msg.targetRole})`);
            else this.addMeetingChatMessage('Sistema', `Votazione terminata: ${msg.message}`);
            if (msg.result === 'ejected' && msg.targetRole === 'impostor') this.addMeetingChatMessage('Sistema', 'Impostore espulso: vincono i crewmate!');
            if (msg.result === 'no_eject') this.addMeetingChatMessage('Sistema', 'Nessuno espulso dalla votazione. Il gioco continua.');
            this.closeMeetingScreen();
        });
    }

    // Mostra l'immagine dead.png per il report
    showKillReportButton() {
        if (this.deadImageButton || this.killReportAvailable) return;
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        // Crea l'immagine in basso al centro
        const deadImg = this.add.image(width / 2, height - 80, 'dead').setOrigin(0.5).setScrollFactor(0).setDepth(4000);
        deadImg.setDisplaySize(120, 60); // dimensioni adatte
        deadImg.setInteractive({ useHandCursor: true });
        deadImg.on('pointerdown', () => {
            if (this.killReportAvailable && !this.gameEnded && !this.emergencyActive) {
                this.triggerEmergencyMeeting(false);
                this.hideKillReportButton();
            }
        });
        this.deadImageButton = deadImg;
        this.killReportAvailable = true;
        if (this.killReportTimer) clearTimeout(this.killReportTimer);
        this.killReportTimer = setTimeout(() => { if (this.killReportAvailable) this.hideKillReportButton(); }, 10000);
    }

    hideKillReportButton() {
        if (this.deadImageButton) {
            this.deadImageButton.destroy();
            this.deadImageButton = null;
        }
        this.killReportAvailable = false;
        if (this.killReportTimer) { clearTimeout(this.killReportTimer); this.killReportTimer = null; }
    }

    tryInteract() {
        if (this.gameEnded || !this.localPlayer || !this.taskLocations) return;
        for (const taskLocation of this.taskLocations) {
            if (taskLocation.completed) continue;
            if (Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, taskLocation.x, taskLocation.y) < 50) {
                this.scene.launch(taskLocation.taskType);
                this.scene.get(taskLocation.taskType).events.once('complete', () => {
                    this.scene.stop(taskLocation.taskType);
                    taskLocation.completed = true;
                    taskLocation.setTint(0x22c55e);
                    taskLocation.textLabel.setText('COMPLETATO');
                    this.completedTasks++;
                    this.updateTaskProgressBar();
                    if (this.completedTasks >= this.totalTasks) {
                        if (network && network.sendTaskCompleted) network.sendTaskCompleted();
                    } else {
                        if (network && network.sendTaskCompleted) network.sendTaskCompleted();
                    }
                });
                break;
            }
        }
    }

    createAnimations() {
        const anims = ['walk-down', 'walk-left', 'walk-right', 'walk-up', 'idle-down', 'idle-left', 'idle-right', 'idle-up'];
        anims.forEach(key => { if (this.anims.exists(key)) this.anims.remove(key); });
        this.anims.create({ key: 'walk-down', frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-left', frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-right', frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'walk-up', frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'idle-down', frames: [{ key: 'player', frame: 0 }] });
        this.anims.create({ key: 'idle-left', frames: [{ key: 'player', frame: 4 }] });
        this.anims.create({ key: 'idle-right', frames: [{ key: 'player', frame: 8 }] });
        this.anims.create({ key: 'idle-up', frames: [{ key: 'player', frame: 12 }] });
    }

    createPlayer(playerData, localRole, impostorNames) {
        if (!playerData || !playerData.id) return null;
        let x = (typeof playerData.x === 'number' ? playerData.x : null);
        let y = (typeof playerData.y === 'number' ? playerData.y : null);
        if (x === null || y === null) {
            const baseX = this.emergencyMeetingPoint ? this.emergencyMeetingPoint.x : (this.map ? this.map.widthInPixels / 2 : 480);
            const baseY = this.emergencyMeetingPoint ? this.emergencyMeetingPoint.y : (this.map ? this.map.heightInPixels / 2 : 320);
            const offset = this.spawnOffsets[this.nextSpawnIndex % this.spawnOffsets.length];
            x = baseX + offset.x; y = baseY + offset.y;
            this.nextSpawnIndex++;
        }
        if (this.map && this.map.widthInPixels > 1000) { x = (typeof playerData.x === 'number' ? playerData.x : x); y = (typeof playerData.y === 'number' ? playerData.y : y); }
        const nickname = playerData.nickname || 'Player';
        const color = playerData.color || 'red';
        const player = this.physics.add.sprite(x, y, 'player');
        player.setCollideWorldBounds(true); player.setPushable(false); player.lastDirection = 'down'; player.setDepth(1000);
        const colors = { red: 0xff4757, blue: 0x5352ed, green: 0x2ed573, yellow: 0xffa502, orange: 0xff7f50, purple: 0x6c5ce7, cyan: 0x00cec9, pink: 0xfd79a8, lime: 0x00b894, brown: 0x8b4513 };
        player.setTint(colors[color] || 0xffffff);
        const isImpostor = impostorNames && impostorNames.some(imp => imp.id === playerData.id);
        const isLocalImpostor = localRole === 'impostor';
        const nameColor = (isLocalImpostor && (isImpostor || playerData.id === network.playerId)) ? '#ff0000' : '#ffffff';
        const nameText = this.add.text(Math.round(x), Math.round(y - 30), nickname, { fontSize: '13px', fontFamily: 'Fredoka, Arial', color: nameColor, stroke: '#000000', strokeThickness: 1.5, padding: { x: 3, y: 0 }, align: 'center' }).setResolution(3).setOrigin(0.5).setDepth(2000);
        player.nameText = nameText;
        player.tasksCompleted = playerData.tasksCompleted || 0;
        player.totalTasks = playerData.totalTasks || 5;
        player.role = playerData.role;
        player.isDead = playerData.isDead || false;
        player.isGhost = false;
        this.mapLayers.forEach(layer => this.physics.add.collider(player, layer));
        this.players.set(playerData.id, player);
        if (network && network.playerId && playerData.id === network.playerId) {
            this.localPlayer = player;
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
            this.cameras.main.setZoom(2.5);
        }
        return player;
    }

    tryKill() {
        if (this.gameEnded || !this.localPlayer || this.role !== 'impostor' || this.killCooldown > 0) return;
        const killRange = 50;
        let closestCrewmate = null, closestDistance = killRange;
        this.players.forEach((player, id) => {
            if (id !== network.playerId && player !== this.localPlayer) {
                const distance = Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, player.x, player.y);
                if (distance < closestDistance && !this.impostorNames.some(imp => imp.id === id)) {
                    closestCrewmate = id; closestDistance = distance;
                }
            }
        });
        if (closestCrewmate) { network.sendKill(closestCrewmate); this.killCooldown = 10; }
    }

    createDebugInfo() {
        this.fpsText = this.add.text(10, 10, 'FPS: 0', { font: '14px Arial', fill: '#ffffff', backgroundColor: '#000000', padding: { x: 5, y: 3 } }).setScrollFactor(0).setDepth(3000);
        this.posText = this.add.text(10, 35, 'X: 0, Y: 0', { font: '14px Arial', fill: '#ffffff', backgroundColor: '#000000', padding: { x: 5, y: 3 } }).setScrollFactor(0).setDepth(3000);
        this.playerText = this.add.text(10, 60, 'Players: 0', { font: '14px Arial', fill: '#ffffff', backgroundColor: '#000000', padding: { x: 5, y: 3 } }).setScrollFactor(0).setDepth(3000);
        this.killCooldownText = this.add.text(10, 85, 'Kill: Ready', { font: '14px Arial', fill: '#00ff00', backgroundColor: '#000000', padding: { x: 5, y: 3 } }).setScrollFactor(0).setDepth(3000);
        this.killCooldownText.setVisible(false);
    }

    createTaskProgressBar() {
        const width = this.cameras.main.width;
        this.progressBarBg = this.add.graphics(); this.progressBarBg.fillStyle(0x000000, 0.8); this.progressBarBg.fillRect(width / 2 - 200, 10, 400, 20); this.progressBarBg.setScrollFactor(0).setDepth(2999);
        this.progressBar = this.add.graphics(); this.progressBar.fillStyle(0x00ff00, 1); this.progressBar.fillRect(width / 2 - 195, 15, 0, 10); this.progressBar.setScrollFactor(0).setDepth(3000);
        this.progressText = this.add.text(width / 2, 20, 'Task: 0/0', { font: '14px Arial', fill: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);
        this.progressBarBg.setVisible(false); this.progressBar.setVisible(false); this.progressText.setVisible(false);
    }

    update(time, delta) {
        this.checkIndoorState();

        if (this.fpsText)
            this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);

        if (this.posText && this.localPlayer)
            this.posText.setText(`X: ${Math.round(this.localPlayer.x)}, Y: ${Math.round(this.localPlayer.y)}`);

        if (this.playerText)
            this.playerText.setText(`Players: ${this.players.size}`);

        // Gestione invito meeting
        if (this.emergencyMeetingCalled && !this.meetingParticipant) {
            if (this.joinMeetingKey && Phaser.Input.Keyboard.JustDown(this.joinMeetingKey))
                this.joinEmergencyMeeting();

            if (this.declineMeetingKey && Phaser.Input.Keyboard.JustDown(this.declineMeetingKey)) {
                this.closeMeetingJoinPrompt();
                this.emergencyMeetingCalled = false;
                this.addMeetingChatMessage('Sistema', 'Hai scelto di non partecipare al meeting.');
            }
        }

        // Cooldown impostore
        if (this.killCooldownText) {
            this.killCooldownText.setVisible(this.role === 'impostor');

            if (this.role === 'impostor') {
                if (this.killCooldown > 0) {
                    this.killCooldown -= delta / 1000;

                    if (this.killCooldown <= 0) {
                        this.killCooldown = 0;
                        this.killCooldownText.setText('Kill: Ready');
                        this.killCooldownText.setFill('#00ff00');
                    } else {
                        this.killCooldownText.setText(`Kill: ${Math.ceil(this.killCooldown)}s`);
                        this.killCooldownText.setFill('#ff0000');
                    }
                } else {
                    this.killCooldownText.setText('Kill: Ready');
                    this.killCooldownText.setFill('#00ff00');
                }
            }
        }

        // Se il gioco è fermo, stop movimento
        if (this.gameEnded || this.emergencyActive) {
            if (this.localPlayer) this.localPlayer.setVelocity(0, 0);
            return;
        }

        if (!this.localPlayer) return;

        // 🔥 GESTIONE FANTASMI
        this.players.forEach((player, id) => {
            if (player.isGhost) {

                // Il fantasma si vede SOLO nel proprio client
                if (id === this.localPlayerId) {
                    player.setVisible(true);
                    if (player.nameText) player.nameText.setVisible(true);
                } else {
                    // Gli altri non vedono il fantasma
                    player.setVisible(false);
                    if (player.nameText) player.nameText.setVisible(false);
                }
            }
        });
        // 🔥 FINE GESTIONE FANTASMI

        // Movimento player locale
        const speed = 150;
        let vx = 0, vy = 0, moving = false;

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -speed; moving = true; this.localPlayer.lastDirection = 'left';
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = speed; moving = true; this.localPlayer.lastDirection = 'right';
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -speed; moving = true;
            if (vx === 0) this.localPlayer.lastDirection = 'up';
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = speed; moving = true;
            if (vx === 0) this.localPlayer.lastDirection = 'down';
        }

        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }

        this.localPlayer.setVelocity(vx, vy);

        if (moving)
            this.localPlayer.anims.play(`walk-${this.localPlayer.lastDirection}`, true);
        else {
            this.localPlayer.anims.play(`idle-${this.localPlayer.lastDirection}`, true);
            this.localPlayer.setVelocity(0, 0);
        }

        // Aggiorna posizione nome
        this.players.forEach(player => {
            if (player.nameText)
                player.nameText.setPosition(player.x, player.y - 30);
        });

        // Invio posizione al server
        if (time - this.lastMoveTime > this.moveThrottle && moving) {
            if (network && network.sendPlayerMove)
                network.sendPlayerMove(Math.round(this.localPlayer.x), Math.round(this.localPlayer.y));

            this.lastMoveTime = time;
        }
    }


    showRoleScreen() {
        if (this.roleScreenVisible || !this.role) return;
        this.roleScreenVisible = true;
        const width = this.cameras.main.width, height = this.cameras.main.height;
        const overlay = this.add.container(0, 0); overlay.setScrollFactor(0); overlay.setDepth(9999);
        const background = this.make.graphics({ x: 0, y: 0, add: false }); background.fillStyle(0x000000, 0.85); background.fillRect(0, 0, width, height);
        if (this.role === 'impostor') { const redOverlay = this.make.graphics({ x: 0, y: 0, add: false }); redOverlay.fillStyle(0xff0000, 0.1); redOverlay.fillRect(0, 0, width, height); overlay.add(redOverlay); }
        const roleText = this.add.text(width / 2, height / 2 - 80, this.role.toUpperCase(), { font: 'bold 60px Arial', fill: this.role === 'impostor' ? '#ff0000' : '#00ff00', align: 'center', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
        if (this.role === 'impostor' && this.impostorNames.length > 0) {
            const impostorListText = this.add.text(width / 2, height / 2 + 60, 'Collaboratori:\n' + this.impostorNames.map(name => name.nickname).join('\n'), { font: 'bold 24px Arial', fill: '#ff0000', align: 'center', stroke: '#000000', strokeThickness: 2 }).setOrigin(0.5);
            overlay.add(impostorListText);
        }
        overlay.add(background); overlay.add(roleText);
        this.time.delayedCall(3000, () => { this.tweens.add({ targets: overlay, alpha: 0, duration: 500, onComplete: () => { overlay.destroy(); this.showTaskProgressBarIfCrewmate(); } }); });
    }

    showGameEnd(winner) {
        if (this.gameEnded) return;
        this.gameEnded = true;
        this.hideKillReportButton();
        if (this.localPlayer) { this.localPlayer.setVelocity(0, 0); if (this.localPlayer.body) this.localPlayer.body.enable = false; }
        if (this.cursors) Object.values(this.cursors).forEach(key => key && key.enabled !== undefined && (key.enabled = false));
        if (this.wasd) Object.values(this.wasd).forEach(key => key && (key.enabled = false));
        if (this.interactKey) this.interactKey.enabled = false;
        if (this.killKey) this.killKey.enabled = false;
        if (this.physics && this.physics.world) this.physics.world.pause();
        if (this.progressBarBg) this.progressBarBg.setVisible(false);
        if (this.progressBar) this.progressBar.setVisible(false);
        if (this.progressText) this.progressText.setVisible(false);
        if (winner === 'crewmate') this.showVictory();
        else if (winner === 'impostor') this.showDefeat();
    }

    showVictory() {
        const centerX = this.cameras.main.centerX, centerY = this.cameras.main.centerY, width = this.cameras.main.width, height = this.cameras.main.height;
        if (this.physics && this.physics.world) this.physics.world.pause();
        if (this.localPlayer) { this.localPlayer.setVelocity(0, 0); if (this.localPlayer.body) this.localPlayer.body.enable = false; }
        const overlay = this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.75).setDepth(10050).setScrollFactor(0);
        const isWinner = (this.role === 'crewmate');
        const panelFillColor = isWinner ? 0x1a2f26 : 0x3d1313;
        const panelStrokeColor = isWinner ? 0x33d1aa : 0xff5a5a;
        const titleTextContent = isWinner ? '🎉 VITTORIA! 🎉' : '☠️ SCONFITTA ☠️';
        const titleTextColor = isWinner ? '#00e297' : '#ff6969';
        const subtitleTextContent = isWinner ? 'Hai vinto come crewmate!' : 'Hai perso come impostore.';
        const winnerTextContent = isWinner ? 'I crewmate hanno vinto!' : 'Gli impostori hanno vinto!';
        const panel = this.add.rectangle(centerX, centerY, 540, 260, panelFillColor).setStrokeStyle(4, panelStrokeColor).setDepth(10051).setScrollFactor(0).setScale(0);
        this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, duration: 450, ease: 'Back.easeOut' });
        const titleText = this.add.text(centerX, centerY - 70, titleTextContent, { fontSize: '38px', fill: titleTextColor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setDepth(10052).setAlpha(1).setScrollFactor(0);
        const subtitleText = this.add.text(centerX, centerY - 20, subtitleTextContent, { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(10052).setAlpha(1).setScrollFactor(0);
        const winnerText = this.add.text(centerX, centerY + 20, winnerTextContent, { fontSize: '22px', fill: isWinner ? '#00e297' : '#ff7a7a', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(10052).setAlpha(1).setScrollFactor(0);
        const continueBtn = this.add.text(centerX, centerY + 80, 'RITORNA AL MENU', { fontSize: '22px', fill: '#ffffff', backgroundColor: isWinner ? '#36b67a' : '#d23a3a', padding: { x: 24, y: 10 }, fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(10053).setAlpha(0).setScrollFactor(0);
        this.tweens.add({ targets: titleText, alpha: 1, duration: 300, delay: 100 });
        this.tweens.add({ targets: subtitleText, alpha: 1, duration: 300, delay: 300 });
        this.tweens.add({ targets: winnerText, alpha: 1, duration: 300, delay: 500 });
        this.tweens.add({ targets: continueBtn, alpha: 1, duration: 300, delay: 700 });
        continueBtn.on('pointerdown', () => location.reload());
        continueBtn.on('pointerover', () => { continueBtn.setBackgroundColor('#ff7878'); continueBtn.setScale(1.05); });
        continueBtn.on('pointerout', () => { continueBtn.setBackgroundColor('#ff3a3a'); continueBtn.setScale(1); });
    }

    showDefeat() {
        const centerX = this.cameras.main.centerX, centerY = this.cameras.main.centerY, width = this.cameras.main.width, height = this.cameras.main.height;
        if (this.physics && this.physics.world) this.physics.world.pause();
        if (this.localPlayer) { this.localPlayer.setVelocity(0, 0); if (this.localPlayer.body) this.localPlayer.body.enable = false; }
        const isWinner = (this.role === 'impostor');
        const overlay = this.add.rectangle(centerX, centerY, width, height, isWinner ? 0x003a00 : 0x2e0b0f, 0.78).setDepth(10050).setScrollFactor(0);
        const panelFillColor = isWinner ? 0x153a1e : 0x361114;
        const panelStrokeColor = isWinner ? 0x33d1aa : 0xff5a5a;
        const panel = this.add.rectangle(centerX, centerY, 540, 260, panelFillColor).setStrokeStyle(4, panelStrokeColor).setDepth(10051).setScrollFactor(0).setScale(0);
        this.tweens.add({ targets: panel, scaleX: 1, scaleY: 1, duration: 450, ease: 'Back.easeOut' });
        const titleTextContent = isWinner ? '🎉 VITTORIA! 🎉' : '☠️ SCONFITTA ☠️';
        const titleTextColor = isWinner ? '#00e297' : '#ff6969';
        const subtitleTextContent = isWinner ? 'Hai vinto come impostore!' : 'Hai perso come crewmate.';
        const winnerTextContent = 'Gli impostori hanno vinto!';
        const titleText = this.add.text(centerX, centerY - 70, titleTextContent, { fontSize: '36px', fill: titleTextColor, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2, align: 'center' }).setOrigin(0.5).setDepth(10052).setAlpha(1).setScrollFactor(0);
        const subtitleText = this.add.text(centerX, centerY - 20, subtitleTextContent, { fontSize: '20px', fill: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(10052).setAlpha(1).setScrollFactor(0);
        const winnerText = this.add.text(centerX, centerY + 20, winnerTextContent, { fontSize: '22px', fill: isWinner ? '#00e297' : '#ff7a7a', fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setDepth(10052).setAlpha(1).setScrollFactor(0);
        const continueBtn = this.add.text(centerX, centerY + 80, 'RITORNA AL MENU', { fontSize: '22px', fill: '#ffffff', backgroundColor: isWinner ? '#36b67a' : '#d23a3a', padding: { x: 24, y: 10 }, fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setInteractive({ cursor: 'pointer' }).setDepth(10053).setAlpha(0).setScrollFactor(0);
        this.tweens.add({ targets: titleText, alpha: 1, duration: 300, delay: 100 });
        this.tweens.add({ targets: subtitleText, alpha: 1, duration: 300, delay: 300 });
        this.tweens.add({ targets: winnerText, alpha: 1, duration: 300, delay: 500 });
        this.tweens.add({ targets: continueBtn, alpha: 1, duration: 300, delay: 700 });
        continueBtn.on('pointerdown', () => location.reload());
        continueBtn.on('pointerover', () => { continueBtn.setBackgroundColor('#ff7a7a'); continueBtn.setScale(1.05); });
        continueBtn.on('pointerout', () => { continueBtn.setBackgroundColor('#d23a3a'); continueBtn.setScale(1); });
    }

    showTaskProgressBarIfCrewmate() {
        if (this.role === 'crewmate') {
            if (this.progressBarBg) this.progressBarBg.setVisible(true);
            if (this.progressBar) this.progressBar.setVisible(true);
            if (this.progressText) this.progressText.setVisible(true);
            this.updateTaskProgress();
        }
    }

    createEmergencyButton() {
        const width = this.cameras.main.width;
        const buttonSize = Math.min(90, Math.max(60, Math.round(width * 0.12)));
        this.emergencyButton = this.add.container(width - buttonSize - 20, 20).setScrollFactor(0).setDepth(3100);
        const bg = this.add.circle(0, 0, buttonSize / 2, 0xff4d4d, 0.95);
        const icon = this.add.text(0, 0, '📣', { fontSize: `${Math.round(buttonSize * 0.5)}px`, align: 'center' }).setOrigin(0.5);
        const label = this.add.text(0, buttonSize / 2 + 10, 'EMERGENCY', { fontSize: `${Math.round(buttonSize * 0.2)}px`, fill: '#ffffff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0);
        this.emergencyButton.add([bg, icon, label]);
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => { if (!this.gameEnded && !this.emergencyActive) this.triggerEmergencyMeeting(false); });
        this.emergencyButton.setAlpha(0.88);
    }

    createMeetingScreen() {
        if (this.meetingScreen) return;
        this.meetingParticipant = true;
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const overlay = this.add.rectangle(w/2, h/2, w*0.94, h*0.9, 0x000000, 0.85).setScrollFactor(0).setDepth(3300);
        const panel = this.add.rectangle(w/2, h/2, w*0.92, h*0.88, 0x1a1f2c, 0.92).setStrokeStyle(3, 0x00d2ff).setScrollFactor(0).setDepth(3301);
        const title = this.add.text(w/2, h/2 - h*0.35, 'EMERGENCY MEETING', { fontSize: '34px', fill: '#ffeb3b', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(3302);
        if (!this.meetingChatEntries) this.meetingChatEntries = [];
        this.meetingChatText = this.add.text(w/2 - w*0.4, h/2 - h*0.25, this.meetingChatEntries.join('\n'), { fontSize: '18px', fill: '#ffffff', wordWrap: { width: w*0.8 }, lineSpacing: 6 }).setOrigin(0, 0).setScrollFactor(0).setDepth(3302);
        this.meetingDraft = '';
        this.meetingDraftText = this.add.text(w/2 - w*0.4, h/2 + h*0.26, '> ', { fontSize: '18px', fill: '#00d2ff', wordWrap: { width: w*0.8 }, backgroundColor: '#000000', padding: { x: 8, y: 6 } }).setOrigin(0, 0).setScrollFactor(0).setDepth(3302);
        this.meetingInputTextPrompt = this.add.text(w/2 - w*0.4, h/2 + h*0.31, 'Premi ENTER per inviare, ESC per chiudere', { fontSize: '14px', fill: '#ffffff', align: 'left' }).setOrigin(0, 0).setScrollFactor(0).setDepth(3302);
        if (this.input && this.input.keyboard) { this.previousKeyboardEnabled = this.input.keyboard.enabled; this.input.keyboard.enabled = false; }
        this.createMeetingInputElement();
        this.createMeetingChatLogElement();
        const sendBtn = this.add.text(w/2 + w*0.38, h/2 + h*0.28, 'INVIO', { fontSize: '18px', fill: '#ffffff', backgroundColor: '#0099ff', padding: { x: 10, y: 6 }, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(3302).setInteractive({ cursor: 'pointer' });
        sendBtn.on('pointerdown', () => this.submitMeetingChat());
        const closeBtn = this.add.text(w/2 + w*0.44, h/2 - h*0.38, '✕', { fontSize: '24px', fill: '#ffffff', backgroundColor: '#ff4c4c', padding: { x: 8, y: 4 }, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(3302).setInteractive({ cursor: 'pointer' });
        closeBtn.on('pointerdown', () => this.closeMeetingScreen());
        this.meetingScreen = { overlay, panel, title, closeBtn, sendBtn };
        this.addMeetingChatMessage('Sistema', 'La riunione è iniziata. Scrivi nel box e premi Invio.');
        this.createMeetingVoteOptions();
    }

    createMeetingInputElement() {
        this.removeMeetingInputElement();
        const inputEl = document.createElement('input');
        inputEl.id = 'meeting-chat-input';
        inputEl.type = 'text';
        inputEl.placeholder = 'Scrivi messaggio...';
        inputEl.style.position = 'fixed';
        inputEl.style.left = '6%';
        inputEl.style.bottom = '8%';
        inputEl.style.width = '54%';
        inputEl.style.zIndex = '9999';
        inputEl.style.padding = '8px';
        inputEl.style.fontSize = '16px';
        inputEl.style.borderRadius = '6px';
        inputEl.style.border = '2px solid #00d2ff';
        inputEl.style.background = 'rgba(0,0,0,0.75)';
        inputEl.style.color = '#ffffff';
        inputEl.style.outline = 'none';
        inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.submitMeetingChat(); } if (e.key === 'Escape') { e.preventDefault(); this.closeMeetingScreen(); } });
        document.body.appendChild(inputEl);
        inputEl.focus();
        this.meetingInputElement = inputEl;
    }

    createMeetingChatLogElement() {
        this.removeMeetingChatLogElement();
        const logEl = document.createElement('div');
        logEl.id = 'meeting-chat-log';
        logEl.style.position = 'fixed';
        logEl.style.left = '6%';
        logEl.style.top = '8%';
        logEl.style.width = '54%';
        logEl.style.maxHeight = '30%';
        logEl.style.overflowY = 'auto';
        logEl.style.zIndex = '10000';
        logEl.style.pointerEvents = 'none';
        logEl.style.padding = '10px';
        logEl.style.background = 'rgba(0,0,0,0.65)';
        logEl.style.color = '#ffffff';
        logEl.style.fontSize = '16px';
        logEl.style.border = '2px solid #00d2ff';
        logEl.style.borderRadius = '8px';
        logEl.style.whiteSpace = 'pre-line';
        document.body.appendChild(logEl);
        this.meetingChatLogElement = logEl;
        this.updateMeetingChatLog();
    }

    removeMeetingChatLogElement() { if (this.meetingChatLogElement) { this.meetingChatLogElement.remove(); this.meetingChatLogElement = null; } }
    updateMeetingChatLog() { if (this.meetingChatLogElement && this.meetingChatEntries) this.meetingChatLogElement.textContent = this.meetingChatEntries.join('\n'); }
    removeMeetingInputElement() { if (this.meetingInputElement) { this.meetingInputElement.remove(); this.meetingInputElement = null; } }
    removeMeetingVoteButtonsElement() { if (this.meetingVoteButtonsElement) { this.meetingVoteButtonsElement.remove(); this.meetingVoteButtonsElement = null; } }

    addMeetingChatMessage(sender, message) {
        if (!this.meetingChatEntries) this.meetingChatEntries = [];
        this.meetingChatEntries.push(`${sender}: ${message}`);
        if (this.meetingChatEntries.length > 14) this.meetingChatEntries.shift();
        if (this.meetingChatText) this.meetingChatText.setText(this.meetingChatEntries.join('\n'));
        this.updateMeetingChatLog();
    }

    createMeetingVoteOptions() {
        this.removeMeetingVoteButtonsElement();
        this.hasVoted = false;
        const players = (network && network.getAllPlayers) ? network.getAllPlayers() : [];
        const localId = network ? network.playerId : null;
        const others = players.filter(p => p.id !== localId);
        const votePanel = document.createElement('div');
        votePanel.id = 'meeting-vote-buttons';
        votePanel.style.position = 'fixed';
        votePanel.style.right = '6%';
        votePanel.style.top = '18%';
        votePanel.style.maxWidth = '32%';
        votePanel.style.minWidth = '220px';
        votePanel.style.zIndex = '10005';
        votePanel.style.background = 'rgba(10, 18, 30, 0.94)';
        votePanel.style.border = '2px solid #00d2ff';
        votePanel.style.borderRadius = '14px';
        votePanel.style.padding = '14px';
        votePanel.style.color = '#ffffff';
        votePanel.style.fontFamily = 'Arial, sans-serif';
        votePanel.style.fontSize = '16px';
        votePanel.style.boxShadow = '0 0 25px rgba(0,0,0,0.45)';
        votePanel.style.pointerEvents = 'auto';
        const title = document.createElement('div'); title.textContent = 'Vota un giocatore (uno solo):'; title.style.marginBottom = '10px'; title.style.fontWeight = '700'; title.style.color = '#ffdd57';
        votePanel.appendChild(title);
        const buttonsWrapper = document.createElement('div'); buttonsWrapper.style.display = 'flex'; buttonsWrapper.style.flexDirection = 'column'; buttonsWrapper.style.gap = '10px';
        if (others.length === 0) { const noOther = document.createElement('div'); noOther.textContent = 'Nessun altro giocatore'; noOther.style.color = '#ffffff'; buttonsWrapper.appendChild(noOther); }
        else {
            others.forEach((player) => {
                const playerBtn = document.createElement('button');
                playerBtn.type = 'button'; playerBtn.textContent = player.nickname;
                playerBtn.style.width = '100%'; playerBtn.style.padding = '10px 12px'; playerBtn.style.fontSize = '16px'; playerBtn.style.fontWeight = '700';
                playerBtn.style.color = '#ffffff'; playerBtn.style.background = '#2e3b4f'; playerBtn.style.border = '2px solid #000000'; playerBtn.style.borderRadius = '10px';
                playerBtn.style.cursor = 'pointer'; playerBtn.style.textAlign = 'left'; playerBtn.style.transition = 'background 0.2s ease, transform 0.1s ease';
                playerBtn.addEventListener('mouseenter', () => { if (!this.hasVoted) playerBtn.style.background = '#426793'; });
                playerBtn.addEventListener('mouseleave', () => { if (!this.hasVoted) playerBtn.style.background = '#2e3b4f'; });
                playerBtn.addEventListener('click', () => {
                    if (this.hasVoted) return;
                    this.submitMeetingVote(player);
                    this.hasVoted = true;
                    this.disableMeetingVoteButtons();
                    playerBtn.style.background = '#4fa8ff'; playerBtn.style.color = '#000000'; playerBtn.style.borderColor = '#ffffff';
                });
                buttonsWrapper.appendChild(playerBtn);
            });
        }
        const skipBtn = document.createElement('button'); skipBtn.type = 'button'; skipBtn.textContent = 'SKIP';
        skipBtn.style.width = '100%'; skipBtn.style.padding = '10px 12px'; skipBtn.style.fontSize = '16px'; skipBtn.style.fontWeight = '700';
        skipBtn.style.color = '#ffffff'; skipBtn.style.background = '#555555'; skipBtn.style.border = '2px solid #000000'; skipBtn.style.borderRadius = '10px';
        skipBtn.style.cursor = 'pointer'; skipBtn.style.marginTop = '10px'; skipBtn.style.transition = 'background 0.2s ease, transform 0.1s ease';
        skipBtn.addEventListener('mouseenter', () => { if (!this.hasVoted) skipBtn.style.background = '#6e7d8f'; });
        skipBtn.addEventListener('mouseleave', () => { if (!this.hasVoted) skipBtn.style.background = '#555555'; });
        skipBtn.addEventListener('click', () => {
            if (this.hasVoted) return;
            this.submitMeetingVote(null);
            this.hasVoted = true;
            this.disableMeetingVoteButtons();
            skipBtn.style.background = '#4fa8ff'; skipBtn.style.color = '#000000'; skipBtn.style.borderColor = '#ffffff';
        });
        buttonsWrapper.appendChild(skipBtn);
        votePanel.appendChild(buttonsWrapper);
        document.body.appendChild(votePanel);
        this.meetingVoteButtonsElement = votePanel;
    }

    disableMeetingVoteButtons() {
        if (this.meetingVoteContainer) this.meetingVoteContainer.iterate(child => { if (child && child.setInteractive && child.disableInteractive) child.disableInteractive(); });
        if (this.meetingVoteButtonsElement) { const btns = this.meetingVoteButtonsElement.querySelectorAll('button'); btns.forEach(btn => { btn.disabled = true; btn.style.cursor = 'default'; btn.style.opacity = '0.65'; }); }
    }

    submitMeetingVote(player) {
        if (this.hasVoted && player) return;
        if (!player) { this.addMeetingChatMessage('Sistema', 'Hai votato di non espellere nessuno (skip).'); if (network && network.sendMeetingVote) network.sendMeetingVote('skip'); return; }
        if (!player.id) return;
        this.addMeetingChatMessage('Sistema', `Hai votato ${player.nickname}`);
        if (network && network.sendMeetingVote) network.sendMeetingVote(player.id);
    }

    handleMeetingVote(message) { if (message && message.voterName && message.targetName) this.addMeetingChatMessage('Sistema', `${message.voterName} ha votato ${message.targetName}`); }

    handleMeetingTyping(event) {
        if (!this.meetingScreen) return;
        if (this.meetingInputElement && document.activeElement === this.meetingInputElement) { if (event.key === 'Escape') this.closeMeetingScreen(); return; }
        if (event.key === 'Escape') { this.closeMeetingScreen(); return; }
        if (event.key === 'Enter') { event.preventDefault(); this.submitMeetingChat(); return; }
        if (event.key === 'Backspace') this.meetingDraft = this.meetingDraft.slice(0, -1);
        else if (event.key.length === 1) this.meetingDraft += event.key;
        if (this.meetingDraftText) this.meetingDraftText.setText('> ' + this.meetingDraft);
    }

    submitMeetingChat() {
        if (!this.meetingScreen || !this.meetingParticipant) return;
        let text = '';
        if (this.meetingInputElement) { text = (this.meetingInputElement.value || '').trim(); this.meetingInputElement.value = ''; }
        if (!text && this.meetingDraft) { text = (this.meetingDraft || '').trim(); this.meetingDraft = ''; if (this.meetingDraftText) this.meetingDraftText.setText('> '); }
        if (!text) return;
        this.addMeetingChatMessage('Tu', text);
        if (network && network.sendMeetingChat) network.sendMeetingChat(text);
    }

    closeMeetingScreen() {
        if (!this.meetingScreen) return;
        if (this.meetingScreen.overlay) this.meetingScreen.overlay.destroy();
        if (this.meetingScreen.panel) this.meetingScreen.panel.destroy();
        if (this.meetingScreen.title) this.meetingScreen.title.destroy();
        if (this.meetingDraftText) { this.meetingDraftText.destroy(); this.meetingDraftText = null; }
        if (this.meetingInputTextPrompt) { this.meetingInputTextPrompt.destroy(); this.meetingInputTextPrompt = null; }
        if (this.meetingChatText) { this.meetingChatText.destroy(); this.meetingChatText = null; }
        if (this.meetingScreen.closeBtn) this.meetingScreen.closeBtn.destroy();
        if (this.meetingVoteContainer) { this.meetingVoteContainer.destroy(); this.meetingVoteContainer = null; }
        this.removeMeetingVoteButtonsElement();
        if (this.input && this.input.keyboard) { this.input.keyboard.off('keydown', this.handleMeetingTyping, this); this.input.keyboard.enabled = (this.previousKeyboardEnabled !== undefined) ? this.previousKeyboardEnabled : true; this.previousKeyboardEnabled = undefined; }
        this.removeMeetingInputElement();
        this.removeMeetingChatLogElement();
        this.meetingScreen = null;
        this.meetingDraft = '';
        this.emergencyActive = false;
        this.meetingParticipant = false;
        this.emergencyMeetingCalled = false;
    }

    showMeetingJoinPrompt() {
        if (this.meetingJoinPrompt) return;
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const box = this.add.rectangle(w/2, h/2, w*0.5, h*0.18, 0x1b2633, 0.9).setScrollFactor(0).setDepth(3400);
        const text = this.add.text(w/2, h/2 - 20, 'EMERGENCY MEETING chiamata! Premi J per partecipare o C per ignorare.', { fontSize: '18px', fill: '#ffffff', align: 'center', wordWrap: { width: w*0.45 } }).setOrigin(0.5).setScrollFactor(0).setDepth(3401);
        this.meetingJoinPrompt = this.add.container(0, 0, [box, text]);
    }

    closeMeetingJoinPrompt() { if (this.meetingJoinPrompt) { this.meetingJoinPrompt.destroy(); this.meetingJoinPrompt = null; } }

    joinEmergencyMeeting() {
        if (!this.emergencyMeetingCalled || this.meetingParticipant) return;
        this.meetingParticipant = true; this.emergencyActive = true;
        this.closeMeetingJoinPrompt();
        this.createMeetingScreen();
        this.addMeetingChatMessage('Sistema', 'Hai partecipato alla riunione. Scrivi ora o vota un giocatore.');
    }

    onEmergencyMeetingReceived(msg) {
        if (this.gameEnded || this.emergencyMeetingCalled) return;
        this.emergencyMeetingCalled = true;
        this.joinEmergencyMeeting();
        if (msg.x && msg.y && this.localPlayer) { this.localPlayer.setPosition(msg.x, msg.y - 40); if (this.localPlayer.body) this.localPlayer.body.reset(msg.x, msg.y - 40); this.cameras.main.pan(msg.x, msg.y, 300, 'Power2'); }
    }

    triggerEmergencyMeeting(isRemote = false) {
        if (this.emergencyMeetingCalled) return;
        this.emergencyMeetingCalled = true;
        if (!isRemote && network && network.sendEmergency) network.sendEmergency();
        if (this.localPlayer && this.emergencyMeetingPoint) { this.localPlayer.setPosition(this.emergencyMeetingPoint.x, this.emergencyMeetingPoint.y - 40); if (this.localPlayer.body) this.localPlayer.body.reset(this.emergencyMeetingPoint.x, this.emergencyMeetingPoint.y - 40); this.cameras.main.pan(this.emergencyMeetingPoint.x, this.emergencyMeetingPoint.y, 300, 'Power2'); }
        this.showMeetingJoinPrompt();
        if (!isRemote) this.joinEmergencyMeeting();
    }

    updateTaskProgress() {
        if (this.role !== 'crewmate') return;
        const totalCompleted = this.totalCompleted || 0;
        const totalRequired = this.totalRequired || 0;
        const width = this.cameras.main.width;
        const progressRatio = totalRequired > 0 ? totalCompleted / totalRequired : 0;
        const barWidth = Math.max(0, Math.min(390, progressRatio * 390));
        if (this.progressBar) { this.progressBar.clear(); this.progressBar.fillStyle(0x00ff00, 1); this.progressBar.fillRect(width / 2 - 195, 15, barWidth, 10); }
        if (this.progressText) this.progressText.setText(`Task: ${totalCompleted}/${totalRequired}`);
    }
}