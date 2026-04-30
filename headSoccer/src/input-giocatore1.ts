export interface StatoInputGiocatore {
    tastoSaltoPremuto: boolean;
    tastoSinistraPremuto: boolean;
    tastoDestraPremuto: boolean;
}

interface ConfigurazioneTastiGiocatore {
    codiceSalto: string;
    codiceSinistra: string;
    codiceDestra: string;
}

abstract class GestoreInputGiocatoreBase {
    private readonly configurazioneTastiGiocatore: ConfigurazioneTastiGiocatore;
    private readonly statoCorrenteGiocatore: StatoInputGiocatore;

    protected constructor(configurazioneTastiGiocatore: ConfigurazioneTastiGiocatore) {
        this.configurazioneTastiGiocatore = configurazioneTastiGiocatore;

        this.statoCorrenteGiocatore = {
            tastoSaltoPremuto: false,
            tastoSinistraPremuto: false,
            tastoDestraPremuto: false
        };

        window.addEventListener("keydown", this.gestisciPressioneTasto);
        window.addEventListener("keyup", this.gestisciRilascioTasto);
        window.addEventListener("blur", this.ripristinaStatoInput);
    }

    public ottieniStatoCorrente(): StatoInputGiocatore {
        return {
            tastoSaltoPremuto: this.statoCorrenteGiocatore.tastoSaltoPremuto,
            tastoSinistraPremuto: this.statoCorrenteGiocatore.tastoSinistraPremuto,
            tastoDestraPremuto: this.statoCorrenteGiocatore.tastoDestraPremuto
        };
    }

    private gestisciPressioneTasto = (eventoTastiera: KeyboardEvent): void => {
        if (eventoTastiera.code === this.configurazioneTastiGiocatore.codiceSalto) {
            this.statoCorrenteGiocatore.tastoSaltoPremuto = true;
            eventoTastiera.preventDefault();
            return;
        }

        if (eventoTastiera.code === this.configurazioneTastiGiocatore.codiceSinistra) {
            this.statoCorrenteGiocatore.tastoSinistraPremuto = true;
            eventoTastiera.preventDefault();
            return;
        }

        if (eventoTastiera.code === this.configurazioneTastiGiocatore.codiceDestra) {
            this.statoCorrenteGiocatore.tastoDestraPremuto = true;
            eventoTastiera.preventDefault();
        }
    };

    private gestisciRilascioTasto = (eventoTastiera: KeyboardEvent): void => {
        if (eventoTastiera.code === this.configurazioneTastiGiocatore.codiceSalto) {
            this.statoCorrenteGiocatore.tastoSaltoPremuto = false;
            return;
        }

        if (eventoTastiera.code === this.configurazioneTastiGiocatore.codiceSinistra) {
            this.statoCorrenteGiocatore.tastoSinistraPremuto = false;
            return;
        }

        if (eventoTastiera.code === this.configurazioneTastiGiocatore.codiceDestra) {
            this.statoCorrenteGiocatore.tastoDestraPremuto = false;
        }
    };

    private ripristinaStatoInput = (): void => {
        this.statoCorrenteGiocatore.tastoSaltoPremuto = false;
        this.statoCorrenteGiocatore.tastoSinistraPremuto = false;
        this.statoCorrenteGiocatore.tastoDestraPremuto = false;
    };
}

export class GestoreInputGiocatore1 extends GestoreInputGiocatoreBase {
    constructor() {
        super({
            codiceSalto: "KeyW",
            codiceSinistra: "KeyA",
            codiceDestra: "KeyD"
        });
    }
}

export class GestoreInputGiocatore2 extends GestoreInputGiocatoreBase {
    constructor() {
        super({
            codiceSalto: "ArrowUp",
            codiceSinistra: "ArrowLeft",
            codiceDestra: "ArrowRight"
        });
    }
}