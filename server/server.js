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
    this.meetingActive = false;
    this.votes = new Map();
    this.meetingTimeoutId = null;
  }

  startEmergencyMeeting() {
    this.meetingActive = true;
    this.votes.clear();

    // Timeout per concludere automaticamente il meeting dopo 20 secondi
    if (this.meetingTimeoutId) {
      clearTimeout(this.meetingTimeoutId);
    }
    this.meetingTimeoutId = setTimeout(() => {
      if (this.meetingActive) {
        this.finishEmergencyMeeting();
      }
    }, 20000);
  }

  finishEmergencyMeeting() {
    this.meetingActive = false;
    if (this.meetingTimeoutId) {
      clearTimeout(this.meetingTimeoutId);
      this.meetingTimeoutId = null;
    }

    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead);
    const voteCounts = new Map();

    for (const [voterId, targetId] of this.votes) {
      if (!voteCounts.has(targetId)) voteCounts.set(targetId, 0);
      voteCounts.set(targetId, voteCounts.get(targetId) + 1);
    }

    let selectedId = null;
    let maxVotes = 0;

    voteCounts.forEach((count, playerId) => {
      if (count > maxVotes) {
        maxVotes = count;
        selectedId = playerId;
      } else if (count === maxVotes) {
        selectedId = null; // tie
      }
    });

    if (selectedId === 'skip' || !selectedId || maxVotes === 0) {
      // Skip or tie or no votes means no ejection
      this.broadcast({ type: 'MEETING_RESULT', result: 'no_eject', message: 'Pareggio o nessun voto: nessuno verrà espulso' });
      return;
    }

    const target = this.players.get(selectedId);
    if (!target || target.isDead) {
      this.broadcast({ type: 'MEETING_RESULT', result: 'no_eject', message: 'Nessun target valido per l’espulsione' });
      return;
    }

    target.isDead = true;

    this.broadcast({ type: 'MEETING_RESULT', result: 'ejected', targetId: selectedId, targetName: target.nickname, targetRole: target.role });

    // Notifica uccisione a tutti come se fosse killed
    this.broadcast({ type: 'PLAYER_KILLED', targetId: selectedId, killerId: null });

    if (target.role === 'impostor') {
      this.broadcast({ type: 'GAME_END', winner: 'crewmate', players: this.getPlayersData() });
      this.gameStarted = false;
      return;
    }

    this.checkGameEnd();
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
      isHost: playerId === this.hostId,
      role: null,
      isDead: false,
      tasksCompleted: 0,
      totalTasks: 5
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

  assignRoles() {
    const numPlayers = this.players.size;
    let numImpostors = 1;
    if (numPlayers >= 7) {
      numImpostors = 2;
    }

    const playersArray = Array.from(this.players.values());
    
    // Shuffle the array
    for (let i = playersArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playersArray[i], playersArray[j]] = [playersArray[j], playersArray[i]];
    }
    
    // Assign positions in a circle around the center of the map
    const centerX = 3072; // Center of the 6144x4096 map
    const centerY = 2048;
    const radius = 100; // Larger radius for bigger map
    const angleStep = (2 * Math.PI) / numPlayers;
    
    playersArray.forEach((player, index) => {
      const angle = index * angleStep;
      player.x = centerX + Math.cos(angle) * radius;
      player.y = centerY + Math.sin(angle) * radius;
    });
    
    // Assign impostors
    for (let i = 0; i < numImpostors; i++) {
      playersArray[i].role = 'impostor';
    }
    // Assign crewmates
    for (let i = numImpostors; i < playersArray.length; i++) {
      playersArray[i].role = 'crewmate';
    }
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

  getPlayerSpecificData(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    const playersData = this.getPlayersData();
    const result = { ...player, players: playersData };

    if (player.role === 'impostor') {
      // Invia i nomi degli altri impostori
      const otherImpostors = Array.from(this.players.values())
        .filter(p => p.role === 'impostor' && p.id !== playerId)
        .map(p => ({ id: p.id, nickname: p.nickname }));
      result.impostorNames = otherImpostors;
    }

    return result;
  }

  checkGameEnd() {
    const alivePlayers = Array.from(this.players.values()).filter(p => !p.isDead);
    const aliveCrewmates = alivePlayers.filter(p => p.role === 'crewmate');
    const aliveImpostors = alivePlayers.filter(p => p.role === 'impostor');

    console.log(`📊 Controllo fine partita - Crewmate vivi: ${aliveCrewmates.length}, Impostori vivi: ${aliveImpostors.length}`);

    let winner = null;
    if (aliveCrewmates.length === 0) {
      winner = 'impostor';
    } else if (aliveImpostors.length === 0) {
      winner = 'crewmate';
    } else if (aliveImpostors.length >= aliveCrewmates.length) {
      // Se gli impostori sono pari o maggiori dei crewmate, vincono gli impostori.
      // Questo copre il caso 1 impostore + 1 crewmate e regole simili di parità.
      winner = 'impostor';
      console.log('📊 Fine partita per parità: impostori >= crewmate, impostori vincono');
    }

    if (winner) {
      // Notifica tutti i giocatori della fine partita
      console.log(`🏆 GAME_END inviato! Vincitori: ${winner}`);
      this.broadcast({
        type: 'GAME_END',
        winner: winner,
        players: this.getPlayersData()
      });
      console.log(`🏆 Partita finita! Vincitori: ${winner}`);
      
      // Interrompi il gioco per evitare ulteriori messaggi
      this.gameStarted = false;
    }
  }

  checkTaskWin() {
    const aliveCrewmates = Array.from(this.players.values()).filter(p => p.role === 'crewmate' && !p.isDead);
    const totalTasksRequired = aliveCrewmates.length * 5; // 5 task per crewmate
    const totalTasksCompleted = aliveCrewmates.reduce((sum, p) => sum + p.tasksCompleted, 0);

    if (aliveCrewmates.length > 0 && totalTasksCompleted >= totalTasksRequired) {
      // Tutti i crewmate hanno completato tutti i task
      this.broadcast({
        type: 'GAME_END',
        winner: 'crewmate',
        players: this.getPlayersData()
      });
      console.log(`🏆 Partita finita! Crewmate vincono completando tutti i task (${totalTasksCompleted}/${totalTasksRequired})`);
    }
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
          
          // Controlla se il nickname è già in uso
          const existingPlayer = Array.from(room.players.values()).find(p => p.nickname === message.nickname);
          if (existingPlayer) {
            ws.send(JSON.stringify({
              type: 'ERROR',
              message: 'Questo nickname è già in uso nella stanza. Scegli un nome diverso.'
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
          console.log(`📍 Ricevuto PLAYER_MOVE da ${playerId}: ${message.x}, ${message.y}`);
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room) {
              const player = room.players.get(playerId);
              if (player && !player.isDead) {
                room.updatePlayerPosition(playerId, message.x, message.y);
                
                // Invia aggiornamento a tutti gli altri giocatori
                room.broadcast({
                  type: 'PLAYER_MOVED',
                  playerId: playerId,
                  x: message.x,
                  y: message.y
                }, playerId);
                console.log(`📤 Broadcast PLAYER_MOVED per ${playerId}`);
              }
            }
          }
          break;

        case 'KILL_PLAYER':
          console.log(`🗡️ Ricevuto KILL_PLAYER da ${playerId} per target ${message.targetId}`);
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.gameStarted) {
              const killer = room.players.get(playerId);
              const target = room.players.get(message.targetId);
              
              if (killer && target && killer.role === 'impostor' && target.role === 'crewmate' && !target.isDead) {
                // Controlla cooldown (5 secondi)
                const now = Date.now();
                if (!killer.lastKillTime || now - killer.lastKillTime > 5000) {
                  // Marca il target come morto
                  target.isDead = true;
                  killer.lastKillTime = now;
                  
                  // Notifica tutti i giocatori
                  room.broadcast({
                    type: 'PLAYER_KILLED',
                    targetId: message.targetId,
                    killerId: playerId
                  });
                  
                  console.log(`🗡️ ${killer.nickname} ha ucciso ${target.nickname}`);
                  
                  // Controlla se la partita è finita
                  room.checkGameEnd();
                } else {
                  console.log(`⏰ ${killer.nickname} deve aspettare per uccidere di nuovo`);
                }
              }
            }
          }
          break;

        case 'START_GAME':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.hostId === playerId) {
              if (room.players.size < 4) {
                ws.send(JSON.stringify({
                  type: 'ERROR',
                  message: 'Servono almeno 4 giocatori per iniziare'
                }));
                break;
              }
              
              room.gameStarted = true;
              room.assignRoles();
              
              // Broadcast progresso task iniziale
              const aliveCrewmates = Array.from(room.players.values()).filter(p => p.role === 'crewmate' && !p.isDead);
              const totalRequired = aliveCrewmates.length * 5;
              room.broadcast({
                type: 'TASK_PROGRESS',
                totalCompleted: 0,
                totalRequired: totalRequired
              });
              
              // Invia GAME_STARTED a ciascun giocatore con il suo ruolo e informazioni specifiche
              room.players.forEach((player) => {
                const playerData = room.getPlayerSpecificData(player.id);
                player.ws.send(JSON.stringify({
                  type: 'GAME_STARTED',
                  role: player.role,
                  players: room.getPlayersData(),
                  impostorNames: playerData.impostorNames || [],
                  tasksCompleted: player.tasksCompleted,
                  totalTasks: player.totalTasks
                }));
              });
              
              console.log(`Partita iniziata nella stanza ${roomCode}`);
            }
          }
          break;

        case 'TASK_COMPLETED':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.gameStarted) {
              const player = room.players.get(playerId);
              if (player && player.role === 'crewmate' && !player.isDead && player.tasksCompleted < player.totalTasks) {
                // Incrementa task completato per questo giocatore
                player.tasksCompleted++;
                
                // Calcola progresso totale
                const aliveCrewmates = Array.from(room.players.values()).filter(p => p.role === 'crewmate' && !p.isDead);
                const totalCompleted = aliveCrewmates.reduce((sum, p) => sum + p.tasksCompleted, 0);
                const totalRequired = aliveCrewmates.length * 5;
                
                // Broadcast progresso task totale
                room.broadcast({
                  type: 'TASK_PROGRESS',
                  totalCompleted: totalCompleted,
                  totalRequired: totalRequired
                });
                
                // Controlla se tutti i crewmate hanno completato tutti i task
                room.checkTaskWin();
              }
            }
          }
          break;

        case 'EMERGENCY_MEETING':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.gameStarted) {
              room.startEmergencyMeeting();

              // Broadcast a tutti i giocatori che la riunione è stata chiamata
              room.broadcast({
                type: 'EMERGENCY_MEETING',
                callerId: playerId,
                timestamp: Date.now(),
                x: 3072,
                y: 2048
              });

              // Imposta tutti i giocatori in modalità riunione (facoltativo)
              room.players.forEach((player) => {
                player.x = 3072;
                player.y = 2048;
              });

              console.log(`🚨 Emergency meeting chiamata da ${playerId} nella stanza ${roomCode}`);
            }
          }
          break;

        case 'VOTE':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.gameStarted && room.meetingActive && typeof message.targetId === 'string') {
              const voter = room.players.get(playerId);

              if (!voter || voter.isDead) {
                break;
              }

              let target = null;
              if (message.targetId !== 'skip') {
                target = room.players.get(message.targetId);
                if (!target || target.isDead) {
                  break;
                }
              }

              room.votes.set(playerId, message.targetId);

              const voteTargetName = message.targetId === 'skip' ? 'SKIP' : target.nickname;

              // Invia conferma del voto solo al giocatore che ha votato.
              if (voter.ws && voter.ws.readyState === WebSocket.OPEN) {
                voter.ws.send(JSON.stringify({
                  type: 'MEETING_VOTE',
                  voterId: playerId,
                  voterName: voter.nickname,
                  targetId: message.targetId,
                  targetName: voteTargetName,
                  timestamp: Date.now()
                }));
              }

              console.log(`🗳️ [${roomCode}] ${voter.nickname} ha votato ${voteTargetName}`);

              const alivePlayers = Array.from(room.players.values()).filter(p => !p.isDead);
              const voteCounts = new Map();
              room.votes.forEach((votedTargetId) => {
                if (!voteCounts.has(votedTargetId)) voteCounts.set(votedTargetId, 0);
                voteCounts.set(votedTargetId, voteCounts.get(votedTargetId) + 1);
              });

              let hasMajority = false;
              voteCounts.forEach((count) => {
                if (count > alivePlayers.length / 2) {
                  hasMajority = true;
                }
              });

              if (hasMajority || room.votes.size >= alivePlayers.length) {
                room.finishEmergencyMeeting();
              }
            }
          }
          break;

        case 'MEETING_CHAT':
          if (roomCode && playerId) {
            const room = rooms.get(roomCode);
            if (room && room.gameStarted && typeof message.text === 'string' && message.text.trim().length > 0) {
              const player = room.players.get(playerId);
              const sender = player ? player.nickname : 'Anonimo';

              room.broadcast({
                type: 'MEETING_CHAT',
                sender: sender,
                text: message.text.trim(),
                timestamp: Date.now()
              });

              console.log(`💬 [${roomCode}] ${sender}: ${message.text.trim()}`);
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