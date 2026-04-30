(() => {
  // headSoccer/src/bolla.ts
  var Bolla = class {
    x;
    y;
    raggio;
    tipoPotere;
    icona;
    attiva;
    constructor(coordinataX, coordinataY, raggio, tipoPotere, icona) {
      this.x = coordinataX;
      this.y = coordinataY;
      this.raggio = raggio;
      this.tipoPotere = tipoPotere;
      this.icona = icona;
      this.attiva = true;
    }
    disegna(contestoCanvas2) {
      if (!this.attiva) {
        return;
      }
      contestoCanvas2.beginPath();
      contestoCanvas2.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
      contestoCanvas2.fillStyle = this.ottieniColoreBollaPerTipoPotere();
      contestoCanvas2.fill();
      contestoCanvas2.beginPath();
      contestoCanvas2.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
      contestoCanvas2.strokeStyle = "#1f2c3d";
      contestoCanvas2.lineWidth = 2;
      contestoCanvas2.stroke();
      contestoCanvas2.fillStyle = "#0f2238";
      contestoCanvas2.font = "bold 11px Trebuchet MS";
      contestoCanvas2.textAlign = "center";
      contestoCanvas2.textBaseline = "middle";
      contestoCanvas2.fillText(this.icona, this.x, this.y);
    }
    ottieniCentro() {
      return {
        x: this.x,
        y: this.y
      };
    }
    ottieniRaggio() {
      return this.raggio;
    }
    ottieniTipoPotere() {
      return this.tipoPotere;
    }
    eAttiva() {
      return this.attiva;
    }
    disattiva() {
      this.attiva = false;
    }
    ottieniColoreBollaPerTipoPotere() {
      if (this.tipoPotere === "Ghiaccio") {
        return "#9fe8ff";
      }
      if (this.tipoPotere === "Testa Grande") {
        return "#ffc86d";
      }
      return "#b9ff9f";
    }
  };

  // headSoccer/src/collisioni.ts
  var SPINTA_VERTICALE_AUTOMATICA_CALCIO = -10;
  function controllaCollisione(giocatore, palla) {
    const centroGiocatore = giocatore.ottieniCentroCollisione();
    const centroPalla = palla.ottieniCentro();
    const differenzaTraCentriAsseX = centroPalla.x - centroGiocatore.x;
    const differenzaTraCentriAsseY = centroPalla.y - centroGiocatore.y;
    const distanzaTraCentri = Math.sqrt(
      differenzaTraCentriAsseX * differenzaTraCentriAsseX + differenzaTraCentriAsseY * differenzaTraCentriAsseY
    );
    const sommaRaggiCollisione = giocatore.ottieniRaggioCollisione() + palla.ottieniRaggio();
    if (distanzaTraCentri >= sommaRaggiCollisione) {
      return false;
    }
    const distanzaSicuraPerNormalizzazione = Math.max(distanzaTraCentri, 1e-3);
    const versoreDirezioneImpattoX = differenzaTraCentriAsseX / distanzaSicuraPerNormalizzazione;
    const versoreDirezioneImpattoY = differenzaTraCentriAsseY / distanzaSicuraPerNormalizzazione;
    const moduloVelocitaCorrentePalla = palla.ottieniModuloVelocita();
    const moduloVelocitaRimbalzo = Math.max(9, moduloVelocitaCorrentePalla * 1.05);
    const velocitaOrizzontaleDopoCalcio = versoreDirezioneImpattoX * moduloVelocitaRimbalzo;
    palla.impostaVelocita(
      velocitaOrizzontaleDopoCalcio,
      SPINTA_VERTICALE_AUTOMATICA_CALCIO
    );
    const profonditaSovrapposizioneTraCerchi = sommaRaggiCollisione - distanzaTraCentri;
    palla.sposta(
      versoreDirezioneImpattoX * profonditaSovrapposizioneTraCerchi,
      versoreDirezioneImpattoY * profonditaSovrapposizioneTraCerchi
    );
    return true;
  }

  // headSoccer/src/giocatore.ts
  var Giocatore = class _Giocatore {
    static GRAVITA = 0.8;
    static FORZA_SALTO = -15;
    static VELOCITA_MOVIMENTO = 5;
    static SALTI_MASSIMI_CONSENTITI = 2;
    posizione;
    velocita;
    colore;
    dimensione;
    contatoreSalti;
    tastoSaltoPremutoNelFramePrecedente;
    direzioneAttacco;
    moltiplicatoreDimensioneTesta;
    timestampFineBloccoMovimenti;
    constructor(posizioneIniziale, dimensioneIniziale, coloreIniziale, direzioneAttaccoIniziale = 1) {
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
      this.contatoreSalti = _Giocatore.SALTI_MASSIMI_CONSENTITI;
      this.tastoSaltoPremutoNelFramePrecedente = false;
      this.direzioneAttacco = direzioneAttaccoIniziale >= 0 ? 1 : -1;
      this.moltiplicatoreDimensioneTesta = 1;
      this.timestampFineBloccoMovimenti = 0;
    }
    aggiorna(statoInput, coordinataYPavimento, limiteSinistro, limiteDestro, timestampAttualeMillisecondi = performance.now()) {
      const movimentoAttualmenteBloccato = timestampAttualeMillisecondi < this.timestampFineBloccoMovimenti;
      const movimentoOrizzontaleRichiesto = movimentoAttualmenteBloccato ? 0 : this.calcolaMovimentoOrizzontale(statoInput);
      this.velocita.x = movimentoOrizzontaleRichiesto;
      if (movimentoOrizzontaleRichiesto > 0) {
        this.direzioneAttacco = 1;
      } else if (movimentoOrizzontaleRichiesto < 0) {
        this.direzioneAttacco = -1;
      }
      const saltoRichiestoNelFrameCorrente = statoInput.tastoSaltoPremuto;
      const saltoNuovoDaEseguire = saltoRichiestoNelFrameCorrente && !this.tastoSaltoPremutoNelFramePrecedente;
      if (saltoNuovoDaEseguire && this.contatoreSalti > 0 && !movimentoAttualmenteBloccato) {
        this.velocita.y = _Giocatore.FORZA_SALTO;
        this.contatoreSalti -= 1;
      }
      this.velocita.y += _Giocatore.GRAVITA;
      this.posizione.x += this.velocita.x;
      this.posizione.y += this.velocita.y;
      const coordinataYMassimaConsentita = coordinataYPavimento - this.dimensione.altezza;
      if (this.posizione.y > coordinataYMassimaConsentita) {
        this.posizione.y = coordinataYMassimaConsentita;
        this.velocita.y = 0;
        this.contatoreSalti = _Giocatore.SALTI_MASSIMI_CONSENTITI;
      }
      if (this.posizione.x < limiteSinistro) {
        this.posizione.x = limiteSinistro;
      }
      const coordinataXMassimaConsentita = limiteDestro - this.dimensione.larghezza;
      if (this.posizione.x > coordinataXMassimaConsentita) {
        this.posizione.x = coordinataXMassimaConsentita;
      }
      this.tastoSaltoPremutoNelFramePrecedente = saltoRichiestoNelFrameCorrente;
    }
    disegna(ctx) {
      const centroTestaX = this.posizione.x + this.dimensione.larghezza / 2;
      const raggioTestaBase = this.dimensione.larghezza * 0.45;
      const raggioTesta = raggioTestaBase * this.moltiplicatoreDimensioneTesta;
      const centroTestaY = this.posizione.y + raggioTesta;
      const posizioneCorpoY = this.posizione.y + raggioTesta * 1.7;
      const altezzaCorpo = Math.max(
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
      const raggioOcchi = Math.max(3, this.dimensione.larghezza * 0.04);
      const distanzaOrizzontaleOcchi = this.dimensione.larghezza * 0.16;
      const offsetVerticaleOcchi = raggioTesta * 0.15;
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
    ottieniCentroCollisione() {
      return {
        x: this.posizione.x + this.dimensione.larghezza / 2,
        y: this.posizione.y + this.dimensione.altezza / 2
      };
    }
    ottieniRaggioCollisione() {
      const raggioBaseCollisione = Math.min(this.dimensione.larghezza, this.dimensione.altezza) * 0.48;
      return raggioBaseCollisione * this.moltiplicatoreDimensioneTesta;
    }
    ottieniDimensione() {
      return {
        larghezza: this.dimensione.larghezza,
        altezza: this.dimensione.altezza
      };
    }
    reimpostaPosizione(posizioneNuova) {
      this.posizione.x = posizioneNuova.x;
      this.posizione.y = posizioneNuova.y;
      this.velocita.x = 0;
      this.velocita.y = 0;
    }
    ottieniPosizione() {
      return {
        x: this.posizione.x,
        y: this.posizione.y
      };
    }
    ottieniDirezioneAttacco() {
      return this.direzioneAttacco;
    }
    impostaMoltiplicatoreDimensioneTesta(moltiplicatoreDimensioneTesta) {
      this.moltiplicatoreDimensioneTesta = Math.max(1, moltiplicatoreDimensioneTesta);
    }
    bloccaMovimentoPerMillisecondi(durataBloccoMillisecondi, timestampAttualeMillisecondi = performance.now()) {
      const nuovoTimestampFineBlocco = timestampAttualeMillisecondi + durataBloccoMillisecondi;
      this.timestampFineBloccoMovimenti = Math.max(this.timestampFineBloccoMovimenti, nuovoTimestampFineBlocco);
    }
    ottieniContatoreSalti() {
      return this.contatoreSalti;
    }
    calcolaMovimentoOrizzontale(statoInput) {
      let movimentoOrizzontale = 0;
      if (statoInput.tastoSinistraPremuto) {
        movimentoOrizzontale -= _Giocatore.VELOCITA_MOVIMENTO;
      }
      if (statoInput.tastoDestraPremuto) {
        movimentoOrizzontale += _Giocatore.VELOCITA_MOVIMENTO;
      }
      return movimentoOrizzontale;
    }
    eSulPavimento(coordinataYPavimento) {
      const coordinataYMassimaConsentita = coordinataYPavimento - this.dimensione.altezza;
      return this.posizione.y >= coordinataYMassimaConsentita;
    }
  };

  // headSoccer/src/input-giocatore1.ts
  var GestoreInputGiocatoreBase = class {
    configurazioneTastiGiocatore;
    statoCorrenteGiocatore;
    constructor(configurazioneTastiGiocatore) {
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
    ottieniStatoCorrente() {
      return {
        tastoSaltoPremuto: this.statoCorrenteGiocatore.tastoSaltoPremuto,
        tastoSinistraPremuto: this.statoCorrenteGiocatore.tastoSinistraPremuto,
        tastoDestraPremuto: this.statoCorrenteGiocatore.tastoDestraPremuto
      };
    }
    gestisciPressioneTasto = (eventoTastiera) => {
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
    gestisciRilascioTasto = (eventoTastiera) => {
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
    ripristinaStatoInput = () => {
      this.statoCorrenteGiocatore.tastoSaltoPremuto = false;
      this.statoCorrenteGiocatore.tastoSinistraPremuto = false;
      this.statoCorrenteGiocatore.tastoDestraPremuto = false;
    };
  };
  var GestoreInputGiocatore1 = class extends GestoreInputGiocatoreBase {
    constructor() {
      super({
        codiceSalto: "KeyW",
        codiceSinistra: "KeyA",
        codiceDestra: "KeyD"
      });
    }
  };
  var GestoreInputGiocatore2 = class extends GestoreInputGiocatoreBase {
    constructor() {
      super({
        codiceSalto: "ArrowUp",
        codiceSinistra: "ArrowLeft",
        codiceDestra: "ArrowRight"
      });
    }
  };

  // headSoccer/src/input-superpoteri.ts
  var GestoreInputSuperpoteri = class {
    richiestaTeleportGiocatore1;
    richiestaPallaFireGiocatore1;
    richiestaTeleportGiocatore2;
    richiestaPallaFireGiocatore2;
    richiestaInversionePosti;
    richiestaPallaInvisibile;
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
    consumaRichiestaTeleportGiocatore1() {
      const richiestaCorrente = this.richiestaTeleportGiocatore1;
      this.richiestaTeleportGiocatore1 = false;
      return richiestaCorrente;
    }
    consumaRichiestaPallaFireGiocatore1() {
      const richiestaCorrente = this.richiestaPallaFireGiocatore1;
      this.richiestaPallaFireGiocatore1 = false;
      return richiestaCorrente;
    }
    consumaRichiestaTeleportGiocatore2() {
      const richiestaCorrente = this.richiestaTeleportGiocatore2;
      this.richiestaTeleportGiocatore2 = false;
      return richiestaCorrente;
    }
    consumaRichiestaPallaFireGiocatore2() {
      const richiestaCorrente = this.richiestaPallaFireGiocatore2;
      this.richiestaPallaFireGiocatore2 = false;
      return richiestaCorrente;
    }
    consumaRichiestaInversionePosti() {
      const richiestaCorrente = this.richiestaInversionePosti;
      this.richiestaInversionePosti = false;
      return richiestaCorrente;
    }
    consumaRichiestaPallaInvisibile() {
      const richiestaCorrente = this.richiestaPallaInvisibile;
      this.richiestaPallaInvisibile = false;
      return richiestaCorrente;
    }
    gestisciPressioneTasto = (eventoTastiera) => {
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
    annullaTutteLeRichieste = () => {
      this.richiestaTeleportGiocatore1 = false;
      this.richiestaPallaFireGiocatore1 = false;
      this.richiestaTeleportGiocatore2 = false;
      this.richiestaPallaFireGiocatore2 = false;
      this.richiestaInversionePosti = false;
      this.richiestaPallaInvisibile = false;
    };
  };

  // headSoccer/src/palla.ts
  var Palla = class _Palla {
    // Questi parametri non cercano la precisione fisica reale: sono scelti per il game feel arcade.
    // L'obiettivo e ottenere una palla piu viva, piu leggibile e divertente da controllare.
    static GRAVITA_PALLA_PREDEFINITA = 0.4;
    static FATTORE_PERDITA_ENERGIA_RIMBALZO_LATERALE = 0.8;
    static COEFFICIENTE_RIMBALZO_PAVIMENTO = 0.85;
    static SOGLIA_FERMATA_VELOCITA_VERTICALE = 1;
    static FATTORE_ATTRITO_ORIZZONTALE_SUOLO = 0.98;
    static COLORE_PALLA_PREDEFINITO = "#ffffff";
    static OPACITA_PALLA_PREDEFINITA = 1;
    x;
    y;
    vx;
    vy;
    raggio;
    gravitaPallaAttuale;
    velocitaOrizzontaleForzata;
    colorePalla;
    opacitaPalla;
    constructor(coordinataInizialeX, coordinataInizialeY, velocitaInizialeX, velocitaInizialeY, raggioIniziale) {
      this.x = coordinataInizialeX;
      this.y = coordinataInizialeY;
      this.vx = velocitaInizialeX;
      this.vy = velocitaInizialeY;
      this.raggio = raggioIniziale;
      this.gravitaPallaAttuale = _Palla.GRAVITA_PALLA_PREDEFINITA;
      this.velocitaOrizzontaleForzata = null;
      this.colorePalla = _Palla.COLORE_PALLA_PREDEFINITO;
      this.opacitaPalla = _Palla.OPACITA_PALLA_PREDEFINITA;
    }
    aggiorna(limiteSinistroCampo, limiteDestroCampo, limiteSuperioreCampo, coordinataYPavimento) {
      this.vy += this.gravitaPallaAttuale;
      if (this.velocitaOrizzontaleForzata !== null) {
        this.vx = this.velocitaOrizzontaleForzata;
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.x - this.raggio <= limiteSinistroCampo) {
        this.x = limiteSinistroCampo + this.raggio;
        this.vx *= -_Palla.FATTORE_PERDITA_ENERGIA_RIMBALZO_LATERALE;
      }
      if (this.x + this.raggio >= limiteDestroCampo) {
        this.x = limiteDestroCampo - this.raggio;
        this.vx *= -_Palla.FATTORE_PERDITA_ENERGIA_RIMBALZO_LATERALE;
      }
      if (this.y - this.raggio <= limiteSuperioreCampo) {
        this.y = limiteSuperioreCampo + this.raggio;
        this.vy *= -1;
      }
      if (this.y + this.raggio >= coordinataYPavimento) {
        this.y = coordinataYPavimento - this.raggio;
        const coefficienteRimbalzo = _Palla.COEFFICIENTE_RIMBALZO_PAVIMENTO;
        this.vy *= -coefficienteRimbalzo;
        if (Math.abs(this.vy) < _Palla.SOGLIA_FERMATA_VELOCITA_VERTICALE) {
          this.vy = 0;
        }
        this.vx *= _Palla.FATTORE_ATTRITO_ORIZZONTALE_SUOLO;
      }
    }
    disegna(contestoCanvas2) {
      if (this.opacitaPalla <= 0) {
        return;
      }
      contestoCanvas2.save();
      contestoCanvas2.globalAlpha = this.opacitaPalla;
      contestoCanvas2.beginPath();
      contestoCanvas2.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
      contestoCanvas2.fillStyle = this.colorePalla;
      contestoCanvas2.fill();
      contestoCanvas2.beginPath();
      contestoCanvas2.arc(this.x, this.y, this.raggio, 0, Math.PI * 2);
      contestoCanvas2.lineWidth = 2;
      contestoCanvas2.strokeStyle = "#1d2535";
      contestoCanvas2.stroke();
      contestoCanvas2.restore();
    }
    ottieniCentro() {
      return {
        x: this.x,
        y: this.y
      };
    }
    ottieniRaggio() {
      return this.raggio;
    }
    ottieniModuloVelocita() {
      return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }
    impostaVelocita(velocitaNuovaX, velocitaNuovaY) {
      this.vx = velocitaNuovaX;
      this.vy = velocitaNuovaY;
    }
    impostaGravitaPallaAttuale(nuovaGravitaPalla) {
      this.gravitaPallaAttuale = nuovaGravitaPalla;
    }
    ripristinaGravitaPallaPredefinita() {
      this.gravitaPallaAttuale = _Palla.GRAVITA_PALLA_PREDEFINITA;
    }
    impostaVelocitaOrizzontaleForzata(velocitaOrizzontaleForzata) {
      this.velocitaOrizzontaleForzata = velocitaOrizzontaleForzata;
    }
    rimuoviVelocitaOrizzontaleForzata() {
      this.velocitaOrizzontaleForzata = null;
    }
    impostaColorePalla(colorePalla) {
      this.colorePalla = colorePalla;
    }
    ripristinaColorePallaPredefinito() {
      this.colorePalla = _Palla.COLORE_PALLA_PREDEFINITO;
    }
    impostaOpacitaPalla(opacitaPalla) {
      this.opacitaPalla = Math.max(0, Math.min(opacitaPalla, 1));
    }
    ripristinaOpacitaPallaPredefinita() {
      this.opacitaPalla = _Palla.OPACITA_PALLA_PREDEFINITA;
    }
    invertiVelocitaOrizzontale(fattoreRimbalzoEnergia = 1) {
      this.vx *= -fattoreRimbalzoEnergia;
    }
    invertiVelocitaVerticale(fattoreRimbalzoEnergia = 1) {
      this.vy *= -fattoreRimbalzoEnergia;
    }
    sposta(deltaX, deltaY) {
      this.x += deltaX;
      this.y += deltaY;
    }
    reimpostaPosizione(centroNuovoX, centroNuovoY) {
      this.x = centroNuovoX;
      this.y = centroNuovoY;
      this.vx = 0;
      this.vy = 0;
    }
  };

  // headSoccer/src/scena-fase1.ts
  var ScenaFase3 = class _ScenaFase3 {
    static ALTEZZA_TRAVERSA_BASE = 150;
    static SPESSORE_TRAVERSA = 10;
    static DISTANZA_LINEA_PORTA_DAL_BORDO = 50;
    static DISTANZA_TELEPORT_DALLA_PALLA = 50;
    static VELOCITA_ORIZZONTALE_PALLA_FIRE = 25;
    static DURATA_PALLA_FIRE_MILLISECONDI = 1500;
    static DURATA_PALLA_INVISIBILE_MILLISECONDI = 2e3;
    static DURATA_BLOCCO_INVERSIONE_MILLISECONDI = 200;
    static INTERVALLO_GENERAZIONE_BOLLA_MILLISECONDI = 15e3;
    static DURATA_EFFETTO_GHIACCIO_MILLISECONDI = 2e3;
    static DURATA_EFFETTO_TESTA_GRANDE_MILLISECONDI = 5e3;
    static DURATA_EFFETTO_PORTA_GRANDE_MILLISECONDI = 5e3;
    static FATTORE_MOLTIPLICATIVO_TESTA_GRANDE = 1.45;
    static FATTORE_MOLTIPLICATIVO_PORTA_GRANDE = 1.35;
    static COLORE_PALLA_FIRE = "orange";
    canvas;
    contestoCanvas;
    gestoreInputGiocatore1;
    gestoreInputGiocatore2;
    gestoreInputSuperpoteri;
    giocatore1;
    giocatore2;
    palla;
    coordinataYPavimento;
    coordinataXLineaPortaSinistra;
    coordinataXLineaPortaDestra;
    altezzaPortaSinistraAttuale;
    altezzaPortaDestraAttuale;
    areaPortaSinistra;
    areaPortaDestra;
    areaTraversaSinistra;
    areaTraversaDestra;
    punteggioGiocatore1;
    punteggioGiocatore2;
    bollePresentiNelCampo;
    identificatoreIntervalloGenerazioneBolle;
    identificatoreTimeoutPallaFire;
    identificatoreTimeoutPallaInvisibile;
    identificatoreTimeoutTestaGrandeGiocatore1;
    identificatoreTimeoutTestaGrandeGiocatore2;
    identificatoreTimeoutPortaGrandeSinistra;
    identificatoreTimeoutPortaGrandeDestra;
    constructor(canvas, contestoCanvas2) {
      this.canvas = canvas;
      this.contestoCanvas = contestoCanvas2;
      this.gestoreInputGiocatore1 = new GestoreInputGiocatore1();
      this.gestoreInputGiocatore2 = new GestoreInputGiocatore2();
      this.gestoreInputSuperpoteri = new GestoreInputSuperpoteri();
      this.coordinataYPavimento = 350;
      this.coordinataXLineaPortaSinistra = _ScenaFase3.DISTANZA_LINEA_PORTA_DAL_BORDO;
      this.coordinataXLineaPortaDestra = this.canvas.width - _ScenaFase3.DISTANZA_LINEA_PORTA_DAL_BORDO;
      this.altezzaPortaSinistraAttuale = _ScenaFase3.ALTEZZA_TRAVERSA_BASE;
      this.altezzaPortaDestraAttuale = _ScenaFase3.ALTEZZA_TRAVERSA_BASE;
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
        _ScenaFase3.INTERVALLO_GENERAZIONE_BOLLA_MILLISECONDI
      );
    }
    avvia() {
      requestAnimationFrame(this.eseguiCicloGioco);
    }
    eseguiCicloGioco = () => {
      const timestampAttualeMillisecondi = performance.now();
      this.aggiornaLogica(timestampAttualeMillisecondi);
      this.disegnaScena();
      requestAnimationFrame(this.eseguiCicloGioco);
    };
    aggiornaLogica(timestampAttualeMillisecondi) {
      const statoInputGiocatore1 = this.gestoreInputGiocatore1.ottieniStatoCorrente();
      const statoInputGiocatore2 = this.gestoreInputGiocatore2.ottieniStatoCorrente();
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
    disegnaScena() {
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
    gestisciRichiesteSuperpoteri() {
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
    attivaSuperpotereTeleport(giocatoreAttivante) {
      const centroPallaCorrente = this.palla.ottieniCentro();
      const dimensioneGiocatoreAttivante = giocatoreAttivante.ottieniDimensione();
      const direzioneAttaccoGiocatoreAttivante = giocatoreAttivante.ottieniDirezioneAttacco();
      let coordinataXNuovaGiocatore = 0;
      if (direzioneAttaccoGiocatoreAttivante > 0) {
        coordinataXNuovaGiocatore = centroPallaCorrente.x - _ScenaFase3.DISTANZA_TELEPORT_DALLA_PALLA - dimensioneGiocatoreAttivante.larghezza;
      } else {
        coordinataXNuovaGiocatore = centroPallaCorrente.x + _ScenaFase3.DISTANZA_TELEPORT_DALLA_PALLA;
      }
      let coordinataYNuovaGiocatore = centroPallaCorrente.y - dimensioneGiocatoreAttivante.altezza / 2;
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
    attivaSuperpoterePallaFire(giocatoreAttivante) {
      const direzioneVersoPortaAvversaria = giocatoreAttivante.ottieniDirezioneAttacco() >= 0 ? 1 : -1;
      this.palla.impostaGravitaPallaAttuale(0);
      this.palla.impostaVelocitaOrizzontaleForzata(
        _ScenaFase3.VELOCITA_ORIZZONTALE_PALLA_FIRE * direzioneVersoPortaAvversaria
      );
      this.palla.impostaColorePalla(_ScenaFase3.COLORE_PALLA_FIRE);
      if (this.identificatoreTimeoutPallaFire !== null) {
        window.clearTimeout(this.identificatoreTimeoutPallaFire);
      }
      this.identificatoreTimeoutPallaFire = window.setTimeout(() => {
        this.palla.ripristinaGravitaPallaPredefinita();
        this.palla.rimuoviVelocitaOrizzontaleForzata();
        this.palla.ripristinaColorePallaPredefinito();
        this.identificatoreTimeoutPallaFire = null;
      }, _ScenaFase3.DURATA_PALLA_FIRE_MILLISECONDI);
    }
    attivaSuperpotereInversionePosti() {
      const posizioneTemporaneaGiocatore1 = this.giocatore1.ottieniPosizione();
      const posizioneGiocatore2PrimaDelloScambio = this.giocatore2.ottieniPosizione();
      this.giocatore1.reimpostaPosizione({
        x: posizioneGiocatore2PrimaDelloScambio.x,
        y: posizioneGiocatore2PrimaDelloScambio.y
      });
      this.giocatore2.reimpostaPosizione({
        x: posizioneTemporaneaGiocatore1.x,
        y: posizioneTemporaneaGiocatore1.y
      });
      const timestampAttualeMillisecondi = performance.now();
      this.giocatore1.bloccaMovimentoPerMillisecondi(
        _ScenaFase3.DURATA_BLOCCO_INVERSIONE_MILLISECONDI,
        timestampAttualeMillisecondi
      );
      this.giocatore2.bloccaMovimentoPerMillisecondi(
        _ScenaFase3.DURATA_BLOCCO_INVERSIONE_MILLISECONDI,
        timestampAttualeMillisecondi
      );
    }
    attivaSuperpoterePallaInvisibile() {
      this.palla.impostaOpacitaPalla(0);
      if (this.identificatoreTimeoutPallaInvisibile !== null) {
        window.clearTimeout(this.identificatoreTimeoutPallaInvisibile);
      }
      this.identificatoreTimeoutPallaInvisibile = window.setTimeout(() => {
        this.palla.ripristinaOpacitaPallaPredefinita();
        this.identificatoreTimeoutPallaInvisibile = null;
      }, _ScenaFase3.DURATA_PALLA_INVISIBILE_MILLISECONDI);
    }
    controllaCollisioneSolidaPallaConTraversa() {
      this.gestisciCollisionePallaControRettangoloSolido(this.areaTraversaSinistra);
      this.gestisciCollisionePallaControRettangoloSolido(this.areaTraversaDestra);
    }
    gestisciCollisionePallaControRettangoloSolido(areaRettangoloSolido) {
      const centroPallaCorrente = this.palla.ottieniCentro();
      const raggioPallaCorrente = this.palla.ottieniRaggio();
      const coordinataXPiuVicinaAlCentroPalla = Math.max(
        areaRettangoloSolido.coordinataX,
        Math.min(
          centroPallaCorrente.x,
          areaRettangoloSolido.coordinataX + areaRettangoloSolido.larghezza
        )
      );
      const coordinataYPiuVicinaAlCentroPalla = Math.max(
        areaRettangoloSolido.coordinataY,
        Math.min(
          centroPallaCorrente.y,
          areaRettangoloSolido.coordinataY + areaRettangoloSolido.altezza
        )
      );
      const differenzaAsseXTraCentroEPuntoPiuVicino = centroPallaCorrente.x - coordinataXPiuVicinaAlCentroPalla;
      const differenzaAsseYTraCentroEPuntoPiuVicino = centroPallaCorrente.y - coordinataYPiuVicinaAlCentroPalla;
      const distanzaQuadraticaTraCentroEPuntoPiuVicino = differenzaAsseXTraCentroEPuntoPiuVicino * differenzaAsseXTraCentroEPuntoPiuVicino + differenzaAsseYTraCentroEPuntoPiuVicino * differenzaAsseYTraCentroEPuntoPiuVicino;
      if (distanzaQuadraticaTraCentroEPuntoPiuVicino > raggioPallaCorrente * raggioPallaCorrente) {
        return;
      }
      const ampiezzaPenetrazioneAsseX = Math.abs(differenzaAsseXTraCentroEPuntoPiuVicino);
      const ampiezzaPenetrazioneAsseY = Math.abs(differenzaAsseYTraCentroEPuntoPiuVicino);
      const margineSeparazioneDopoRimbalzo = 0.5;
      if (ampiezzaPenetrazioneAsseY >= ampiezzaPenetrazioneAsseX) {
        const coordinataYCentroRettangoloSolido = areaRettangoloSolido.coordinataY + areaRettangoloSolido.altezza / 2;
        if (centroPallaCorrente.y < coordinataYCentroRettangoloSolido) {
          const coordinataYCorrettivaPalla = areaRettangoloSolido.coordinataY - raggioPallaCorrente - margineSeparazioneDopoRimbalzo;
          const deltaCorrezionePosizioneY = coordinataYCorrettivaPalla - centroPallaCorrente.y;
          this.palla.sposta(0, deltaCorrezionePosizioneY);
        } else {
          const coordinataYCorrettivaPalla = areaRettangoloSolido.coordinataY + areaRettangoloSolido.altezza + raggioPallaCorrente + margineSeparazioneDopoRimbalzo;
          const deltaCorrezionePosizioneY = coordinataYCorrettivaPalla - centroPallaCorrente.y;
          this.palla.sposta(0, deltaCorrezionePosizioneY);
        }
        this.palla.invertiVelocitaVerticale();
        return;
      }
      const coordinataXCentroRettangoloSolido = areaRettangoloSolido.coordinataX + areaRettangoloSolido.larghezza / 2;
      if (centroPallaCorrente.x < coordinataXCentroRettangoloSolido) {
        const coordinataXCorrettivaPalla = areaRettangoloSolido.coordinataX - raggioPallaCorrente - margineSeparazioneDopoRimbalzo;
        const deltaCorrezionePosizioneX = coordinataXCorrettivaPalla - centroPallaCorrente.x;
        this.palla.sposta(deltaCorrezionePosizioneX, 0);
      } else {
        const coordinataXCorrettivaPalla = areaRettangoloSolido.coordinataX + areaRettangoloSolido.larghezza + raggioPallaCorrente + margineSeparazioneDopoRimbalzo;
        const deltaCorrezionePosizioneX = coordinataXCorrettivaPalla - centroPallaCorrente.x;
        this.palla.sposta(deltaCorrezionePosizioneX, 0);
      }
      this.palla.invertiVelocitaOrizzontale();
    }
    controllaIngressoPallaNellePorte() {
      const centroPallaCorrente = this.palla.ottieniCentro();
      const pallaHaSuperatoLineaPortaSinistra = centroPallaCorrente.x < this.coordinataXLineaPortaSinistra;
      const pallaHaSuperatoLineaPortaDestra = centroPallaCorrente.x > this.coordinataXLineaPortaDestra;
      const pallaSottoTraversaSinistra = centroPallaCorrente.y > this.areaPortaSinistra.coordinataY;
      const pallaSottoTraversaDestra = centroPallaCorrente.y > this.areaPortaDestra.coordinataY;
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
    reimpostaPosizioniAlCentroDopoGol() {
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
    generaBolla() {
      const tipoPotereSelezionato = this.ottieniTipoPotereBollaCasuale();
      const iconaAssociataAlPotere = this.ottieniIconaBollaPerTipoPotere(tipoPotereSelezionato);
      const raggioBolla = 22;
      const coordinataXCasualeBolla = this.ottieniNumeroCasualeTraMinimoEMassimo(
        80,
        this.canvas.width - 80
      );
      const coordinataYCasualeBolla = this.ottieniNumeroCasualeTraMinimoEMassimo(
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
    controllaCollisioniGiocatoriConBolle() {
      for (const bollaPresente of this.bollePresentiNelCampo) {
        if (!bollaPresente.eAttiva()) {
          continue;
        }
        const collisioneGiocatore1ConBolla = this.controllaCollisioneGiocatoreEBolla(
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
        const collisioneGiocatore2ConBolla = this.controllaCollisioneGiocatoreEBolla(
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
    controllaCollisioneGiocatoreEBolla(giocatore, bolla) {
      const centroGiocatore = giocatore.ottieniCentroCollisione();
      const centroBolla = bolla.ottieniCentro();
      const differenzaAsseXTraCentri = centroBolla.x - centroGiocatore.x;
      const differenzaAsseYTraCentri = centroBolla.y - centroGiocatore.y;
      const distanzaTraCentri = Math.sqrt(
        differenzaAsseXTraCentri * differenzaAsseXTraCentri + differenzaAsseYTraCentri * differenzaAsseYTraCentri
      );
      const sommaRaggiTraGiocatoreEBolla = giocatore.ottieniRaggioCollisione() + bolla.ottieniRaggio();
      return distanzaTraCentri < sommaRaggiTraGiocatoreEBolla;
    }
    attivaEffettoBolla(tipoPotereBolla, giocatoreAttivante, giocatoreAvversario) {
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
    attivaEffettoGhiaccio(giocatoreAvversario) {
      giocatoreAvversario.bloccaMovimentoPerMillisecondi(
        _ScenaFase3.DURATA_EFFETTO_GHIACCIO_MILLISECONDI,
        performance.now()
      );
    }
    attivaEffettoTestaGrande(giocatoreAttivante) {
      giocatoreAttivante.impostaMoltiplicatoreDimensioneTesta(
        _ScenaFase3.FATTORE_MOLTIPLICATIVO_TESTA_GRANDE
      );
      if (giocatoreAttivante === this.giocatore1) {
        if (this.identificatoreTimeoutTestaGrandeGiocatore1 !== null) {
          window.clearTimeout(this.identificatoreTimeoutTestaGrandeGiocatore1);
        }
        this.identificatoreTimeoutTestaGrandeGiocatore1 = window.setTimeout(() => {
          this.giocatore1.impostaMoltiplicatoreDimensioneTesta(1);
          this.identificatoreTimeoutTestaGrandeGiocatore1 = null;
        }, _ScenaFase3.DURATA_EFFETTO_TESTA_GRANDE_MILLISECONDI);
        return;
      }
      if (this.identificatoreTimeoutTestaGrandeGiocatore2 !== null) {
        window.clearTimeout(this.identificatoreTimeoutTestaGrandeGiocatore2);
      }
      this.identificatoreTimeoutTestaGrandeGiocatore2 = window.setTimeout(() => {
        this.giocatore2.impostaMoltiplicatoreDimensioneTesta(1);
        this.identificatoreTimeoutTestaGrandeGiocatore2 = null;
      }, _ScenaFase3.DURATA_EFFETTO_TESTA_GRANDE_MILLISECONDI);
    }
    attivaEffettoPortaGrande(giocatoreAttivante) {
      const altezzaPortaAumentata = _ScenaFase3.ALTEZZA_TRAVERSA_BASE * _ScenaFase3.FATTORE_MOLTIPLICATIVO_PORTA_GRANDE;
      if (giocatoreAttivante === this.giocatore1) {
        this.impostaAltezzaPortaTemporanea("destra", altezzaPortaAumentata);
        return;
      }
      this.impostaAltezzaPortaTemporanea("sinistra", altezzaPortaAumentata);
    }
    impostaAltezzaPortaTemporanea(latoPorta, altezzaPortaNuova) {
      if (latoPorta === "sinistra") {
        this.altezzaPortaSinistraAttuale = altezzaPortaNuova;
        this.aggiornaAreePorteETraverse();
        if (this.identificatoreTimeoutPortaGrandeSinistra !== null) {
          window.clearTimeout(this.identificatoreTimeoutPortaGrandeSinistra);
        }
        this.identificatoreTimeoutPortaGrandeSinistra = window.setTimeout(() => {
          this.altezzaPortaSinistraAttuale = _ScenaFase3.ALTEZZA_TRAVERSA_BASE;
          this.aggiornaAreePorteETraverse();
          this.identificatoreTimeoutPortaGrandeSinistra = null;
        }, _ScenaFase3.DURATA_EFFETTO_PORTA_GRANDE_MILLISECONDI);
        return;
      }
      this.altezzaPortaDestraAttuale = altezzaPortaNuova;
      this.aggiornaAreePorteETraverse();
      if (this.identificatoreTimeoutPortaGrandeDestra !== null) {
        window.clearTimeout(this.identificatoreTimeoutPortaGrandeDestra);
      }
      this.identificatoreTimeoutPortaGrandeDestra = window.setTimeout(() => {
        this.altezzaPortaDestraAttuale = _ScenaFase3.ALTEZZA_TRAVERSA_BASE;
        this.aggiornaAreePorteETraverse();
        this.identificatoreTimeoutPortaGrandeDestra = null;
      }, _ScenaFase3.DURATA_EFFETTO_PORTA_GRANDE_MILLISECONDI);
    }
    aggiornaAreePorteETraverse() {
      const coordinataYTraversaSinistra = this.coordinataYPavimento - this.altezzaPortaSinistraAttuale;
      const coordinataYTraversaDestra = this.coordinataYPavimento - this.altezzaPortaDestraAttuale;
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
        coordinataY: this.areaPortaSinistra.coordinataY - _ScenaFase3.SPESSORE_TRAVERSA / 2,
        larghezza: this.areaPortaSinistra.larghezza,
        altezza: _ScenaFase3.SPESSORE_TRAVERSA
      };
      this.areaTraversaDestra = {
        coordinataX: this.areaPortaDestra.coordinataX,
        coordinataY: this.areaPortaDestra.coordinataY - _ScenaFase3.SPESSORE_TRAVERSA / 2,
        larghezza: this.areaPortaDestra.larghezza,
        altezza: _ScenaFase3.SPESSORE_TRAVERSA
      };
    }
    rimuoviBolleNonAttive() {
      this.bollePresentiNelCampo = this.bollePresentiNelCampo.filter((bollaPresente) => bollaPresente.eAttiva());
    }
    ottieniTipoPotereBollaCasuale() {
      const elencoTipiPotereDisponibili = [
        "Ghiaccio",
        "Testa Grande",
        "Porta Grande"
      ];
      const indiceCasuale = Math.floor(
        Math.random() * elencoTipiPotereDisponibili.length
      );
      return elencoTipiPotereDisponibili[indiceCasuale];
    }
    ottieniIconaBollaPerTipoPotere(tipoPotereBolla) {
      if (tipoPotereBolla === "Ghiaccio") {
        return "ICE";
      }
      if (tipoPotereBolla === "Testa Grande") {
        return "BIG";
      }
      return "GOAL";
    }
    ottieniNumeroCasualeTraMinimoEMassimo(valoreMinimo, valoreMassimo) {
      return valoreMinimo + Math.random() * (valoreMassimo - valoreMinimo);
    }
    limitaValoreTraMinimoEMassimo(valore, valoreMinimo, valoreMassimo) {
      return Math.max(valoreMinimo, Math.min(valore, valoreMassimo));
    }
    ripristinaEffettiTemporaneiPalla() {
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
    disegnaPorta(areaPorta) {
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
    disegnaTraversaSolida(areaTraversa) {
      this.contestoCanvas.fillStyle = "#21384f";
      this.contestoCanvas.fillRect(
        areaTraversa.coordinataX,
        areaTraversa.coordinataY,
        areaTraversa.larghezza,
        areaTraversa.altezza
      );
    }
  };

  // headSoccer/src/main.ts
  var canvasGioco = document.getElementById("campo-gioco");
  if (canvasGioco === null) {
    throw new Error("Canvas con id 'campo-gioco' non trovato nel documento HTML.");
  }
  var contestoCanvas = canvasGioco.getContext("2d");
  if (contestoCanvas === null) {
    throw new Error("Impossibile ottenere il contesto 2D del canvas.");
  }
  var scenaFase3 = new ScenaFase3(canvasGioco, contestoCanvas);
  scenaFase3.avvia();
})();
