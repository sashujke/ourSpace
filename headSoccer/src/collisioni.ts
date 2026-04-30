import { Giocatore } from "./giocatore";
import { Palla } from "./palla";

const SPINTA_VERTICALE_AUTOMATICA_CALCIO: number = -10;

export function controllaCollisione(giocatore: Giocatore, palla: Palla): boolean {
    const centroGiocatore = giocatore.ottieniCentroCollisione();
    const centroPalla = palla.ottieniCentro();

    const differenzaTraCentriAsseX: number = centroPalla.x - centroGiocatore.x;
    const differenzaTraCentriAsseY: number = centroPalla.y - centroGiocatore.y;

    // Formula distanza tra due punti nel piano cartesiano:
    // distanzaTraCentri = sqrt( (x2 - x1)^2 + (y2 - y1)^2 )
    // Usiamo la distanza tra i centri dei due cerchi per capire se si sovrappongono.
    const distanzaTraCentri: number = Math.sqrt(
        differenzaTraCentriAsseX * differenzaTraCentriAsseX +
        differenzaTraCentriAsseY * differenzaTraCentriAsseY
    );

    // Due cerchi sono in collisione quando la distanza tra i centri e minore
    // della somma dei loro raggi: distanzaTraCentri < raggioCerchio1 + raggioCerchio2.
    const sommaRaggiCollisione: number = giocatore.ottieniRaggioCollisione() + palla.ottieniRaggio();

    if (distanzaTraCentri >= sommaRaggiCollisione) {
        return false;
    }

    const distanzaSicuraPerNormalizzazione: number = Math.max(distanzaTraCentri, 0.001);
    const versoreDirezioneImpattoX: number = differenzaTraCentriAsseX / distanzaSicuraPerNormalizzazione;
    const versoreDirezioneImpattoY: number = differenzaTraCentriAsseY / distanzaSicuraPerNormalizzazione;

    const moduloVelocitaCorrentePalla: number = palla.ottieniModuloVelocita();
    const moduloVelocitaRimbalzo: number = Math.max(9, moduloVelocitaCorrentePalla * 1.05);

    // Valori intenzionalmente "arcade": dopo il tocco la palla riceve sempre una spinta verso l'alto
    // per migliorare il game feel dei pallonetti, non per simulare una traiettoria fisica perfetta.
    const velocitaOrizzontaleDopoCalcio: number = versoreDirezioneImpattoX * moduloVelocitaRimbalzo;

    palla.impostaVelocita(
        velocitaOrizzontaleDopoCalcio,
        SPINTA_VERTICALE_AUTOMATICA_CALCIO
    );

    const profonditaSovrapposizioneTraCerchi: number = sommaRaggiCollisione - distanzaTraCentri;
    palla.sposta(
        versoreDirezioneImpattoX * profonditaSovrapposizioneTraCerchi,
        versoreDirezioneImpattoY * profonditaSovrapposizioneTraCerchi
    );

    return true;
}