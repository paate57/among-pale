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
        this.killCooldown = 0; // Tempo rimanente del cooldown in secondi
        this.killCooldownText = null;
    }

    preload() {
        // Tileset
        this.load.image('tiles', 'assets/tileset.jpg');
        this.load.image('tiles2', 'assets/tileset2.png');
        
        // Mappa JSON (Tiled, embedded)
        this.load.tilemapTiledJSON('map', 'assets/map-layer1.json');
        
        // Player
        this.load.spritesheet('player', 'assets/player.png', {
            frameWidth: 32,
            frameHeight: 48
        });
        
        // Mostra barra di caricamento
        this.createLoadingBar();
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
        
        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Caricamento...', {
            font: '20px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        const percentText = this.add.text(width / 2, height / 2, '0%', {
            font: '18px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.load.on('progress', (value) => {
            percentText.setText(parseInt(value * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });
    }

    create() {
        // Configura pixel art
        this.setupPixelArt();
        
        // Crea mappa
        this.createMap();
        
        // DEBUG: Stampa info mappa
        console.log('=== DEBUG MAPPA ===');
        console.log('Map exists:', !!this.map);
        if (this.map) {
            console.log('Tile width:', this.map.tileWidth);
            console.log('Tile height:', this.map.tileHeight);
            console.log('Map width in tiles:', this.map.width);
            console.log('Map height in tiles:', this.map.height);
            console.log('Map width in pixels:', this.map.widthInPixels);
            console.log('Map height in pixels:', this.map.heightInPixels);
            console.log('Layers:', this.map.layers.map(l => l.name));
            console.log('Tilesets:', this.map.tilesets.map(t => t.name));
        }
        console.log('===================');
        
        // Setup input
        this.setupInput();
        
        // Crea giocatori dal network
        this.createNetworkPlayers();
        
        // Setup eventi network
        this.setupNetworkEvents();
        
        // Crea animazioni
        this.createAnimations();
        
        // Crea task
        this.createTasks();
        
        // Crea barra progresso task
        this.createTaskProgressBar();
        
        // Info di debug
        this.createDebugInfo();
        
        // Mostra schermata del ruolo
        this.showRoleScreen();
    }

    setupPixelArt() {
        // Configurazione pixel-perfect
        this.cameras.main.roundPixels = true;
        
        // Imposta filtro nearest per tutte le texture caricate
        if (this.textures && this.textures.list) {
            Object.values(this.textures.list).forEach(texture => {
                if (texture && texture.setFilter) {
                    texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
                }
            });
        }
    }

    createMap() {
    this.map = this.make.tilemap({ key: 'map' });

    // Carica TUTTI i tileset presenti nel JSON
    const tilesets = this.map.tilesets.map(ts => {
        return this.map.addTilesetImage(ts.name, ts.name === 'tileset2' ? 'tiles2' : 'tiles');
    });

    this.mapLayers = [];

    this.map.layers.forEach((layerData, index) => {
        const layer = this.map.createLayer(layerData.name, tilesets, 0, 0);

        if (!layer) {
            console.warn("Layer non creato:", layerData.name);
            return;
        }

        // Collisioni
        if (layerData.properties) {
            const collides = layerData.properties.find(p => p.name === 'collides' && p.value === true);
            if (collides) {
                layer.setCollisionByExclusion([-1]);
            }
        }

        // Depth
        const name = layerData.name.toLowerCase();
        if (name.includes('paviment')) layer.setDepth(600);
        else if (name.includes('tetto')) layer.setDepth(3000 + index);
        else layer.setDepth(500 + index);

        this.mapLayers.push(layer);
    });

    // Bounds
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
}

    createTasks() {
        // Crea un task semplice: un rettangolo giallo al centro della mappa
        const centerX = this.map ? this.map.widthInPixels / 2 : 480;
        const centerY = this.map ? this.map.heightInPixels / 2 : 320;
        
        this.taskObject = this.add.rectangle(centerX, centerY, 32, 32, 0xffff00);
        this.taskObject.setStrokeStyle(2, 0x000000);
        this.taskObject.setDepth(800);
        
        // Testo sopra il task
        this.taskText = this.add.text(centerX, centerY - 40, 'TASK: Premi E', {
            font: '14px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setOrigin(0.5);
        
        console.log('Task creato a:', centerX, centerY);
    }

    createFallbackMap() {
        console.log('Creazione mappa di fallback...');
        
        // Crea una mappa semplice di fallback
        const tileSize = 32;
        const gridWidth = 50;
        const gridHeight = 50;
        
        // Crea un layer temporaneo
        const graphics = this.add.graphics();
        graphics.fillStyle(0x1a1a2e, 1);
        graphics.fillRect(0, 0, gridWidth * tileSize, gridHeight * tileSize);
        
        // Disegna una griglia
        graphics.lineStyle(1, 0x2d2d44, 0.3);
        for (let x = 0; x <= gridWidth; x++) {
            graphics.moveTo(x * tileSize, 0);
            graphics.lineTo(x * tileSize, gridHeight * tileSize);
        }
        for (let y = 0; y <= gridHeight; y++) {
            graphics.moveTo(0, y * tileSize);
            graphics.lineTo(gridWidth * tileSize, y * tileSize);
        }
        graphics.strokePath();
        
        // Imposta bounds
        const mapWidth = gridWidth * tileSize;
        const mapHeight = gridHeight * tileSize;
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
        
        // Tasto ESC per menu
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.escKey.on('down', () => {
            if (this.scale.isFullscreen) {
                this.scale.stopFullscreen();
            }
        });
        
        // Barra spaziatrice per uccidere (solo impostori)
        this.killKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.killKey.on('down', () => {
            if (this.role === 'impostor') {
                this.tryKill();
            }
        });
        
        // Tasto E per interagire con task (solo crewmate)
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.interactKey.on('down', () => {
            if (this.role === 'crewmate') {
                this.tryInteract();
            }
        });
    }

    createNetworkPlayers() {
        if (network && network.getAllPlayers) {
            const players = network.getAllPlayers();
            console.log('Creazione giocatori dal network:', players);
            
            players.forEach(playerData => {
                if (!this.players.has(playerData.id)) {
                    this.createPlayer(playerData, this.role, this.impostorNames);
                }
            });
        }
    }

    setupNetworkEvents() {
        if (!network || !network.on) return;
        
        network.on('onPlayerJoined', (msg) => {
            console.log('Player joined in game:', msg);
            if (msg.players) {
                msg.players.forEach(p => {
                    if (!this.players.has(p.id)) {
                        this.createPlayer(p, this.role, this.impostorNames);
                    }
                });
            }
        });
        
        network.on('onPlayerLeft', (msg) => {
            console.log('Player left in game:', msg);
            if (msg.players) {
                // Aggiorna tutti i player
                const existingIds = new Set(msg.players.map(p => p.id));
                
                // Rimuovi player non più nella lista
                this.players.forEach((player, id) => {
                    if (!existingIds.has(id)) {
                        player.nameText.destroy();
                        player.destroy();
                        this.players.delete(id);
                    }
                });
            }
        });
        
        network.on('onPlayerMoved', (msg) => {
            const player = this.players.get(msg.playerId);
            if (player && player !== this.localPlayer) {
                // Smooth movement per altri giocatori
                this.tweens.add({
                    targets: player,
                    x: msg.x,
                    y: msg.y,
                    duration: this.moveThrottle,
                    ease: 'Linear'
                });
                
                if (player.nameText) {
                    player.nameText.setPosition(msg.x, msg.y - 30);
                }
            }
        });
        
        network.on('onPlayerKilled', (msg) => {
            const killedPlayer = this.players.get(msg.targetId);
            if (killedPlayer) {
                console.log('Giocatore ucciso:', msg.targetId);
                // Nasconde il giocatore ucciso
                killedPlayer.setVisible(false);
                if (killedPlayer.nameText) {
                    killedPlayer.nameText.setVisible(false);
                }
                // Rimuove dalla fisica
                killedPlayer.body.enable = false;
                
                // Se siamo l'impostore che ha ucciso, attiva cooldown
                if (this.role === 'impostor' && msg.killerId === network.playerId) {
                    this.killCooldown = 5;
                }
            }
        });
        
        network.on('onTaskProgress', (msg) => {
            console.log('Task progress update:', msg);
            // Aggiorna progresso totale
            this.totalCompleted = msg.totalCompleted;
            this.totalRequired = msg.totalRequired;
            this.updateTaskProgress();
        });
    }

    tryInteract() {
        if (!this.localPlayer || !this.taskObject) return;
        
        // Controlla distanza dal task
        const distance = Phaser.Math.Distance.Between(
            this.localPlayer.x, this.localPlayer.y,
            this.taskObject.x, this.taskObject.y
        );
        
        if (distance < 50) { // Raggio di interazione
            console.log('Avvio task di cablaggio!');
            
            // Lancia la scena del task
            this.scene.launch('TaskCables');
            
            // Ascolta il completamento
            this.scene.get('TaskCables').events.once('complete', () => {
                console.log('Task completato!');
                
                // Chiudi la scena del task
                this.scene.stop('TaskCables');
                
                // Invia al server
                if (network && network.sendTaskCompleted) {
                    network.sendTaskCompleted();
                }
            });
        }
    }

    createAnimations() {
        // Rimuovi animazioni esistenti
        const anims = ['walk-down', 'walk-left', 'walk-right', 'walk-up',
                     'idle-down', 'idle-left', 'idle-right', 'idle-up'];
        
        anims.forEach(key => {
            if (this.anims.exists(key)) {
                this.anims.remove(key);
            }
        });
        
        // Camminata
        this.anims.create({
            key: 'walk-down',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk-left',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk-right',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 11 }),
            frameRate: 10,
            repeat: -1
        });
        
        this.anims.create({
            key: 'walk-up',
            frames: this.anims.generateFrameNumbers('player', { start: 12, end: 15 }),
            frameRate: 10,
            repeat: -1
        });
        
        // Idle
        this.anims.create({ key: 'idle-down', frames: [{ key: 'player', frame: 0 }] });
        this.anims.create({ key: 'idle-left', frames: [{ key: 'player', frame: 4 }] });
        this.anims.create({ key: 'idle-right', frames: [{ key: 'player', frame: 8 }] });
        this.anims.create({ key: 'idle-up', frames: [{ key: 'player', frame: 12 }] });
    }

    createPlayer(playerData, localRole, impostorNames) {
        if (!playerData || !playerData.id) return null;
        
        // CORREZIONE: Coordinate di spawn basate sulla dimensione effettiva della mappa
        // Se la mappa è piccola (960x640), usa il centro
        // Se playerData ha già coordinate valide, usale
        let x = playerData.x || 480;  // Centro di default per mappa 960x640
        let y = playerData.y || 320;
        
        // Se la mappa è più grande, spawna al centro della mappa reale
        if (this.map && this.map.widthInPixels > 1000) {
            x = playerData.x || this.map.widthInPixels / 2;
            y = playerData.y || this.map.heightInPixels / 2;
        }
        
        const nickname = playerData.nickname || 'Player';
        const color = playerData.color || 'red';
        
        const player = this.physics.add.sprite(x, y, 'player');
        player.setCollideWorldBounds(true);
        player.setPushable(false);
        player.lastDirection = 'down';
        player.setDepth(1000);
        
        // Colore del player
        const colors = {
            red: 0xff4757,
            blue: 0x5352ed,
            green: 0x2ed573,
            yellow: 0xffa502,
            orange: 0xff7f50,
            purple: 0x6c5ce7,
            cyan: 0x00cec9,
            pink: 0xfd79a8,
            lime: 0x00b894,
            brown: 0x8b4513
        };
        
        player.setTint(colors[color] || 0xffffff);
        
        // Nome sopra la testa
        const isImpostor = impostorNames && impostorNames.some(imp => imp.id === playerData.id);
        const isLocalImpostor = localRole === 'impostor';
        const nameColor = (isLocalImpostor && (isImpostor || playerData.id === network.playerId)) ? '#ff0000' : '#ffffff';
        const strokeColor = (isLocalImpostor && (isImpostor || playerData.id === network.playerId)) ? '#000000' : '#000000';
        
        const nameText = this.add.text(Math.round(x), Math.round(y - 30), nickname, {
            fontSize: '13px',
            fontFamily: 'Fredoka, Arial',
            color: nameColor,
            stroke: strokeColor,
            strokeThickness: 1.5,
            padding: { x: 3, y: 0 },
            align: 'center'
        })
        .setResolution(3)
        .setOrigin(0.5)
        .setDepth(2000);
        
        player.nameText = nameText;
        
        // Aggiungi dati task e ruolo
        player.tasksCompleted = playerData.tasksCompleted || 0;
        player.totalTasks = playerData.totalTasks || 5;
        player.role = playerData.role;
        player.isDead = playerData.isDead || false;
        
        // Collisioni con layer
        this.mapLayers.forEach(layer => {
            this.physics.add.collider(player, layer);
        });
        
        // Aggiungi al map
        this.players.set(playerData.id, player);
        
        // Se è il player locale
        if (network && network.playerId && playerData.id === network.playerId) {
            this.localPlayer = player;
            this.cameras.main.startFollow(player, true, 0.1, 0.1);
            this.cameras.main.setZoom(2.5);
            console.log(`Player locale creato a: ${x}, ${y}`);
        }
        
        return player;
    }

    tryKill() {
        if (!this.localPlayer || this.role !== 'impostor') return;
        
        // Controlla se è in cooldown
        if (this.killCooldown > 0) return;
        
        const killRange = 50; // Distanza massima per uccidere (ridotta alla metà)
        let closestCrewmate = null;
        let closestDistance = killRange;
        
        this.players.forEach((player, id) => {
            if (id !== network.playerId && player !== this.localPlayer) {
                const distance = Phaser.Math.Distance.Between(
                    this.localPlayer.x, this.localPlayer.y,
                    player.x, player.y
                );
                
                if (distance < closestDistance) {
                    // Verifica se è un crewmate (non nella lista impostori)
                    const isImpostor = this.impostorNames.some(imp => imp.id === id);
                    if (!isImpostor) {
                        closestCrewmate = id;
                        closestDistance = distance;
                    }
                }
            }
        });
        
        if (closestCrewmate) {
            network.sendKill(closestCrewmate);
            // Imposta cooldown locale temporaneo (verrà aggiornato dal server)
            this.killCooldown = 10;
        }
    }

    createDebugInfo() {
        // Crea testo FPS
        this.fpsText = this.add.text(10, 10, 'FPS: 0', {
            font: '14px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(3000);
        
        // Crea testo posizione
        this.posText = this.add.text(10, 35, 'X: 0, Y: 0', {
            font: '14px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(3000);
        
        // Crea testo player count
        this.playerText = this.add.text(10, 60, 'Players: 0', {
            font: '14px Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(3000);
        
        // Crea testo cooldown kill (visibile solo per impostori)
        this.killCooldownText = this.add.text(10, 85, 'Kill: Ready', {
            font: '14px Arial',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 5, y: 3 }
        }).setScrollFactor(0).setDepth(3000);
        this.killCooldownText.setVisible(false);
    }

    createTaskProgressBar() {
        const width = this.cameras.main.width;
        
        // Sfondo barra
        this.progressBarBg = this.add.graphics();
        this.progressBarBg.fillStyle(0x000000, 0.8);
        this.progressBarBg.fillRect(width / 2 - 200, 10, 400, 20);
        this.progressBarBg.setScrollFactor(0).setDepth(2999);
        
        // Barra progresso
        this.progressBar = this.add.graphics();
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(width / 2 - 195, 15, 0, 10); // Inizia vuota
        this.progressBar.setScrollFactor(0).setDepth(3000);
        
        // Testo progresso
        this.progressText = this.add.text(width / 2, 20, 'Task: 0/0', {
            font: '14px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3000);
        
        // Nasconde inizialmente
        this.progressBarBg.setVisible(false);
        this.progressBar.setVisible(false);
        this.progressText.setVisible(false);
    }

    update(time, delta) {
        // Aggiorna debug info
        if (this.fpsText) {
            this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`);
        }
        
        if (this.posText && this.localPlayer) {
            this.posText.setText(`X: ${Math.round(this.localPlayer.x)}, Y: ${Math.round(this.localPlayer.y)}`);
        }
        
        if (this.playerText) {
            this.playerText.setText(`Players: ${this.players.size}`);
        }
        
        // Aggiorna cooldown kill (visibile solo per impostori)
        if (this.killCooldownText) {
            this.killCooldownText.setVisible(this.role === 'impostor');
            
            if (this.role === 'impostor') {
                if (this.killCooldown > 0) {
                    this.killCooldown -= delta / 1000; // delta è in ms, converti in secondi
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
        
        if (!this.localPlayer) return;

        // Input movimento
        const speed = 150;
        let vx = 0, vy = 0;
        let moving = false;
        
        // Controlli orizzontali
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            vx = -speed;
            moving = true;
            this.localPlayer.lastDirection = 'left';
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            vx = speed;
            moving = true;
            this.localPlayer.lastDirection = 'right';
        }
        
        // Controlli verticali
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            vy = -speed;
            moving = true;
            if (vx === 0) this.localPlayer.lastDirection = 'up';
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            vy = speed;
            moving = true;
            if (vx === 0) this.localPlayer.lastDirection = 'down';
        }
        
        // Normalizza movimento diagonale
        if (vx !== 0 && vy !== 0) {
            vx *= 0.707;
            vy *= 0.707;
        }
        
        // Applica velocità
        this.localPlayer.setVelocity(vx, vy);
        
        // Animazioni
        if (moving) {
            this.localPlayer.anims.play(`walk-${this.localPlayer.lastDirection}`, true);
        } else {
            this.localPlayer.anims.play(`idle-${this.localPlayer.lastDirection}`, true);
            this.localPlayer.setVelocity(0, 0);
        }
        
        // Aggiorna nome sopra la testa per tutti i player
        this.players.forEach(player => {
            if (player.nameText) {
                player.nameText.setPosition(player.x, player.y - 30);
            }
        });
        
        // Invia movimento al server
        if (time - this.lastMoveTime > this.moveThrottle && moving) {
            if (network && network.sendPlayerMove) {
                network.sendPlayerMove(
                    Math.round(this.localPlayer.x),
                    Math.round(this.localPlayer.y)
                );
            }
            this.lastMoveTime = time;
        }
    }

    showRoleScreen() {
        if (!this.role) return;

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Crea overlay container
        const overlay = this.add.container(0, 0);
        overlay.setScrollFactor(0);
        overlay.setDepth(9999);

        // Sfondo scuro
        const background = this.make.graphics({
            x: 0,
            y: 0,
            add: false
        });
        background.fillStyle(0x000000, 0.85);
        background.fillRect(0, 0, width, height);

        // Effetto rosso se impostor
        if (this.role === 'impostor') {
            const redOverlay = this.make.graphics({
                x: 0,
                y: 0,
                add: false
            });
            redOverlay.fillStyle(0xff0000, 0.1);
            redOverlay.fillRect(0, 0, width, height);
            overlay.add(redOverlay);
        }

        // Titolo del ruolo
        const roleText = this.add.text(width / 2, height / 2 - 80, this.role.toUpperCase(), {
            font: 'bold 60px Arial',
            fill: this.role === 'impostor' ? '#ff0000' : '#00ff00',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Lista impostori se siamo impostor
        if (this.role === 'impostor' && this.impostorNames.length > 0) {
            const impostorListText = this.add.text(width / 2, height / 2 + 60, 
                'Collaboratori:\n' + this.impostorNames.map(name => name.nickname).join('\n'), 
                {
                    font: 'bold 24px Arial',
                    fill: '#ff0000',
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 2
                }
            ).setOrigin(0.5);
            
            overlay.add(impostorListText);
        }

        overlay.add(background);
        overlay.add(roleText);

        // Attendi un po' e poi nascondi gradualmente
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 500,
                onComplete: () => {
                    overlay.destroy();
                    // Mostra barra progresso se crewmate
                    this.showTaskProgressBarIfCrewmate();
                }
            });
        });
    }

    showTaskProgressBarIfCrewmate() {
        if (this.role === 'crewmate') {
            this.progressBarBg.setVisible(true);
            this.progressBar.setVisible(true);
            this.progressText.setVisible(true);
            this.updateTaskProgress();
        }
    }

    updateTaskProgress() {
        if (this.role !== 'crewmate') return;
        
        // Usa i valori ricevuti dal server
        const totalCompleted = this.totalCompleted;
        const totalRequired = this.totalRequired;
        
        // Aggiorna barra
        const width = this.cameras.main.width;
        const progressRatio = totalRequired > 0 ? totalCompleted / totalRequired : 0;
        const barWidth = Math.max(0, Math.min(390, progressRatio * 390)); // Max 390px
        
        this.progressBar.clear();
        this.progressBar.fillStyle(0x00ff00, 1);
        this.progressBar.fillRect(width / 2 - 195, 15, barWidth, 10);
        
        // Aggiorna testo
        this.progressText.setText(`Task: ${totalCompleted}/${totalRequired}`);
        
        console.log(`📊 Progresso task aggiornato: ${totalCompleted}/${totalRequired} (${Math.round(progressRatio * 100)}%)`);
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
        
        // Get center coordinates
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        // Simple background
        this.add.rectangle(centerX, centerY, 800, 600, 0x111827);
        
        // Exit button (X) in top-right corner
        const exitBtn = this.add.text(centerX + 380, centerY - 280, '✕', {
            fontSize: '32px',
            fill: '#ef4444',
            fontStyle: 'bold'
        }).setInteractive({ cursor: 'pointer' }).setDepth(50);
        
        exitBtn.on('pointerdown', () => {
            this.scene.stop('TaskCables');
        });
        
        exitBtn.on('pointerover', () => {
            exitBtn.setFill('#dc2626');
        });
        
        exitBtn.on('pointerout', () => {
            exitBtn.setFill('#ef4444');
        });
        
        // Title
        const titleBg = this.add.rectangle(centerX, centerY - 250, 500, 50, 0x1e3a8a)
            .setStrokeStyle(2, 0x3b82f6)
            .setDepth(1);
        
        const title = this.add.text(centerX, centerY - 250, "CABLAGGIO DI RETE", {
            fontSize: "28px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1);
        
        // Instructions
        this.add.text(centerX, centerY - 205, 
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
        this.counter = this.add.text(centerX, centerY - 175, 
            `Collegamenti: ${this.completed}/${labels.length} | Errori: ${this.wrongConnections}/${this.maxWrong}`,
            {
                fontSize: "16px",
                fill: "#fbbf24",
                fontStyle: "bold"
            }
        ).setOrigin(0.5).setDepth(1);
        
        // Left panel - depth 1
        const leftPanel = this.add.rectangle(centerX - 200, centerY + 40, 180, 400, 0x1e293b)
            .setStrokeStyle(2, 0x4b5563)
            .setDepth(1);
        
        this.add.text(centerX - 200, centerY - 135, "ORIGINE", {
            fontSize: "18px",
            fill: "#3b82f6",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1);
        
        // Right panel - depth 1
        const rightPanel = this.add.rectangle(centerX + 200, centerY + 40, 180, 400, 0x1e293b)
            .setStrokeStyle(2, 0x4b5563)
            .setDepth(1);
        
        this.add.text(centerX + 200, centerY - 135, "DESTINAZIONE", {
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
            const leftX = centerX - 200;
            const leftY = centerY - 90 + i * 60;
            
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
            const rightX = centerX + 200;
            const rightY = centerY - 90 + rightIndex * 60;
            
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
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;
        
        const overlay = this.add.rectangle(centerX, centerY, 800, 600, 0x000000, 0.6).setDepth(20);
        
        const panel = this.add.rectangle(centerX, centerY, 400, 120, 0x166534)
            .setStrokeStyle(3, 0x22c55e)
            .setDepth(20);
        
        this.add.text(centerX, centerY, "✓ RETE CONNESSA", {
            fontSize: "24px",
            fill: "#22c55e",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(20);
        
        this.time.delayedCall(1200, () => {
            this.events.emit("complete");
        });
    }
}

// Funzione di utilità per shake
function shake(scene, obj, intensity = 5) {
    const originalX = obj.x;
    const originalY = obj.y;
    
    scene.tweens.add({
        targets: obj,
        x: originalX + intensity,
        duration: 50,
        yoyo: true,
        repeat: 3,
        ease: 'Power2',
        onComplete: () => {
            obj.x = originalX;
            obj.y = originalY;
        }
    });
}