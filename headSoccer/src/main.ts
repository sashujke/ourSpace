import { ScenaFase3 } from "./scena-fase1.ts";

const canvasGioco = document.getElementById("campo-gioco") as HTMLCanvasElement | null;

if (canvasGioco === null) {
    throw new Error("Canvas con id 'campo-gioco' non trovato nel documento HTML.");
}

const contestoCanvas = canvasGioco.getContext("2d");

if (contestoCanvas === null) {
    throw new Error("Impossibile ottenere il contesto 2D del canvas.");
}

const scenaFase3 = new ScenaFase3(canvasGioco, contestoCanvas);
scenaFase3.avvia();