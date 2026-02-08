const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve file statici dalla cartella public con path assoluto
app.use(express.static(path.join(__dirname, '../public')));

// Route principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Struttura dati per le stanze
const rooms = new Map();

// Genera un codice stanza univoco di 6 caratteri
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Classe per gestire una stanza
class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map();
    this.maxPlayers = 10;
    this.gameStarted = false;
  }

  addPlayer(playerId, nickname, ws) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    this.players.set(playerId, {
      id: playerId,
      nickname: nickname,
      x: 400,
      y: 300,
      color: this.getRandomColor(),
      ws: ws,
      isHost: playerId === this.hostId
    });

    return true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    
    // Se il host se ne va, assegna a un altro giocatore
    if (playerId === this.hostId && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      this.hostId = newHost.id;
      newHost.isHost = true;
    }
  }

  getRandomColor() {
    const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'cyan', 'pink', 'lime', 'brown'];
    const usedColors = Array.from(this.players.values()).map(p => p.color);
    const availableColors = colors.filter(c => !usedColors.includes(c));
    
    if (availableColors.length === 0) {
      return colors[Math.floor(Math.random() * colors.length)];
    }
    
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  }

  updatePlayerPosition(playerId, x, y) {
    const player = this.players.get(playerId);
    if (player) {
      player.x = x;
      player.y = y;
    }
  }

  broadcast(message, excludeId = null) {
    this.players.forEach((player, id) => {
      if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  getPlayersData() {
    return Array.from(this.players.values()).map(p => ({
      id: p.id,
      nickname: p.nickname,
      x: p.x,
      y: p.y,
      color: p.color,
      isHost: p.isHost
    }));
  }
}

// Gestione connessioni WebSocket
wss.on('connection', (ws) => {
  console.log('Nuovo client connesso');
  
  let playerId = null;
  let roomCode = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'CREATE_ROOM':
          playerId = uuidv4();
          roomCode = generateRoomCode();
          const newRoom = new Room(roomCode, playerId);
          
          if (newRoom.addPlayer(playerId, message.nickname, ws)) {
            rooms.set(roomCode, newRoom);
            
            ws.send(JSON.stringify({
              type: 'ROOM_CREATED',
              roomCode: roomCode,
              playerId: playerId,
              players: newRoom.getPlayersData()
            }));
            
            console.log(`Stanza creata: ${roomCode} da ${message.nickname}`);
          }
          break;

        case 'JOIN_ROOM':
          playerId = uuidv4();
          roomCode = message.roomCode.toUpperCase();
          const room = rooms.get(roomCode);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Stanza non trovata'
            }));
            break;
          }
          
          if (room.gameStarted) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Partita già iniziata'
            }));
            break;
          }
          
          if (room.addPlayer(playerId, message.nickname, ws)) {
            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              roomCode: roomCode,
              playerId: playerId,
              players: room.getPlayersData()
            }));
            
            // Notifica gli altri giocatori
            room.broadcast({
              type: 'PLAYER_JOINED',
              players: room.getPlayersData()
            }, playerId);
            
            console.log(`${message.nickname} è entrato nella stanza ${roomCode}`);
          } else {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Stanza piena'
            }));
          }
          break;

        case 'PLAYER_MOVE':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room) {
              room.updatePlayerPosition(playerId, message.x, message.y);
              
              // Invia aggiornamento a tutti gli altri giocatori
              room.broadcast({
                type: 'PLAYER_MOVED',
                playerId: playerId,
                x: message.x,
                y: message.y
              }, playerId);
            }
          }
          break;

        case 'START_GAME':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.hostId === playerId) {
              if (room.players.size < 0) { //test ma solitamente sempre più di 4
                ws.send(JSON.stringify({
                  type: 'ERROR',
                  message: 'Servono almeno 4 giocatori per iniziare'
                }));
                break;
              }
              
              room.gameStarted = true;
              
              // Notifica tutti i giocatori
              room.broadcast({
                type: 'GAME_STARTED'
              });
              
              ws.send(JSON.stringify({
                type: 'GAME_STARTED'
              }));
              
              console.log(`Partita iniziata nella stanza ${roomCode}`);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Errore nel parsing del messaggio:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnesso');
    
    if (roomCode && playerId) {
      const room = rooms.get(roomCode);
      if (room) {
        room.removePlayer(playerId);
        
        if (room.players.size === 0) {
          rooms.delete(roomCode);
          console.log(`Stanza ${roomCode} eliminata (vuota)`);
        } else {
          room.broadcast({
            type: 'PLAYER_LEFT',
            players: room.getPlayersData()
          });
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Errore WebSocket:', error);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});