import { Punto2D } from "./punto-2d";

export type TipoPotereBolla = "Ghiaccio" | "Testa Grande" | "Porta Grande";

export class Bolla {
    private x: number;
    private y: number;
    private raggio: number;
    private tipoPotere: TipoPotereBolla;
    private icona: string;
    private attiva: boolean;

    constructor(
        coordinataX: number,
        coordinataY: number,
        raggio: number,
        tipoPotere: TipoPotereBolla,
        icona: string
    ) {
        this.x = coordinataX;
        this.y = coordinataY;
        this.raggio = raggio;
        this.tipoPotere = tipoPotere;
        this.icona = icona;
        this.attiva = true;
    }

    public disegna(contestoCanvas: CanvasRenderingContext2D): void {
        if (!this.attiva) {
            return;
        }

        contestoCanvas.beginPath();
        contestoCanvas.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
        contestoCanvas.fillStyle = this.ottieniColoreBollaPerTipoPotere();
        contestoCanvas.fill();

        contestoCanvas.beginPath();
        contestoCanvas.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
        contestoCanvas.strokeStyle = "#1f2c3d";
        contestoCanvas.lineWidth = 2;
        contestoCanvas.stroke();

        contestoCanvas.fillStyle = "#0f2238";
        contestoCanvas.font = "bold 11px Trebuchet MS";
        contestoCanvas.textAlign = "center";
        contestoCanvas.textBaseline = "middle";
        contestoCanvas.fillText(this.icona, this.x, this.y);
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

    public ottieniTipoPotere(): TipoPotereBolla {
        return this.tipoPotere;
    }

    public eAttiva(): boolean {
        return this.attiva;
    }

    public disattiva(): void {
        this.attiva = false;
    }

    private ottieniColoreBollaPerTipoPotere(): string {
        if (this.tipoPotere === "Ghiaccio") {
            return "#9fe8ff";
        }

        if (this.tipoPotere === "Testa Grande") {
            return "#ffc86d";
        }

        return "#b9ff9f";
    }
}