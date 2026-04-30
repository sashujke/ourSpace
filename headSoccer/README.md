# Head Ball 2 - Fase 1 e Fase 2

Questa cartella contiene una base indipendente in TypeScript per iniziare il progetto Head Ball 2.

## Obiettivi implementati

- Movimento del Giocatore 1 con tasti W, A, D.
- Gravita e salto.
- Blocco del giocatore sul pavimento (Y = 350).
- Palla con fisica (x, y, vx, vy, raggio).
- Collisione tra giocatore e palla.
- Porte laterali, punteggio e reset al centro dopo ogni gol.

## Struttura

- `src/punto-2d.ts`: interfaccia `Punto2D`.
- `src/input-giocatore1.ts`: gestione input tastiera del giocatore.
- `src/giocatore.ts`: classe `Giocatore` con fisica e rendering.
- `src/palla.ts`: classe `Palla` con rimbalzi su bordi e pavimento.
- `src/collisioni.ts`: funzione `controllaCollisione` tra i due cerchi.
- `src/scena-fase1.ts`: loop di aggiornamento e disegno completo Fase 2.
- `src/main.ts`: bootstrap iniziale della fase.
- `index.html`: pagina di prova con canvas.

## Build

Dal root del progetto:

1. `npm install`
2. `npm run build:headsoccer`

Poi apri `headSoccer/index.html`.

## Estensione consigliata per Fase 3

- Aggiungere un secondo giocatore (input frecce o I/J/L).
- Introdurre gestione tempo partita e vittoria a punteggio target.
- Raffinare la fisica con attrito orizzontale e effetto spin della palla.