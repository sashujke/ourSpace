import { Bolla, TipoPotereBolla } from "./bolla";
import { controllaCollisione } from "./collisioni";
import { Giocatore } from "./giocatore";
import {
    GestoreInputGiocatore1,
    GestoreInputGiocatore2,
    StatoInputGiocatore
} from "./input-giocatore1";
import { GestoreInputSuperpoteri } from "./input-superpoteri";
import { Palla } from "./palla";
import { Punto2D } from "./punto-2d";

interface AreaRettangolare {
    coordinataX: number;
    coordinataY: number;
    larghezza: number;
    altezza: number;
}

type LatoPorta = "sinistra" | "destra";

export class ScenaFase3 {
    private static readonly ALTEZZA_TRAVERSA_BASE: number = 150;
    private static readonly SPESSORE_TRAVERSA: number = 10;
    private static readonly DISTANZA_LINEA_PORTA_DAL_BORDO: number = 50;

    private static readonly DISTANZA_TELEPORT_DALLA_PALLA: number = 50;
    private static readonly VELOCITA_ORIZZONTALE_PALLA_FIRE: number = 25;
    private static readonly DURATA_PALLA_FIRE_MILLISECONDI: number = 1500;
    private static readonly DURATA_PALLA_INVISIBILE_MILLISECONDI: number = 2000;
    private static readonly DURATA_BLOCCO_INVERSIONE_MILLISECONDI: number = 200;

    private static readonly INTERVALLO_GENERAZIONE_BOLLA_MILLISECONDI: number = 15000;
    private static readonly DURATA_EFFETTO_GHIACCIO_MILLISECONDI: number = 2000;
    private static readonly DURATA_EFFETTO_TESTA_GRANDE_MILLISECONDI: number = 5000;
    private static readonly DURATA_EFFETTO_PORTA_GRANDE_MILLISECONDI: number = 5000;
    private static readonly FATTORE_MOLTIPLICATIVO_TESTA_GRANDE: number = 1.45;
    private static readonly FATTORE_MOLTIPLICATIVO_PORTA_GRANDE: number = 1.35;

    private static readonly COLORE_PALLA_FIRE: string = "orange";

    private readonly canvas: HTMLCanvasElement;
    private readonly contestoCanvas: CanvasRenderingContext2D;
    private readonly gestoreInputGiocatore1: GestoreInputGiocatore1;
    private readonly gestoreInputGiocatore2: GestoreInputGiocatore2;
    private readonly gestoreInputSuperpoteri: GestoreInputSuperpoteri;

    private readonly giocatore1: Giocatore;
    private readonly giocatore2: Giocatore;
    private readonly palla: Palla;

    private readonly coordinataYPavimento: number;
    private readonly coordinataXLineaPortaSinistra: number;
    private readonly coordinataXLineaPortaDestra: number;

    private altezzaPortaSinistraAttuale: number;
    private altezzaPortaDestraAttuale: number;

    private areaPortaSinistra: AreaRettangolare;
    private areaPortaDestra: AreaRettangolare;
    private areaTraversaSinistra: AreaRettangolare;
    private areaTraversaDestra: AreaRettangolare;

    private punteggioGiocatore1: number;
    private punteggioGiocatore2: number;

    private bollePresentiNelCampo: Bolla[];

    private identificatoreIntervalloGenerazioneBolle: number | null;
    private identificatoreTimeoutPallaFire: number | null;
    private identificatoreTimeoutPallaInvisibile: number | null;
    private identificatoreTimeoutTestaGrandeGiocatore1: number | null;
    private identificatoreTimeoutTestaGrandeGiocatore2: number | null;
    private identificatoreTimeoutPortaGrandeSinistra: number | null;
    private identificatoreTimeoutPortaGrandeDestra: number | null;

    constructor(canvas: HTMLCanvasElement, contestoCanvas: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.contestoCanvas = contestoCanvas;

        this.gestoreInputGiocatore1 = new GestoreInputGiocatore1();
        this.gestoreInputGiocatore2 = new GestoreInputGiocatore2();
        this.gestoreInputSuperpoteri = new GestoreInputSuperpoteri();

        this.coordinataYPavimento = 350;
        this.coordinataXLineaPortaSinistra = ScenaFase3.DISTANZA_LINEA_PORTA_DAL_BORDO;
        this.coordinataXLineaPortaDestra = this.canvas.width - ScenaFase3.DISTANZA_LINEA_PORTA_DAL_BORDO;

        this.altezzaPortaSinistraAttuale = ScenaFase3.ALTEZZA_TRAVERSA_BASE;
        this.altezzaPortaDestraAttuale = ScenaFase3.ALTEZZA_TRAVERSA_BASE;

        this.areaPortaSinistra = { coordinataX: 0, coordinataY: 0, larghezza: 0, altezza: 0 };
        this.areaPortaDestra = { coordinataX: 0, coordinataY: 0, larghezza: 0, altezza: 0 };
        this.areaTraversaSinistra = { coordinataX: 0, coordinataY: 0, larghezza: 0, altezza: 0 };
        this.areaTraversaDestra = { coordinataX: 0, coordinataY: 0, larghezza: 0, altezza: 0 };
        this.aggiornaAreePorteETraverse();

        this.giocatore1 = new Giocatore(
            {
                x: 120,
                y: this.coordinataYPavimento - 120
            },
            {
                larghezza: 85,
                altezza: 120
            },
            "#1f5fa3",
            1
        );

        this.giocatore2 = new Giocatore(
            {
                x: this.canvas.width - 120 - 85,
                y: this.coordinataYPavimento - 120
            },
            {
                larghezza: 85,
                altezza: 120
            },
            "#a13f3f",
            -1
        );

        this.palla = new Palla(
            this.canvas.width / 2,
            this.coordinataYPavimento - 160,
            4,
            -6,
            22
        );

        this.punteggioGiocatore1 = 0;
        this.punteggioGiocatore2 = 0;

        this.bollePresentiNelCampo = [];

        this.identificatoreIntervalloGenerazioneBolle = null;
        this.identificatoreTimeoutPallaFire = null;
        this.identificatoreTimeoutPallaInvisibile = null;
        this.identificatoreTimeoutTestaGrandeGiocatore1 = null;
        this.identificatoreTimeoutTestaGrandeGiocatore2 = null;
        this.identificatoreTimeoutPortaGrandeSinistra = null;
        this.identificatoreTimeoutPortaGrandeDestra = null;

        this.identificatoreIntervalloGenerazioneBolle = window.setInterval(
            () => this.generaBolla(),
            ScenaFase3.INTERVALLO_GENERAZIONE_BOLLA_MILLISECONDI
        );
    }

    public avvia(): void {
        requestAnimationFrame(this.eseguiCicloGioco);
    }

    private eseguiCicloGioco = (): void => {
        const timestampAttualeMillisecondi: number = performance.now();

        this.aggiornaLogica(timestampAttualeMillisecondi);
        this.disegnaScena();

        requestAnimationFrame(this.eseguiCicloGioco);
    };

    private aggiornaLogica(timestampAttualeMillisecondi: number): void {
        const statoInputGiocatore1: StatoInputGiocatore = this.gestoreInputGiocatore1.ottieniStatoCorrente();
        const statoInputGiocatore2: StatoInputGiocatore = this.gestoreInputGiocatore2.ottieniStatoCorrente();

        this.giocatore1.aggiorna(
            statoInputGiocatore1,
            this.coordinataYPavimento,
            0,
            this.canvas.width,
            timestampAttualeMillisecondi
        );

        this.giocatore2.aggiorna(
            statoInputGiocatore2,
            this.coordinataYPavimento,
            0,
            this.canvas.width,
            timestampAttualeMillisecondi
        );

        this.gestisciRichiesteSuperpoteri();

        this.palla.aggiorna(
            0,
            this.canvas.width,
            0,
            this.coordinataYPavimento
        );

        controllaCollisione(this.giocatore1, this.palla);
        controllaCollisione(this.giocatore2, this.palla);

        this.controllaCollisioneSolidaPallaConTraversa();
        this.controllaCollisioniGiocatoriConBolle();
        this.rimuoviBolleNonAttive();
        this.controllaIngressoPallaNellePorte();
    }

    private disegnaScena(): void {
        this.contestoCanvas.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.contestoCanvas.fillStyle = "#87c8f7";
        this.contestoCanvas.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.contestoCanvas.fillStyle = "#5f9f4b";
        this.contestoCanvas.fillRect(
            0,
            this.coordinataYPavimento,
            this.canvas.width,
            this.canvas.height - this.coordinataYPavimento
        );

        this.contestoCanvas.strokeStyle = "#2b5d21";
        this.contestoCanvas.lineWidth = 3;
        this.contestoCanvas.beginPath();
        this.contestoCanvas.moveTo(0, this.coordinataYPavimento);
        this.contestoCanvas.lineTo(this.canvas.width, this.coordinataYPavimento);
        this.contestoCanvas.stroke();

        this.disegnaPorta(this.areaPortaSinistra);
        this.disegnaPorta(this.areaPortaDestra);

        this.disegnaTraversaSolida(this.areaTraversaSinistra);
        this.disegnaTraversaSolida(this.areaTraversaDestra);

        this.contestoCanvas.strokeStyle = "#4a6b89";
        this.contestoCanvas.lineWidth = 2;
        this.contestoCanvas.beginPath();
        this.contestoCanvas.moveTo(this.coordinataXLineaPortaSinistra, this.areaPortaSinistra.coordinataY);
        this.contestoCanvas.lineTo(this.coordinataXLineaPortaSinistra, this.coordinataYPavimento);
        this.contestoCanvas.moveTo(this.coordinataXLineaPortaDestra, this.areaPortaDestra.coordinataY);
        this.contestoCanvas.lineTo(this.coordinataXLineaPortaDestra, this.coordinataYPavimento);
        this.contestoCanvas.stroke();

        for (const bollaPresente of this.bollePresentiNelCampo) {
            bollaPresente.disegna(this.contestoCanvas);
        }

        this.giocatore1.disegna(this.contestoCanvas);
        this.giocatore2.disegna(this.contestoCanvas);
        this.palla.disegna(this.contestoCanvas);

        this.contestoCanvas.fillStyle = "#0f2542";
        this.contestoCanvas.font = "bold 22px Trebuchet MS";
        this.contestoCanvas.textAlign = "left";
        this.contestoCanvas.fillText("Fase 3: Doppio salto, superpoteri e bolle", 24, 34);

        this.contestoCanvas.fillStyle = "#ffffff";
        this.contestoCanvas.font = "bold 24px Trebuchet MS";
        this.contestoCanvas.fillText(
            `P1 ${this.punteggioGiocatore1} - ${this.punteggioGiocatore2} P2`,
            this.canvas.width / 2 - 88,
            34
        );

        this.contestoCanvas.font = "15px Trebuchet MS";
        this.contestoCanvas.fillText("P1: W A D | Q Teleport | E Fire", 24, 62);
        this.contestoCanvas.fillText("P2: Frecce | U Teleport | I Fire", 24, 82);
        this.contestoCanvas.fillText("Globali: R Inversione posti | T Palla invisibile", 24, 102);
    }

    private gestisciRichiesteSuperpoteri(): void {
        if (this.gestoreInputSuperpoteri.consumaRichiestaTeleportGiocatore1()) {
            this.attivaSuperpotereTeleport(this.giocatore1);
        }

        if (this.gestoreInputSuperpoteri.consumaRichiestaPallaFireGiocatore1()) {
            this.attivaSuperpoterePallaFire(this.giocatore1);
        }

        if (this.gestoreInputSuperpoteri.consumaRichiestaTeleportGiocatore2()) {
            this.attivaSuperpotereTeleport(this.giocatore2);
        }

        if (this.gestoreInputSuperpoteri.consumaRichiestaPallaFireGiocatore2()) {
            this.attivaSuperpoterePallaFire(this.giocatore2);
        }

        if (this.gestoreInputSuperpoteri.consumaRichiestaInversionePosti()) {
            this.attivaSuperpotereInversionePosti();
        }

        if (this.gestoreInputSuperpoteri.consumaRichiestaPallaInvisibile()) {
            this.attivaSuperpoterePallaInvisibile();
        }
    }

    private attivaSuperpotereTeleport(giocatoreAttivante: Giocatore): void {
        const centroPallaCorrente: Punto2D = this.palla.ottieniCentro();
        const dimensioneGiocatoreAttivante = giocatoreAttivante.ottieniDimensione();
        const direzioneAttaccoGiocatoreAttivante: number = giocatoreAttivante.ottieniDirezioneAttacco();

        let coordinataXNuovaGiocatore: number = 0;

        if (direzioneAttaccoGiocatoreAttivante > 0) {
            coordinataXNuovaGiocatore =
                centroPallaCorrente.x -
                ScenaFase3.DISTANZA_TELEPORT_DALLA_PALLA -
                dimensioneGiocatoreAttivante.larghezza;
        } else {
            coordinataXNuovaGiocatore = centroPallaCorrente.x + ScenaFase3.DISTANZA_TELEPORT_DALLA_PALLA;
        }

        let coordinataYNuovaGiocatore: number = centroPallaCorrente.y - dimensioneGiocatoreAttivante.altezza / 2;

        coordinataXNuovaGiocatore = this.limitaValoreTraMinimoEMassimo(
            coordinataXNuovaGiocatore,
            0,
            this.canvas.width - dimensioneGiocatoreAttivante.larghezza
        );

        coordinataYNuovaGiocatore = this.limitaValoreTraMinimoEMassimo(
            coordinataYNuovaGiocatore,
            0,
            this.coordinataYPavimento - dimensioneGiocatoreAttivante.altezza
        );

        giocatoreAttivante.reimpostaPosizione({
            x: coordinataXNuovaGiocatore,
            y: coordinataYNuovaGiocatore
        });
    }

    private attivaSuperpoterePallaFire(giocatoreAttivante: Giocatore): void {
        const direzioneVersoPortaAvversaria: number = giocatoreAttivante.ottieniDirezioneAttacco() >= 0 ? 1 : -1;

        this.palla.impostaGravitaPallaAttuale(0);
        this.palla.impostaVelocitaOrizzontaleForzata(
            ScenaFase3.VELOCITA_ORIZZONTALE_PALLA_FIRE * direzioneVersoPortaAvversaria
        );
        this.palla.impostaColorePalla(ScenaFase3.COLORE_PALLA_FIRE);

        if (this.identificatoreTimeoutPallaFire !== null) {
            window.clearTimeout(this.identificatoreTimeoutPallaFire);
        }

        this.identificatoreTimeoutPallaFire = window.setTimeout(() => {
            this.palla.ripristinaGravitaPallaPredefinita();
            this.palla.rimuoviVelocitaOrizzontaleForzata();
            this.palla.ripristinaColorePallaPredefinito();
            this.identificatoreTimeoutPallaFire = null;
        }, ScenaFase3.DURATA_PALLA_FIRE_MILLISECONDI);
    }

    private attivaSuperpotereInversionePosti(): void {
        const posizioneTemporaneaGiocatore1: Punto2D = this.giocatore1.ottieniPosizione();
        const posizioneGiocatore2PrimaDelloScambio: Punto2D = this.giocatore2.ottieniPosizione();

        this.giocatore1.reimpostaPosizione({
            x: posizioneGiocatore2PrimaDelloScambio.x,
            y: posizioneGiocatore2PrimaDelloScambio.y
        });

        this.giocatore2.reimpostaPosizione({
            x: posizioneTemporaneaGiocatore1.x,
            y: posizioneTemporaneaGiocatore1.y
        });

        const timestampAttualeMillisecondi: number = performance.now();

        this.giocatore1.bloccaMovimentoPerMillisecondi(
            ScenaFase3.DURATA_BLOCCO_INVERSIONE_MILLISECONDI,
            timestampAttualeMillisecondi
        );

        this.giocatore2.bloccaMovimentoPerMillisecondi(
            ScenaFase3.DURATA_BLOCCO_INVERSIONE_MILLISECONDI,
            timestampAttualeMillisecondi
        );
    }

    private attivaSuperpoterePallaInvisibile(): void {
        this.palla.impostaOpacitaPalla(0);

        if (this.identificatoreTimeoutPallaInvisibile !== null) {
            window.clearTimeout(this.identificatoreTimeoutPallaInvisibile);
        }

        this.identificatoreTimeoutPallaInvisibile = window.setTimeout(() => {
            this.palla.ripristinaOpacitaPallaPredefinita();
            this.identificatoreTimeoutPallaInvisibile = null;
        }, ScenaFase3.DURATA_PALLA_INVISIBILE_MILLISECONDI);
    }

    private controllaCollisioneSolidaPallaConTraversa(): void {
        this.gestisciCollisionePallaControRettangoloSolido(this.areaTraversaSinistra);
        this.gestisciCollisionePallaControRettangoloSolido(this.areaTraversaDestra);
    }

    private gestisciCollisionePallaControRettangoloSolido(areaRettangoloSolido: AreaRettangolare): void {
        const centroPallaCorrente: Punto2D = this.palla.ottieniCentro();
        const raggioPallaCorrente: number = this.palla.ottieniRaggio();

        const coordinataXPiuVicinaAlCentroPalla: number = Math.max(
            areaRettangoloSolido.coordinataX,
            Math.min(
                centroPallaCorrente.x,
                areaRettangoloSolido.coordinataX + areaRettangoloSolido.larghezza
            )
        );

        const coordinataYPiuVicinaAlCentroPalla: number = Math.max(
            areaRettangoloSolido.coordinataY,
            Math.min(
                centroPallaCorrente.y,
                areaRettangoloSolido.coordinataY + areaRettangoloSolido.altezza
            )
        );

        // Distanza centro-punto piu vicino del rettangolo:
        // se d^2 <= r^2 allora il cerchio (palla) interseca il rettangolo (traversa).
        const differenzaAsseXTraCentroEPuntoPiuVicino: number =
            centroPallaCorrente.x - coordinataXPiuVicinaAlCentroPalla;
        const differenzaAsseYTraCentroEPuntoPiuVicino: number =
            centroPallaCorrente.y - coordinataYPiuVicinaAlCentroPalla;

        const distanzaQuadraticaTraCentroEPuntoPiuVicino: number =
            differenzaAsseXTraCentroEPuntoPiuVicino * differenzaAsseXTraCentroEPuntoPiuVicino +
            differenzaAsseYTraCentroEPuntoPiuVicino * differenzaAsseYTraCentroEPuntoPiuVicino;

        if (distanzaQuadraticaTraCentroEPuntoPiuVicino > raggioPallaCorrente * raggioPallaCorrente) {
            return;
        }

        const ampiezzaPenetrazioneAsseX: number = Math.abs(differenzaAsseXTraCentroEPuntoPiuVicino);
        const ampiezzaPenetrazioneAsseY: number = Math.abs(differenzaAsseYTraCentroEPuntoPiuVicino);
        const margineSeparazioneDopoRimbalzo: number = 0.5;

        if (ampiezzaPenetrazioneAsseY >= ampiezzaPenetrazioneAsseX) {
            const coordinataYCentroRettangoloSolido: number =
                areaRettangoloSolido.coordinataY + areaRettangoloSolido.altezza / 2;

            if (centroPallaCorrente.y < coordinataYCentroRettangoloSolido) {
                const coordinataYCorrettivaPalla: number =
                    areaRettangoloSolido.coordinataY - raggioPallaCorrente - margineSeparazioneDopoRimbalzo;
                const deltaCorrezionePosizioneY: number = coordinataYCorrettivaPalla - centroPallaCorrente.y;
                this.palla.sposta(0, deltaCorrezionePosizioneY);
            } else {
                const coordinataYCorrettivaPalla: number =
                    areaRettangoloSolido.coordinataY +
                    areaRettangoloSolido.altezza +
                    raggioPallaCorrente +
                    margineSeparazioneDopoRimbalzo;
                const deltaCorrezionePosizioneY: number = coordinataYCorrettivaPalla - centroPallaCorrente.y;
                this.palla.sposta(0, deltaCorrezionePosizioneY);
            }

            this.palla.invertiVelocitaVerticale();
            return;
        }

        const coordinataXCentroRettangoloSolido: number =
            areaRettangoloSolido.coordinataX + areaRettangoloSolido.larghezza / 2;

        if (centroPallaCorrente.x < coordinataXCentroRettangoloSolido) {
            const coordinataXCorrettivaPalla: number =
                areaRettangoloSolido.coordinataX - raggioPallaCorrente - margineSeparazioneDopoRimbalzo;
            const deltaCorrezionePosizioneX: number = coordinataXCorrettivaPalla - centroPallaCorrente.x;
            this.palla.sposta(deltaCorrezionePosizioneX, 0);
        } else {
            const coordinataXCorrettivaPalla: number =
                areaRettangoloSolido.coordinataX +
                areaRettangoloSolido.larghezza +
                raggioPallaCorrente +
                margineSeparazioneDopoRimbalzo;
            const deltaCorrezionePosizioneX: number = coordinataXCorrettivaPalla - centroPallaCorrente.x;
            this.palla.sposta(deltaCorrezionePosizioneX, 0);
        }

        this.palla.invertiVelocitaOrizzontale();
    }

    private controllaIngressoPallaNellePorte(): void {
        const centroPallaCorrente: Punto2D = this.palla.ottieniCentro();

        const pallaHaSuperatoLineaPortaSinistra: boolean =
            centroPallaCorrente.x < this.coordinataXLineaPortaSinistra;

        const pallaHaSuperatoLineaPortaDestra: boolean =
            centroPallaCorrente.x > this.coordinataXLineaPortaDestra;

        const pallaSottoTraversaSinistra: boolean =
            centroPallaCorrente.y > this.areaPortaSinistra.coordinataY;

        const pallaSottoTraversaDestra: boolean =
            centroPallaCorrente.y > this.areaPortaDestra.coordinataY;

        if (pallaHaSuperatoLineaPortaSinistra && pallaSottoTraversaSinistra) {
            this.punteggioGiocatore2 += 1;
            this.reimpostaPosizioniAlCentroDopoGol();
            return;
        }

        if (pallaHaSuperatoLineaPortaDestra && pallaSottoTraversaDestra) {
            this.punteggioGiocatore1 += 1;
            this.reimpostaPosizioniAlCentroDopoGol();
        }
    }

    private reimpostaPosizioniAlCentroDopoGol(): void {
        const dimensioneGiocatore1 = this.giocatore1.ottieniDimensione();
        const dimensioneGiocatore2 = this.giocatore2.ottieniDimensione();

        this.giocatore1.reimpostaPosizione({
            x: 120,
            y: this.coordinataYPavimento - dimensioneGiocatore1.altezza
        });

        this.giocatore2.reimpostaPosizione({
            x: this.canvas.width - 120 - dimensioneGiocatore2.larghezza,
            y: this.coordinataYPavimento - dimensioneGiocatore2.altezza
        });

        this.palla.reimpostaPosizione(
            this.canvas.width / 2,
            this.coordinataYPavimento - 160
        );

        this.ripristinaEffettiTemporaneiPalla();
    }

    private generaBolla(): void {
        const tipoPotereSelezionato: TipoPotereBolla = this.ottieniTipoPotereBollaCasuale();
        const iconaAssociataAlPotere: string = this.ottieniIconaBollaPerTipoPotere(tipoPotereSelezionato);
        const raggioBolla: number = 22;

        const coordinataXCasualeBolla: number = this.ottieniNumeroCasualeTraMinimoEMassimo(
            80,
            this.canvas.width - 80
        );

        const coordinataYCasualeBolla: number = this.ottieniNumeroCasualeTraMinimoEMassimo(
            50,
            this.coordinataYPavimento * 0.5
        );

        this.bollePresentiNelCampo.push(
            new Bolla(
                coordinataXCasualeBolla,
                coordinataYCasualeBolla,
                raggioBolla,
                tipoPotereSelezionato,
                iconaAssociataAlPotere
            )
        );
    }

    private controllaCollisioniGiocatoriConBolle(): void {
        for (const bollaPresente of this.bollePresentiNelCampo) {
            if (!bollaPresente.eAttiva()) {
                continue;
            }

            const collisioneGiocatore1ConBolla: boolean = this.controllaCollisioneGiocatoreEBolla(
                this.giocatore1,
                bollaPresente
            );

            if (collisioneGiocatore1ConBolla) {
                bollaPresente.disattiva();
                this.attivaEffettoBolla(
                    bollaPresente.ottieniTipoPotere(),
                    this.giocatore1,
                    this.giocatore2
                );
                continue;
            }

            const collisioneGiocatore2ConBolla: boolean = this.controllaCollisioneGiocatoreEBolla(
                this.giocatore2,
                bollaPresente
            );

            if (collisioneGiocatore2ConBolla) {
                bollaPresente.disattiva();
                this.attivaEffettoBolla(
                    bollaPresente.ottieniTipoPotere(),
                    this.giocatore2,
                    this.giocatore1
                );
            }
        }
    }

    private controllaCollisioneGiocatoreEBolla(giocatore: Giocatore, bolla: Bolla): boolean {
        const centroGiocatore = giocatore.ottieniCentroCollisione();
        const centroBolla = bolla.ottieniCentro();

        const differenzaAsseXTraCentri: number = centroBolla.x - centroGiocatore.x;
        const differenzaAsseYTraCentri: number = centroBolla.y - centroGiocatore.y;

        // Collisione tra cerchi: distanzaTraCentri < sommaRaggi.
        // Usiamo il teorema di Pitagora per calcolare la distanza euclidea nel piano 2D.
        const distanzaTraCentri: number = Math.sqrt(
            differenzaAsseXTraCentri * differenzaAsseXTraCentri +
            differenzaAsseYTraCentri * differenzaAsseYTraCentri
        );

        const sommaRaggiTraGiocatoreEBolla: number =
            giocatore.ottieniRaggioCollisione() + bolla.ottieniRaggio();

        return distanzaTraCentri < sommaRaggiTraGiocatoreEBolla;
    }

    private attivaEffettoBolla(
        tipoPotereBolla: TipoPotereBolla,
        giocatoreAttivante: Giocatore,
        giocatoreAvversario: Giocatore
    ): void {
        switch (tipoPotereBolla) {
            case "Ghiaccio":
                this.attivaEffettoGhiaccio(giocatoreAvversario);
                break;

            case "Testa Grande":
                this.attivaEffettoTestaGrande(giocatoreAttivante);
                break;

            case "Porta Grande":
                this.attivaEffettoPortaGrande(giocatoreAttivante);
                break;

            default:
                break;
        }
    }

    private attivaEffettoGhiaccio(giocatoreAvversario: Giocatore): void {
        giocatoreAvversario.bloccaMovimentoPerMillisecondi(
            ScenaFase3.DURATA_EFFETTO_GHIACCIO_MILLISECONDI,
            performance.now()
        );
    }

    private attivaEffettoTestaGrande(giocatoreAttivante: Giocatore): void {
        giocatoreAttivante.impostaMoltiplicatoreDimensioneTesta(
            ScenaFase3.FATTORE_MOLTIPLICATIVO_TESTA_GRANDE
        );

        if (giocatoreAttivante === this.giocatore1) {
            if (this.identificatoreTimeoutTestaGrandeGiocatore1 !== null) {
                window.clearTimeout(this.identificatoreTimeoutTestaGrandeGiocatore1);
            }

            this.identificatoreTimeoutTestaGrandeGiocatore1 = window.setTimeout(() => {
                this.giocatore1.impostaMoltiplicatoreDimensioneTesta(1);
                this.identificatoreTimeoutTestaGrandeGiocatore1 = null;
            }, ScenaFase3.DURATA_EFFETTO_TESTA_GRANDE_MILLISECONDI);

            return;
        }

        if (this.identificatoreTimeoutTestaGrandeGiocatore2 !== null) {
            window.clearTimeout(this.identificatoreTimeoutTestaGrandeGiocatore2);
        }

        this.identificatoreTimeoutTestaGrandeGiocatore2 = window.setTimeout(() => {
            this.giocatore2.impostaMoltiplicatoreDimensioneTesta(1);
            this.identificatoreTimeoutTestaGrandeGiocatore2 = null;
        }, ScenaFase3.DURATA_EFFETTO_TESTA_GRANDE_MILLISECONDI);
    }

    private attivaEffettoPortaGrande(giocatoreAttivante: Giocatore): void {
        const altezzaPortaAumentata: number =
            ScenaFase3.ALTEZZA_TRAVERSA_BASE * ScenaFase3.FATTORE_MOLTIPLICATIVO_PORTA_GRANDE;

        if (giocatoreAttivante === this.giocatore1) {
            this.impostaAltezzaPortaTemporanea("destra", altezzaPortaAumentata);
            return;
        }

        this.impostaAltezzaPortaTemporanea("sinistra", altezzaPortaAumentata);
    }

    private impostaAltezzaPortaTemporanea(latoPorta: LatoPorta, altezzaPortaNuova: number): void {
        if (latoPorta === "sinistra") {
            this.altezzaPortaSinistraAttuale = altezzaPortaNuova;
            this.aggiornaAreePorteETraverse();

            if (this.identificatoreTimeoutPortaGrandeSinistra !== null) {
                window.clearTimeout(this.identificatoreTimeoutPortaGrandeSinistra);
            }

            this.identificatoreTimeoutPortaGrandeSinistra = window.setTimeout(() => {
                this.altezzaPortaSinistraAttuale = ScenaFase3.ALTEZZA_TRAVERSA_BASE;
                this.aggiornaAreePorteETraverse();
                this.identificatoreTimeoutPortaGrandeSinistra = null;
            }, ScenaFase3.DURATA_EFFETTO_PORTA_GRANDE_MILLISECONDI);

            return;
        }

        this.altezzaPortaDestraAttuale = altezzaPortaNuova;
        this.aggiornaAreePorteETraverse();

        if (this.identificatoreTimeoutPortaGrandeDestra !== null) {
            window.clearTimeout(this.identificatoreTimeoutPortaGrandeDestra);
        }

        this.identificatoreTimeoutPortaGrandeDestra = window.setTimeout(() => {
            this.altezzaPortaDestraAttuale = ScenaFase3.ALTEZZA_TRAVERSA_BASE;
            this.aggiornaAreePorteETraverse();
            this.identificatoreTimeoutPortaGrandeDestra = null;
        }, ScenaFase3.DURATA_EFFETTO_PORTA_GRANDE_MILLISECONDI);
    }

    private aggiornaAreePorteETraverse(): void {
        const coordinataYTraversaSinistra: number = this.coordinataYPavimento - this.altezzaPortaSinistraAttuale;
        const coordinataYTraversaDestra: number = this.coordinataYPavimento - this.altezzaPortaDestraAttuale;

        this.areaPortaSinistra = {
            coordinataX: 0,
            coordinataY: coordinataYTraversaSinistra,
            larghezza: this.coordinataXLineaPortaSinistra,
            altezza: this.altezzaPortaSinistraAttuale
        };

        this.areaPortaDestra = {
            coordinataX: this.coordinataXLineaPortaDestra,
            coordinataY: coordinataYTraversaDestra,
            larghezza: this.canvas.width - this.coordinataXLineaPortaDestra,
            altezza: this.altezzaPortaDestraAttuale
        };

        this.areaTraversaSinistra = {
            coordinataX: this.areaPortaSinistra.coordinataX,
            coordinataY: this.areaPortaSinistra.coordinataY - ScenaFase3.SPESSORE_TRAVERSA / 2,
            larghezza: this.areaPortaSinistra.larghezza,
            altezza: ScenaFase3.SPESSORE_TRAVERSA
        };

        this.areaTraversaDestra = {
            coordinataX: this.areaPortaDestra.coordinataX,
            coordinataY: this.areaPortaDestra.coordinataY - ScenaFase3.SPESSORE_TRAVERSA / 2,
            larghezza: this.areaPortaDestra.larghezza,
            altezza: ScenaFase3.SPESSORE_TRAVERSA
        };
    }

    private rimuoviBolleNonAttive(): void {
        this.bollePresentiNelCampo = this.bollePresentiNelCampo.filter((bollaPresente: Bolla) => bollaPresente.eAttiva());
    }

    private ottieniTipoPotereBollaCasuale(): TipoPotereBolla {
        const elencoTipiPotereDisponibili: TipoPotereBolla[] = [
            "Ghiaccio",
            "Testa Grande",
            "Porta Grande"
        ];

        const indiceCasuale: number = Math.floor(
            Math.random() * elencoTipiPotereDisponibili.length
        );

        return elencoTipiPotereDisponibili[indiceCasuale];
    }

    private ottieniIconaBollaPerTipoPotere(tipoPotereBolla: TipoPotereBolla): string {
        if (tipoPotereBolla === "Ghiaccio") {
            return "ICE";
        }

        if (tipoPotereBolla === "Testa Grande") {
            return "BIG";
        }

        return "GOAL";
    }

    private ottieniNumeroCasualeTraMinimoEMassimo(valoreMinimo: number, valoreMassimo: number): number {
        return valoreMinimo + Math.random() * (valoreMassimo - valoreMinimo);
    }

    private limitaValoreTraMinimoEMassimo(valore: number, valoreMinimo: number, valoreMassimo: number): number {
        return Math.max(valoreMinimo, Math.min(valore, valoreMassimo));
    }

    private ripristinaEffettiTemporaneiPalla(): void {
        this.palla.ripristinaGravitaPallaPredefinita();
        this.palla.rimuoviVelocitaOrizzontaleForzata();
        this.palla.ripristinaColorePallaPredefinito();
        this.palla.ripristinaOpacitaPallaPredefinita();

        if (this.identificatoreTimeoutPallaFire !== null) {
            window.clearTimeout(this.identificatoreTimeoutPallaFire);
            this.identificatoreTimeoutPallaFire = null;
        }

        if (this.identificatoreTimeoutPallaInvisibile !== null) {
            window.clearTimeout(this.identificatoreTimeoutPallaInvisibile);
            this.identificatoreTimeoutPallaInvisibile = null;
        }
    }

    private disegnaPorta(areaPorta: AreaRettangolare): void {
        this.contestoCanvas.fillStyle = "#dce8f5";
        this.contestoCanvas.fillRect(
            areaPorta.coordinataX,
            areaPorta.coordinataY,
            areaPorta.larghezza,
            areaPorta.altezza
        );

        this.contestoCanvas.strokeStyle = "#6b819e";
        this.contestoCanvas.lineWidth = 2;
        this.contestoCanvas.strokeRect(
            areaPorta.coordinataX,
            areaPorta.coordinataY,
            areaPorta.larghezza,
            areaPorta.altezza
        );
    }

    private disegnaTraversaSolida(areaTraversa: AreaRettangolare): void {
        this.contestoCanvas.fillStyle = "#21384f";
        this.contestoCanvas.fillRect(
            areaTraversa.coordinataX,
            areaTraversa.coordinataY,
            areaTraversa.larghezza,
            areaTraversa.altezza
        );
    }
}
