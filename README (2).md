# NOTA: Placeholder per Assets

Questa cartella dovrebbe contenere:

## Tileset della Mappa
- `tileset.png` - Il tileset che hai creato in Tiled
  - Assicurati che corrisponda alle dimensioni dei tile usati (default 16x16)

## Sprite del Giocatore
- `player.png` - Sprite sheet del personaggio
  - Dimensioni frame: 32x48 pixel
  - 16 frame totali (4x4 grid)
  - Layout delle animazioni:
    * Riga 1 (0-3): Camminata giù
    * Riga 2 (4-7): Camminata sinistra
    * Riga 3 (8-11): Camminata destra
    * Riga 4 (12-15): Camminata su

## Layer della Mappa (CSV)
Esporta i tuoi layer da Tiled come CSV:
- `map-layer1.csv` - Layer 1 (collisioni/muri)
- `map-layer2.csv` - Layer 2 
- `map-layer3.csv` - Layer 3
- `map-layer4.csv` - Layer 4
- `map-layer5.csv` - Layer 5
- `map-layer6.csv` - Layer 6

## Dove Trovare Asset Gratuiti

### Sprite Personaggi:
- OpenGameArt.org
- Itch.io (sezione "Free Game Assets")
- Kenney.nl (asset pack gratuiti)

### Tileset:
- Tiled Map Editor - Tutorial e esempi
- OpenGameArt.org
- Kenney.nl

## Creare Asset Temporanei per Testing

Se non hai ancora gli asset, puoi:

1. **Tileset temporaneo**: 
   - Crea un'immagine 256x256 con quadrati colorati 16x16
   - Usa colori diversi per pavimento, muri, ecc.

2. **Sprite giocatore temporaneo**:
   - Crea un'immagine 128x192 (4 colonne x 4 righe di frame 32x48)
   - Disegna semplici omini stilizzati in diverse pose

3. **Mappa CSV**:
   - Crea file CSV con numeri separati da virgole
   - Esempio semplice (10x10):
   ```
   0,0,0,0,0,0,0,0,0,0
   0,1,1,1,1,1,1,1,1,0
   0,1,2,2,2,2,2,2,1,0
   0,1,2,2,2,2,2,2,1,0
   0,1,2,2,2,2,2,2,1,0
   0,1,2,2,2,2,2,2,1,0
   0,1,2,2,2,2,2,2,1,0
   0,1,2,2,2,2,2,2,1,0
   0,1,1,1,1,1,1,1,1,0
   0,0,0,0,0,0,0,0,0,0
   ```
   - 0 = vuoto, 1 = muro, 2 = pavimento
