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
        
        // Info di debug
        this.createDebugInfo();
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
    }

    createNetworkPlayers() {
        if (network && network.getAllPlayers) {
            const players = network.getAllPlayers();
            console.log('Creazione giocatori dal network:', players);
            
            players.forEach(playerData => {
                if (!this.players.has(playerData.id)) {
                    this.createPlayer(playerData);
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
                        this.createPlayer(p);
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

    createPlayer(playerData) {
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
        const nameText = this.add.text(x, y - 30, nickname, {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 6, y: 3 },
            stroke: '#000000',
            strokeThickness: 3
        })
        .setOrigin(0.5)
        .setDepth(2000);
        
        player.nameText = nameText;
        
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
            this.cameras.main.setZoom(3);
            console.log(`Player locale creato a: ${x}, ${y}`);
        }
        
        return player;
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
}