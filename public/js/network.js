// network.js - Gestione completa del multiplayer
class Network {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.playerId = null;
        this.roomCode = null;
        this.players = new Map(); // Map<playerId, playerData>
        this.callbacks = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }

    // Connessione al server WebSocket
    connect() {
        return new Promise((resolve, reject) => {
            try {
                // Usa lo stesso host e porta della pagina corrente
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.hostname;
                const port = window.location.port || (protocol === 'wss:' ? 443 : 80);
                const wsUrl = `${protocol}//${host}:${port}`;
                
                console.log('Tentativo di connessione a:', wsUrl);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.onopen = () => {
                    console.log('✅ Connesso al server WebSocket');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    
                    // Notifica connessione riuscita
                    if (this.callbacks.onConnected) {
                        this.callbacks.onConnected();
                    }
                    
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log('📨 Messaggio ricevuto:', message.type, message);
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('❌ Errore nel parsing del messaggio:', error, event.data);
                    }
                };

                this.ws.onclose = (event) => {
                    console.log('🔌 Connessione chiusa:', event.code, event.reason);
                    this.connected = false;
                    this.playerId = null;
                    this.roomCode = null;
                    
                    // Tentativo di riconnessione
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`🔄 Tentativo di riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
                        
                        setTimeout(() => {
                            this.connect().catch(console.error);
                        }, this.reconnectDelay * this.reconnectAttempts);
                    }
                    
                    if (this.callbacks.onDisconnect) {
                        this.callbacks.onDisconnect(event);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('❌ Errore WebSocket:', error);
                    reject(error);
                };
                
                // Timeout di connessione
                setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Timeout di connessione'));
                    }
                }, 10000);
                
            } catch (error) {
                console.error('❌ Errore durante la connessione:', error);
                reject(error);
            }
        });
    }

    // Gestione dei messaggi dal server
    handleMessage(message) {
        switch (message.type) {
            case 'ROOM_CREATED':
                this.handleRoomCreated(message);
                break;
                
            case 'ROOM_JOINED':
                this.handleRoomJoined(message);
                break;
                
            case 'PLAYER_JOINED':
                this.handlePlayerJoined(message);
                break;
                
            case 'PLAYER_LEFT':
                this.handlePlayerLeft(message);
                break;
                
            case 'PLAYER_MOVED':
                this.handlePlayerMoved(message);
                break;
                
            case 'GAME_STARTED':
                this.handleGameStarted(message);
                break;
                
            case 'PLAYER_INFO':
                this.handlePlayerInfo(message);
                break;
                
            case 'ERROR':
                this.handleError(message);
                break;
                
            default:
                console.warn('⚠️ Tipo di messaggio sconosciuto:', message.type);
        }
    }

    // Gestione creazione stanza
    handleRoomCreated(message) {
        this.playerId = message.playerId;
        this.roomCode = message.roomCode;
        this.updatePlayers(message.players);
        
        console.log(`🎮 Stanza creata: ${message.roomCode} - Tu sei: ${message.playerId}`);
        
        if (this.callbacks.onRoomCreated) {
            this.callbacks.onRoomCreated({
                roomCode: message.roomCode,
                playerId: message.playerId,
                players: this.getAllPlayers()
            });
        }
    }

    // Gestione unione a stanza
    handleRoomJoined(message) {
        this.playerId = message.playerId;
        this.roomCode = message.roomCode;
        this.updatePlayers(message.players);
        
        console.log(`🎮 Unit alla stanza: ${message.roomCode} - Tu sei: ${message.playerId}`);
        
        if (this.callbacks.onRoomJoined) {
            this.callbacks.onRoomJoined({
                roomCode: message.roomCode,
                playerId: message.playerId,
                players: this.getAllPlayers()
            });
        }
    }

    // Gestione nuovo giocatore unito
    handlePlayerJoined(message) {
        this.updatePlayers(message.players);
        
        console.log(`👤 Nuovo giocatore: ${message.playerId}`);
        
        if (this.callbacks.onPlayerJoined) {
            this.callbacks.onPlayerJoined({
                players: this.getAllPlayers(),
                newPlayerId: message.playerId
            });
        }
    }

    // Gestione giocatore uscito
    handlePlayerLeft(message) {
        const leftPlayerId = message.playerId;
        
        // Rimuovi il giocatore dalla mappa
        if (this.players.has(leftPlayerId)) {
            this.players.delete(leftPlayerId);
        }
        
        console.log(`👋 Giocatore uscito: ${leftPlayerId}`);
        
        if (this.callbacks.onPlayerLeft) {
            this.callbacks.onPlayerLeft({
                playerId: leftPlayerId,
                players: this.getAllPlayers()
            });
        }
    }

    // Gestione movimento giocatore
    handlePlayerMoved(message) {
        const player = this.players.get(message.playerId);
        if (player) {
            // Aggiorna posizione
            player.x = message.x;
            player.y = message.y;
            
            // Aggiorna direzione se presente
            if (message.direction) {
                player.direction = message.direction;
            }
            
            console.log(`📍 ${player.nickname} si è mosso a: ${message.x}, ${message.y}`);
        }
        
        if (this.callbacks.onPlayerMoved) {
            this.callbacks.onPlayerMoved({
                playerId: message.playerId,
                x: message.x,
                y: message.y,
                direction: message.direction
            });
        }
    }

    // Gestione inizio gioco
    handleGameStarted(message) {
        console.log('🚀 Gioco iniziato!');
        
        // Aggiorna tutti i giocatori con le posizioni iniziali
        if (message.players) {
            this.updatePlayers(message.players);
        }
        
        if (this.callbacks.onGameStarted) {
            this.callbacks.onGameStarted({
                players: this.getAllPlayers()
            });
        }
    }

    // Gestione informazioni player
    handlePlayerInfo(message) {
        console.log('ℹ️ Info player ricevute:', message);
        
        if (this.callbacks.onPlayerInfo) {
            this.callbacks.onPlayerInfo(message);
        }
    }

    // Gestione errori
    handleError(message) {
        console.error('❌ Errore dal server:', message.message);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(message.message);
        }
    }

    // Aggiorna la mappa dei giocatori
    updatePlayers(playersArray) {
        // Pulisci la mappa
        this.players.clear();
        
        // Aggiungi tutti i giocatori
        playersArray.forEach(player => {
            // Assicurati che ogni player abbia tutte le proprietà necessarie
            const playerData = {
                id: player.id,
                nickname: player.nickname || 'Giocatore',
                color: player.color || this.getRandomColor(),
                x: player.x || 0,
                y: player.y || 0,
                isHost: player.isHost || false,
                direction: player.direction || 'down',
                isLocal: player.id === this.playerId
            };
            
            this.players.set(player.id, playerData);
        });
        
        console.log('👥 Giocatori aggiornati:', this.getAllPlayers());
    }

    // Colori disponibili per i giocatori
    getRandomColor() {
        const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'pink', 'lime', 'brown'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Invia messaggio al server
    send(message) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ Non connesso al server, impossibile inviare:', message);
            return false;
        }
        
        try {
            this.ws.send(JSON.stringify(message));
            console.log('📤 Messaggio inviato:', message.type, message);
            return true;
        } catch (error) {
            console.error('❌ Errore nell\'invio del messaggio:', error);
            return false;
        }
    }

    // --- METODI PUBBLICI ---

    // Crea una nuova stanza
    createRoom(nickname) {
        if (!nickname || nickname.trim().length < 2) {
            console.error('❌ Nickname non valido');
            return false;
        }
        
        const color = this.getRandomColor();
        
        return this.send({
            type: 'CREATE_ROOM',
            nickname: nickname.trim(),
            color: color
        });
    }

    // Unisciti a una stanza esistente
    joinRoom(nickname, roomCode) {
        if (!nickname || nickname.trim().length < 2) {
            console.error('❌ Nickname non valido');
            return false;
        }
        
        if (!roomCode || roomCode.trim().length !== 6) {
            console.error('❌ Codice stanza non valido');
            return false;
        }
        
        const color = this.getRandomColor();
        
        return this.send({
            type: 'JOIN_ROOM',
            nickname: nickname.trim(),
            roomCode: roomCode.trim().toUpperCase(),
            color: color
        });
    }

    // Invia movimento del giocatore
    sendPlayerMove(x, y, direction = null) {
        if (typeof x !== 'number' || typeof y !== 'number') {
            console.error('❌ Coordinate non valide');
            return false;
        }
        
        const message = {
            type: 'PLAYER_MOVE',
            x: Math.round(x),
            y: Math.round(y)
        };
        
        if (direction) {
            message.direction = direction;
        }
        
        return this.send(message);
    }

    // Avvia il gioco (solo host)
    startGame() {
        return this.send({
            type: 'START_GAME'
        });
    }

    // Lascia la stanza corrente
    leaveRoom() {
        if (this.roomCode) {
            console.log(`🚪 Uscito dalla stanza: ${this.roomCode}`);
            
            const success = this.send({
                type: 'LEAVE_ROOM'
            });
            
            this.roomCode = null;
            this.players.clear();
            
            return success;
        }
        return false;
    }

    // Registra callback per eventi
    on(event, callback) {
        this.callbacks[event] = callback;
        console.log(`📝 Registrato callback per: ${event}`);
    }

    // Ottiene un giocatore specifico
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    // Ottiene il giocatore locale
    getMyPlayer() {
        return this.players.get(this.playerId);
    }

    // Ottiene tutti i giocatori
    getAllPlayers() {
        return Array.from(this.players.values());
    }

    // Controlla se sei l'host
    isHost() {
        const myPlayer = this.getMyPlayer();
        return myPlayer ? myPlayer.isHost : false;
    }

    // Controlla se sei connesso
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    // Disconnette dal server
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.playerId = null;
        this.roomCode = null;
        this.players.clear();
        console.log('🔒 Disconnesso dal server');
    }

    // Riconnessione manuale
    reconnect() {
        console.log('🔄 Tentativo di riconnessione manuale...');
        this.reconnectAttempts = 0;
        return this.connect();
    }
}

// Crea istanza globale
const network = new Network();

// Connettiti automaticamente al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 Tentativo di connessione automatica...');
    
    // Attendi un secondo prima di connettere
    setTimeout(() => {
        network.connect()
            .then(() => {
                console.log('✅ Connessione automatica riuscita!');
            })
            .catch(error => {
                console.error('❌ Connessione automatica fallita:', error);
                
                // Modalità offline per test
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.warn('⚠️ Modalità offline attivata per test locali');
                    network.connected = true;
                    network.playerId = 'local_' + Math.random().toString(36).substr(2, 9);
                    
                    // Simula connessione
                    if (network.callbacks.onConnected) {
                        network.callbacks.onConnected();
                    }
                }
            });
    }, 1000);
});

// Gestione chiusura finestra
window.addEventListener('beforeunload', () => {
    if (network.isConnected()) {
        network.leaveRoom();
        network.disconnect();
    }
});

// Esporta per debug
window.Network = Network;
window.network = network;

console.log('🌐 Network module caricato');