import { StatoInputGiocatore } from "./input-giocatore1";
import { Punto2D } from "./punto-2d";

export interface DimensioneGiocatore {
    larghezza: number;
    altezza: number;
}

export class Giocatore {
    private static readonly GRAVITA: number = 0.8;
    private static readonly FORZA_SALTO: number = -15;
    private static readonly VELOCITA_MOVIMENTO: number = 5;
    private static readonly SALTI_MASSIMI_CONSENTITI: number = 2;

    private posizione: Punto2D;
    private velocita: Punto2D;
    private colore: string;
    private dimensione: DimensioneGiocatore;
    private contatoreSalti: number;
    private tastoSaltoPremutoNelFramePrecedente: boolean;
    private direzioneAttacco: number;
    private moltiplicatoreDimensioneTesta: number;
    private timestampFineBloccoMovimenti: number;

    constructor(
        posizioneIniziale: Punto2D,
        dimensioneIniziale: DimensioneGiocatore,
        coloreIniziale: string,
        direzioneAttaccoIniziale: number = 1
    ) {
        this.posizione = {
            x: posizioneIniziale.x,
            y: posizioneIniziale.y
        };

        this.velocita = {
            x: 0,
            y: 0
        };

        this.colore = coloreIniziale;

        this.dimensione = {
            larghezza: dimensioneIniziale.larghezza,
            altezza: dimensioneIniziale.altezza
        };

        this.contatoreSalti = Giocatore.SALTI_MASSIMI_CONSENTITI;
        this.tastoSaltoPremutoNelFramePrecedente = false;
        this.direzioneAttacco = direzioneAttaccoIniziale >= 0 ? 1 : -1;
        this.moltiplicatoreDimensioneTesta = 1;
        this.timestampFineBloccoMovimenti = 0;
    }

    public aggiorna(
        statoInput: StatoInputGiocatore,
        coordinataYPavimento: number,
        limiteSinistro: number,
        limiteDestro: number,
        timestampAttualeMillisecondi: number = performance.now()
    ): void {
        const movimentoAttualmenteBloccato: boolean =
            timestampAttualeMillisecondi < this.timestampFineBloccoMovimenti;

        // Convertiamo l'input in una velocita orizzontale richiesta per il frame corrente.
        const movimentoOrizzontaleRichiesto: number = movimentoAttualmenteBloccato
            ? 0
            : this.calcolaMovimentoOrizzontale(statoInput);

        // Applichiamo subito la velocita orizzontale per avere un controllo diretto del personaggio.
        this.velocita.x = movimentoOrizzontaleRichiesto;

        if (movimentoOrizzontaleRichiesto > 0) {
            this.direzioneAttacco = 1;
        } else if (movimentoOrizzontaleRichiesto < 0) {
            this.direzioneAttacco = -1;
        }

        const saltoRichiestoNelFrameCorrente: boolean = statoInput.tastoSaltoPremuto;

        // Il salto viene autorizzato solo nel frame in cui il tasto passa da "non premuto" a "premuto".
        // Questo evita che una pressione prolungata consumi tutti i salti in un solo istante.
        const saltoNuovoDaEseguire: boolean =
            saltoRichiestoNelFrameCorrente && !this.tastoSaltoPremutoNelFramePrecedente;

        // Se e disponibile almeno un salto nel contatore, applichiamo la spinta verticale.
        if (saltoNuovoDaEseguire && this.contatoreSalti > 0 && !movimentoAttualmenteBloccato) {
            // Una velocita verticale negativa spinge il personaggio verso l'alto.
            this.velocita.y = Giocatore.FORZA_SALTO;

            // Ogni salto consumato riduce il contatore fino a zero.
            this.contatoreSalti -= 1;
        }

        // Aggiungiamo la gravita alla velocita verticale per simulare l'accelerazione verso il basso.
        this.velocita.y += Giocatore.GRAVITA;

        // Aggiorniamo la posizione orizzontale usando la velocita calcolata in questo frame.
        this.posizione.x += this.velocita.x;

        // Aggiorniamo la posizione verticale usando la velocita influenzata dalla gravita.
        this.posizione.y += this.velocita.y;

        // Calcoliamo la massima coordinata Y ammessa per il bordo superiore del giocatore.
        const coordinataYMassimaConsentita: number = coordinataYPavimento - this.dimensione.altezza;

        // Se il giocatore scende sotto il pavimento, lo riportiamo immediatamente sul piano corretto.
        if (this.posizione.y > coordinataYMassimaConsentita) {
            // Fissiamo la posizione esattamente al livello del suolo per impedire compenetrazioni.
            this.posizione.y = coordinataYMassimaConsentita;

            // Annulliamo la velocita verticale residua, cosi il giocatore smette di affondare.
            this.velocita.y = 0;

            // Quando rileviamo il contatto con il suolo, riabilitiamo il doppio salto.
            this.contatoreSalti = Giocatore.SALTI_MASSIMI_CONSENTITI;
        }

        // Manteniamo il giocatore entro il bordo sinistro del campo di gioco.
        if (this.posizione.x < limiteSinistro) {
            this.posizione.x = limiteSinistro;
        }

        // Calcoliamo il limite massimo sulla destra considerando la larghezza effettiva del giocatore.
        const coordinataXMassimaConsentita: number = limiteDestro - this.dimensione.larghezza;

        // Manteniamo il giocatore entro il bordo destro del campo di gioco.
        if (this.posizione.x > coordinataXMassimaConsentita) {
            this.posizione.x = coordinataXMassimaConsentita;
        }

        this.tastoSaltoPremutoNelFramePrecedente = saltoRichiestoNelFrameCorrente;
    }

    public disegna(ctx: CanvasRenderingContext2D): void {
        const centroTestaX: number = this.posizione.x + this.dimensione.larghezza / 2;
        const raggioTestaBase: number = this.dimensione.larghezza * 0.45;
        const raggioTesta: number = raggioTestaBase * this.moltiplicatoreDimensioneTesta;
        const centroTestaY: number = this.posizione.y + raggioTesta;
        const posizioneCorpoY: number = this.posizione.y + raggioTesta * 1.7;
        const altezzaCorpo: number = Math.max(
            20,
            this.dimensione.altezza - (posizioneCorpoY - this.posizione.y)
        );

        ctx.fillStyle = this.colore;
        ctx.fillRect(
            this.posizione.x,
            posizioneCorpoY,
            this.dimensione.larghezza,
            altezzaCorpo
        );

        ctx.beginPath();
        ctx.arc(centroTestaX, centroTestaY, raggioTesta, 0, Math.PI * 2);
        ctx.fillStyle = "#f2c28f";
        ctx.fill();

        const raggioOcchi: number = Math.max(3, this.dimensione.larghezza * 0.04);
        const distanzaOrizzontaleOcchi: number = this.dimensione.larghezza * 0.16;
        const offsetVerticaleOcchi: number = raggioTesta * 0.15;

        ctx.beginPath();
        ctx.arc(
            centroTestaX - distanzaOrizzontaleOcchi,
            centroTestaY - offsetVerticaleOcchi,
            raggioOcchi,
            0,
            Math.PI * 2
        );
        ctx.arc(
            centroTestaX + distanzaOrizzontaleOcchi,
            centroTestaY - offsetVerticaleOcchi,
            raggioOcchi,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = "#1a1a1a";
        ctx.fill();
    }

    public ottieniCentroCollisione(): Punto2D {
        return {
            x: this.posizione.x + this.dimensione.larghezza / 2,
            y: this.posizione.y + (this.dimensione.altezza / 2)
        };
    }

    public ottieniRaggioCollisione(): number {
        const raggioBaseCollisione: number = Math.min(this.dimensione.larghezza, this.dimensione.altezza) * 0.48;
        return raggioBaseCollisione * this.moltiplicatoreDimensioneTesta;
    }

    public ottieniDimensione(): DimensioneGiocatore {
        return {
            larghezza: this.dimensione.larghezza,
            altezza: this.dimensione.altezza
        };
    }

    public reimpostaPosizione(posizioneNuova: Punto2D): void {
        this.posizione.x = posizioneNuova.x;
        this.posizione.y = posizioneNuova.y;
        this.velocita.x = 0;
        this.velocita.y = 0;
    }

    public ottieniPosizione(): Punto2D {
        return {
            x: this.posizione.x,
            y: this.posizione.y
        };
    }

    public ottieniDirezioneAttacco(): number {
        return this.direzioneAttacco;
    }

    public impostaMoltiplicatoreDimensioneTesta(moltiplicatoreDimensioneTesta: number): void {
        this.moltiplicatoreDimensioneTesta = Math.max(1, moltiplicatoreDimensioneTesta);
    }

    public bloccaMovimentoPerMillisecondi(
        durataBloccoMillisecondi: number,
        timestampAttualeMillisecondi: number = performance.now()
    ): void {
        const nuovoTimestampFineBlocco: number = timestampAttualeMillisecondi + durataBloccoMillisecondi;
        this.timestampFineBloccoMovimenti = Math.max(this.timestampFineBloccoMovimenti, nuovoTimestampFineBlocco);
    }

    public ottieniContatoreSalti(): number {
        return this.contatoreSalti;
    }

    private calcolaMovimentoOrizzontale(statoInput: StatoInputGiocatore): number {
        let movimentoOrizzontale: number = 0;

        if (statoInput.tastoSinistraPremuto) {
            movimentoOrizzontale -= Giocatore.VELOCITA_MOVIMENTO;
        }

        if (statoInput.tastoDestraPremuto) {
            movimentoOrizzontale += Giocatore.VELOCITA_MOVIMENTO;
        }

        return movimentoOrizzontale;
    }

    private eSulPavimento(coordinataYPavimento: number): boolean {
        const coordinataYMassimaConsentita: number = coordinataYPavimento - this.dimensione.altezza;
        return this.posizione.y >= coordinataYMassimaConsentita;
    }
}