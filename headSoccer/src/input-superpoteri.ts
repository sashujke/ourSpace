export class GestoreInputSuperpoteri {
    private richiestaTeleportGiocatore1: boolean;
    private richiestaPallaFireGiocatore1: boolean;
    private richiestaTeleportGiocatore2: boolean;
    private richiestaPallaFireGiocatore2: boolean;
    private richiestaInversionePosti: boolean;
    private richiestaPallaInvisibile: boolean;

    constructor() {
        this.richiestaTeleportGiocatore1 = false;
        this.richiestaPallaFireGiocatore1 = false;
        this.richiestaTeleportGiocatore2 = false;
        this.richiestaPallaFireGiocatore2 = false;
        this.richiestaInversionePosti = false;
        this.richiestaPallaInvisibile = false;

        window.addEventListener("keydown", this.gestisciPressioneTasto);
        window.addEventListener("blur", this.annullaTutteLeRichieste);
    }

    public consumaRichiestaTeleportGiocatore1(): boolean {
        const richiestaCorrente: boolean = this.richiestaTeleportGiocatore1;
        this.richiestaTeleportGiocatore1 = false;
        return richiestaCorrente;
    }

    public consumaRichiestaPallaFireGiocatore1(): boolean {
        const richiestaCorrente: boolean = this.richiestaPallaFireGiocatore1;
        this.richiestaPallaFireGiocatore1 = false;
        return richiestaCorrente;
    }

    public consumaRichiestaTeleportGiocatore2(): boolean {
        const richiestaCorrente: boolean = this.richiestaTeleportGiocatore2;
        this.richiestaTeleportGiocatore2 = false;
        return richiestaCorrente;
    }

    public consumaRichiestaPallaFireGiocatore2(): boolean {
        const richiestaCorrente: boolean = this.richiestaPallaFireGiocatore2;
        this.richiestaPallaFireGiocatore2 = false;
        return richiestaCorrente;
    }

    public consumaRichiestaInversionePosti(): boolean {
        const richiestaCorrente: boolean = this.richiestaInversionePosti;
        this.richiestaInversionePosti = false;
        return richiestaCorrente;
    }

    public consumaRichiestaPallaInvisibile(): boolean {
        const richiestaCorrente: boolean = this.richiestaPallaInvisibile;
        this.richiestaPallaInvisibile = false;
        return richiestaCorrente;
    }

    private gestisciPressioneTasto = (eventoTastiera: KeyboardEvent): void => {
        if (eventoTastiera.repeat) {
            return;
        }

        if (eventoTastiera.code === "KeyQ") {
            this.richiestaTeleportGiocatore1 = true;
            return;
        }

        if (eventoTastiera.code === "KeyE") {
            this.richiestaPallaFireGiocatore1 = true;
            return;
        }

        if (eventoTastiera.code === "KeyU") {
            this.richiestaTeleportGiocatore2 = true;
            return;
        }

        if (eventoTastiera.code === "KeyI") {
            this.richiestaPallaFireGiocatore2 = true;
            return;
        }

        if (eventoTastiera.code === "KeyR") {
            this.richiestaInversionePosti = true;
            return;
        }

        if (eventoTastiera.code === "KeyT") {
            this.richiestaPallaInvisibile = true;
        }
    };

    private annullaTutteLeRichieste = (): void => {
        this.richiestaTeleportGiocatore1 = false;
        this.richiestaPallaFireGiocatore1 = false;
        this.richiestaTeleportGiocatore2 = false;
        this.richiestaPallaFireGiocatore2 = false;
        this.richiestaInversionePosti = false;
        this.richiestaPallaInvisibile = false;
    };
}