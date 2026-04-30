import { Punto2D } from "./punto-2d";

export class Palla {
    // Questi parametri non cercano la precisione fisica reale: sono scelti per il game feel arcade.
    // L'obiettivo e ottenere una palla piu viva, piu leggibile e divertente da controllare.
    private static readonly GRAVITA_PALLA_PREDEFINITA: number = 0.4;
    private static readonly FATTORE_PERDITA_ENERGIA_RIMBALZO_LATERALE: number = 0.8;
    private static readonly COEFFICIENTE_RIMBALZO_PAVIMENTO: number = 0.85;
    private static readonly SOGLIA_FERMATA_VELOCITA_VERTICALE: number = 1;
    private static readonly FATTORE_ATTRITO_ORIZZONTALE_SUOLO: number = 0.98;
    private static readonly COLORE_PALLA_PREDEFINITO: string = "#ffffff";
    private static readonly OPACITA_PALLA_PREDEFINITA: number = 1;

    private x: number;
    private y: number;
    private vx: number;
    private vy: number;
    private raggio: number;
    private gravitaPallaAttuale: number;
    private velocitaOrizzontaleForzata: number | null;
    private colorePalla: string;
    private opacitaPalla: number;

    constructor(
        coordinataInizialeX: number,
        coordinataInizialeY: number,
        velocitaInizialeX: number,
        velocitaInizialeY: number,
        raggioIniziale: number
    ) {
        this.x = coordinataInizialeX;
        this.y = coordinataInizialeY;
        this.vx = velocitaInizialeX;
        this.vy = velocitaInizialeY;
        this.raggio = raggioIniziale;
        this.gravitaPallaAttuale = Palla.GRAVITA_PALLA_PREDEFINITA;
        this.velocitaOrizzontaleForzata = null;
        this.colorePalla = Palla.COLORE_PALLA_PREDEFINITO;
        this.opacitaPalla = Palla.OPACITA_PALLA_PREDEFINITA;
    }

    public aggiorna(
        limiteSinistroCampo: number,
        limiteDestroCampo: number,
        limiteSuperioreCampo: number,
        coordinataYPavimento: number
    ): void {
        this.vy += this.gravitaPallaAttuale;

        if (this.velocitaOrizzontaleForzata !== null) {
            this.vx = this.velocitaOrizzontaleForzata;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.raggio <= limiteSinistroCampo) {
            this.x = limiteSinistroCampo + this.raggio;
            this.vx *= -Palla.FATTORE_PERDITA_ENERGIA_RIMBALZO_LATERALE;
        }

        if (this.x + this.raggio >= limiteDestroCampo) {
            this.x = limiteDestroCampo - this.raggio;
            this.vx *= -Palla.FATTORE_PERDITA_ENERGIA_RIMBALZO_LATERALE;
        }

        if (this.y - this.raggio <= limiteSuperioreCampo) {
            this.y = limiteSuperioreCampo + this.raggio;
            this.vy *= -1;
        }

        if (this.y + this.raggio >= coordinataYPavimento) {
            this.y = coordinataYPavimento - this.raggio;

            const coefficienteRimbalzo: number = Palla.COEFFICIENTE_RIMBALZO_PAVIMENTO;

            // Moltiplicare per un valore minore di 1 riduce l'energia cinetica dopo l'impatto,
            // quindi ogni rimbalzo successivo risulta piu basso e naturale.
            this.vy *= -coefficienteRimbalzo;

            if (Math.abs(this.vy) < Palla.SOGLIA_FERMATA_VELOCITA_VERTICALE) {
                this.vy = 0;
            }

            // Quando la palla tocca il suolo applichiamo attrito orizzontale: anche qui un valore
            // minore di 1 simula perdita progressiva di energia cinetica nel movimento laterale.
            this.vx *= Palla.FATTORE_ATTRITO_ORIZZONTALE_SUOLO;
        }
    }

    public disegna(contestoCanvas: CanvasRenderingContext2D): void {
        if (this.opacitaPalla <= 0) {
            return;
        }

        contestoCanvas.save();
        contestoCanvas.globalAlpha = this.opacitaPalla;

        contestoCanvas.beginPath();
        contestoCanvas.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
        contestoCanvas.fillStyle = this.colorePalla;
        contestoCanvas.fill();

        contestoCanvas.beginPath();
        contestoCanvas.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
        contestoCanvas.lineWidth = 2;
        contestoCanvas.strokeStyle = "#1d2535";
        contestoCanvas.stroke();

        contestoCanvas.restore();
    }

    public ottieniCentro(): Punto2D {
        return {
            x: this.x,
            y: this.y
        };
    }

    public ottieniRaggio(): number {
        return this.raggio;
    }

    public ottieniModuloVelocita(): number {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    public impostaVelocita(velocitaNuovaX: number, velocitaNuovaY: number): void {
        this.vx = velocitaNuovaX;
        this.vy = velocitaNuovaY;
    }

    public impostaGravitaPallaAttuale(nuovaGravitaPalla: number): void {
        this.gravitaPallaAttuale = nuovaGravitaPalla;
    }

    public ripristinaGravitaPallaPredefinita(): void {
        this.gravitaPallaAttuale = Palla.GRAVITA_PALLA_PREDEFINITA;
    }

    public impostaVelocitaOrizzontaleForzata(velocitaOrizzontaleForzata: number): void {
        this.velocitaOrizzontaleForzata = velocitaOrizzontaleForzata;
    }

    public rimuoviVelocitaOrizzontaleForzata(): void {
        this.velocitaOrizzontaleForzata = null;
    }

    public impostaColorePalla(colorePalla: string): void {
        this.colorePalla = colorePalla;
    }

    public ripristinaColorePallaPredefinito(): void {
        this.colorePalla = Palla.COLORE_PALLA_PREDEFINITO;
    }

    public impostaOpacitaPalla(opacitaPalla: number): void {
        this.opacitaPalla = Math.max(0, Math.min(opacitaPalla, 1));
    }

    public ripristinaOpacitaPallaPredefinita(): void {
        this.opacitaPalla = Palla.OPACITA_PALLA_PREDEFINITA;
    }

    public invertiVelocitaOrizzontale(fattoreRimbalzoEnergia: number = 1): void {
        this.vx *= -fattoreRimbalzoEnergia;
    }

    public invertiVelocitaVerticale(fattoreRimbalzoEnergia: number = 1): void {
        this.vy *= -fattoreRimbalzoEnergia;
    }

    public sposta(deltaX: number, deltaY: number): void {
        this.x += deltaX;
        this.y += deltaY;
    }

    public reimpostaPosizione(centroNuovoX: number, centroNuovoY: number): void {
        this.x = centroNuovoX;
        this.y = centroNuovoY;
        this.vx = 0;
        this.vy = 0;
    }
}