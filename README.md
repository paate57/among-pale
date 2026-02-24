# 🚀 Among Us - Gioco Multiplayer

Gioco multiplayer simile ad Among Us realizzato con Node.js, WebSocket e Phaser.js.

## 📋 Requisiti

- Node.js (v14 o superiore)
- Browser moderno (Chrome, Firefox, Edge, Safari)

## 🚀 Installazione

1. Installa le dipendenze:
```bash
npm install
```

2. Avvia il server:
```bash
npm start
```

3. Apri il browser e vai su:
```
http://localhost:3000
```

## 🎮 Come Giocare

### Creare una Stanza
1. Inserisci il tuo nickname
2. Clicca su "Crea Stanza"
3. Condividi il codice della stanza con gli altri giocatori

### Unirsi a una Stanza
1. Inserisci il tuo nickname
2. Inserisci il codice della stanza
3. Clicca su "Unisciti alla Stanza"

### Controlli
- **Frecce direzionali** o **WASD**: Muovi il personaggio
- L'host può avviare la partita quando ci sono almeno 4 giocatori

## 🗺️ Configurazione Mappa Tiled

Il gioco supporta mappe create con Tiled Map Editor esportate in formato CSV.

### Preparazione della Mappa

1. **Crea la mappa in Tiled**:
   - Usa tile di 16x16 pixel (modifica in `game.js` se diverso)
   - Crea fino a 6 layer
   - Il primo layer dovrebbe essere quello con le collisioni (muri, ostacoli)

2. **Esporta i layer**:
   - File → Export As... → CSV files
   - Salva ogni layer come:
     - `map-layer1.csv`
     - `map-layer2.csv`
     - `map-layer3.csv`
     - ... fino a `map-layer6.csv`

3. **Organizza i file**:
```
public/
  assets/
    tileset.png          ← Il tuo tileset
    map-layer1.csv       ← Layer 1 (collisioni)
    map-layer2.csv       ← Layer 2
    map-layer3.csv       ← Layer 3
    map-layer4.csv       ← Layer 4
    map-layer5.csv       ← Layer 5
    map-layer6.csv       ← Layer 6
```

### Sprite dei Giocatori

Crea uno sprite sheet per i giocatori:
- Nome file: `player.png`
- Posizione: `public/assets/player.png`
- Dimensioni frame: 32x48 pixel
- Layout:
  - Frame 0-3: Camminata giù
  - Frame 4-7: Camminata sinistra
  - Frame 8-11: Camminata destra
  - Frame 12-15: Camminata su

Se non hai gli sprite, puoi usare placeholder temporanei o cercare sprite gratuiti online.

## 🛠️ Struttura del Progetto

```
among-us-game/
├── server/
│   └── server.js           # Server Node.js con WebSocket
├── public/
│   ├── index.html          # Interfaccia principale
│   ├── js/
│   │   ├── main.js         # Gestione UI e inizializzazione
│   │   ├── network.js      # Classe per comunicazione WebSocket
│   │   └── game.js         # Scena Phaser principale
│   └── assets/
│       ├── tileset.png     # Tileset della mappa
│       ├── player.png      # Sprite del giocatore
│       └── map-layer*.csv  # Layer della mappa
├── package.json
└── README.md
```

## 🔧 Personalizzazione

### Modificare il Numero Massimo di Giocatori
In `server/server.js`, cambia:
```javascript
this.maxPlayers = 10; // Modifica questo valore
```

### Modificare la Velocità del Giocatore
In `public/js/game.js`, nel metodo `update()`:
```javascript
const speed = 150; // Modifica questo valore
```

### Modificare le Dimensioni dei Tile
In `public/js/game.js`, nel metodo `create()`:
```javascript
const tileWidth = 16;  // Modifica se usi tile diversi
const tileHeight = 16; // Modifica se usi tile diversi
```

### Cambiare i Colori dei Giocatori
In `server/server.js`, nel metodo `getRandomColor()`:
```javascript
const colors = ['red', 'blue', 'green', ...]; // Aggiungi o rimuovi colori
```

## 📝 TODO - Prossime Feature

- [ ] Sistema di task/compiti
- [ ] Ruoli (Crewmate e Impostor)
- [ ] Sistema di kill
- [ ] Sistema di voting
- [ ] Chat di emergenza
- [ ] Visibilità limitata (fog of war)
- [ ] Animazioni di morte
- [ ] Sabotaggio
- [ ] Vent system

## 🐛 Risoluzione Problemi

### Il gioco non si connette
- Verifica che il server sia avviato
- Controlla che la porta 3000 non sia in uso
- Verifica che non ci siano firewall che bloccano la connessione

### Gli sprite non si caricano
- Verifica che i file siano nella cartella `public/assets/`
- Controlla i nomi dei file (case-sensitive)
- Apri la console del browser per vedere eventuali errori

### La mappa non appare
- Verifica che i file CSV siano formattati correttamente
- Controlla che il tileset.png esista
- Verifica le dimensioni dei tile nel codice

## 📄 Licenza

Questo è un progetto educativo. Among Us è un marchio registrato di Innersloth LLC.

## 🤝 Contributi

Sentiti libero di fare fork del progetto e contribuire con pull request!
