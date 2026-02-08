// main.js - Gestione interfaccia e network
document.addEventListener('DOMContentLoaded', () => {
    // Elementi DOM
    const menuContainer = document.getElementById('menu-container');
    const lobbyContainer = document.getElementById('lobby-container');
    const gameContainer = document.getElementById('game-container');
    const nicknameInput = document.getElementById('nickname-input');
    const roomCodeInput = document.getElementById('room-code-input');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const errorMessage = document.getElementById('error-message');
    const roomCodeDisplay = document.getElementById('room-code-display');
    const playerCount = document.getElementById('player-count');
    const playersList = document.getElementById('players-list');
    const startGameBtn = document.getElementById('start-game-btn');
    const waitingText = document.getElementById('waiting-text');

    let isHost = false;
    let currentRoomCode = '';

    // Configurazione Phaser
    let game = null;

    // Colori disponibili per i giocatori
    const availableColors = [
        { name: 'red', value: '#ff4757' },
        { name: 'blue', value: '#5352ed' },
        { name: 'green', value: '#2ed573' },
        { name: 'yellow', value: '#ffa502' },
        { name: 'orange', value: '#ff7f50' },
        { name: 'purple', value: '#6c5ce7' },
        { name: 'cyan', value: '#00cec9' },
        { name: 'pink', value: '#fd79a8' },
        { name: 'lime', value: '#00b894' },
        { name: 'brown', value: '#8b4513' }
    ];

    // Funzioni di validazione
    function isValidNickname(nickname) {
        return nickname && nickname.trim().length >= 2 && nickname.trim().length <= 15;
    }

    function isValidRoomCode(code) {
        return code && code.trim().length === 6 && /^[A-Z0-9]+$/.test(code.trim());
    }

    // Mostra errore
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Aggiorna lista giocatori nella lobby
    function updatePlayersList(players) {
        playersList.innerHTML = '';
        playerCount.textContent = players.length;
        
        players.forEach((player) => {
            const playerItem = document.createElement('div');
            playerItem.className = 'player-item';
            
            const colorDiv = document.createElement('div');
            colorDiv.className = 'player-color';
            // Usa il colore dal server o default
            const color = player.color || 'red';
            const colorObj = availableColors.find(c => c.name === color) || availableColors[0];
            colorDiv.style.backgroundColor = colorObj.value;
            
            const nameDiv = document.createElement('div');
            nameDiv.className = 'player-name';
            nameDiv.textContent = player.nickname;
            
            playerItem.appendChild(colorDiv);
            playerItem.appendChild(nameDiv);
            
            if (player.isHost) {
                const hostBadge = document.createElement('div');
                hostBadge.className = 'host-badge';
                hostBadge.textContent = 'HOST';
                playerItem.appendChild(hostBadge);
            }
            
            playersList.appendChild(playerItem);
        });
    }

    // Entra in lobby
    function enterLobby(roomCode, host = false) {
        currentRoomCode = roomCode;
        isHost = host;
        
        menuContainer.style.display = 'none';
        lobbyContainer.style.display = 'block';
        gameContainer.style.display = 'none';
        
        roomCodeDisplay.textContent = roomCode;
        
        // Mostra/nascondi pulsante start
        startGameBtn.style.display = host ? 'block' : 'none';
        waitingText.style.display = host ? 'none' : 'block';
        
        // Aggiorna lista giocatori
        updatePlayersList(network.getAllPlayers());
    }

    // Inizia il gioco
    function startGame() {
        if (!isHost) return;
        network.startGame();
    }

    // Inizializza il gioco Phaser
    function initializeGame() {
        lobbyContainer.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Configurazione Phaser
        const config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            parent: 'game-container',
            backgroundColor: '#000000',
            pixelArt: true,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 0 },
                    debug: false
                }
            },
            scene: GameScene,
            scale: {
                mode: Phaser.Scale.RESIZE,
                autoCenter: Phaser.Scale.CENTER_BOTH
            }
        };
        
        // Crea il gioco
        if (game) {
            game.destroy(true);
        }
        
        game = new Phaser.Game(config);
        
        // Gestione resize
        window.addEventListener('resize', () => {
            if (game && game.scale) {
                game.scale.resize(window.innerWidth, window.innerHeight);
            }
        });
    }

    // Connessione al server WebSocket
    function connectToServer() {
        network.connect()
            .then(() => {
                console.log('Connesso al server');
                
                // Setup event listeners per network
                setupNetworkListeners();
            })
            .catch(error => {
                showError('Errore di connessione al server: ' + error);
                console.error('Errore connessione:', error);
            });
    }

    // Setup event listeners del network
    function setupNetworkListeners() {
        // Room creata
        network.on('onRoomCreated', (data) => {
            console.log('Room creata:', data.roomCode);
            enterLobby(data.roomCode, true);
        });

        // Room unita
        network.on('onRoomJoined', (data) => {
            console.log('Unit a room:', data.roomCode);
            enterLobby(data.roomCode, false);
        });

        // Giocatore unito
        network.on('onPlayerJoined', (data) => {
            console.log('Giocatore unito:', data.players);
            updatePlayersList(data.players);
        });

        // Giocatore uscito
        network.on('onPlayerLeft', (data) => {
            console.log('Giocatore uscito');
            updatePlayersList(data.players);
        });

        // Game iniziato
        network.on('onGameStarted', () => {
            console.log('Gioco iniziato!');
            initializeGame();
        });

        // Errore
        network.on('onError', (errorMessage) => {
            showError(errorMessage);
        });
    }

    // Event Listeners
    createRoomBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        
        if (!isValidNickname(nickname)) {
            showError('Nickname non valido (2-15 caratteri)');
            return;
        }
        
        if (!network.connected) {
            showError('Non connesso al server');
            return;
        }
        
        network.createRoom(nickname);
    });

    joinRoomBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim();
        const roomCode = roomCodeInput.value.trim().toUpperCase();
        
        if (!isValidNickname(nickname)) {
            showError('Nickname non valido (2-15 caratteri)');
            return;
        }
        
        if (!isValidRoomCode(roomCode)) {
            showError('Codice stanza non valido (6 caratteri A-Z, 0-9)');
            return;
        }
        
        if (!network.connected) {
            showError('Non connesso al server');
            return;
        }
        
        network.joinRoom(nickname, roomCode);
    });

    startGameBtn.addEventListener('click', startGame);

    // Inizializza connessione al caricamento della pagina
    connectToServer();

    // Tasto F per fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'f' || e.key === 'F') {
            if (game && game.scale) {
                if (game.scale.isFullscreen) {
                    game.scale.stopFullscreen();
                } else {
                    game.scale.startFullscreen();
                }
            }
        }
    });
});