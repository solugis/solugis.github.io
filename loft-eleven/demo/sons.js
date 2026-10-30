/* LOFT ELEVEN — identité sonore originale, entièrement synthétisée (Web Audio API) : aucun fichier, aucune licence tierce.
   Piano feutré (partiels amortis, marteau adouci), notes cristallines (cloche), réverbération générée.
   Rien ne joue sans une action explicite : le contexte audio n'est créé qu'après un toucher ou un clic. */
var SONS = (function () {
  'use strict';
  var ctx = null, maitre = null, salle = null, sec = null, reglages = { sons: false, ambiance: false, volume: 0.6 };
  var amb = { actif: false, bus: null, minuteur: null, accord: 0 };

  function hz(note) {   // 'D4', 'F#5', 'Bb3'
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(note), base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (base + (+m[3] - 4) * 12) / 12);
  }
  function impulsion(duree, decroissance) {
    var n = Math.floor(ctx.sampleRate * duree), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decroissance) * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1); }
    return b;
  }
  function preparer() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
    maitre = ctx.createGain(); maitre.gain.value = reglages.volume; maitre.connect(comp); comp.connect(ctx.destination);
    salle = ctx.createConvolver(); salle.buffer = impulsion(3.2, 2.6);
    var retour = ctx.createGain(); retour.gain.value = 0.32; salle.connect(retour); retour.connect(maitre);
    sec = ctx.createGain(); sec.gain.value = 0.85; sec.connect(maitre);
    return true;
  }
  function envoi(noeud, humide) { noeud.connect(sec); var g = ctx.createGain(); g.gain.value = humide; noeud.connect(g); g.connect(salle); }

  /* Piano feutré : partiels légèrement inharmoniques, attaque douce, filtre qui se referme (feutre). */
  function piano(note, t, vel, duree, dest) {
    var f = hz(note), v = vel || 0.5, d = duree || Math.max(1.2, 3.6 - Math.log2(f / 130) * 0.55);
    var sortie = ctx.createGain(), filtre = ctx.createBiquadFilter();
    filtre.type = 'lowpass'; filtre.Q.value = 0.4;
    filtre.frequency.setValueAtTime(Math.min(9000, f * 7 + 900), t); filtre.frequency.exponentialRampToValueAtTime(Math.max(400, f * 1.6), t + d * 0.6);
    sortie.gain.setValueAtTime(0.0001, t); sortie.gain.exponentialRampToValueAtTime(v * 0.42, t + 0.008); sortie.gain.exponentialRampToValueAtTime(v * 0.16, t + 0.32); sortie.gain.exponentialRampToValueAtTime(0.0001, t + d);
    [[1, 1], [2, 0.42], [3, 0.2], [4, 0.1], [5, 0.05], [6, 0.025]].forEach(function (p, i) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i ? 'sine' : 'triangle'; o.frequency.value = f * p[0] * (1 + 0.0004 * p[0] * p[0]); o.detune.value = (Math.random() - 0.5) * 4;
      g.gain.setValueAtTime(p[1], t); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, p[1] * 0.02), t + d * (1 - i * 0.11));
      o.connect(g); g.connect(filtre); o.start(t); o.stop(t + d + 0.1);
    });
    // marteau feutré : bref souffle filtré
    var bruit = ctx.createBufferSource(), nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate), dd = nb.getChannelData(0);
    for (var i = 0; i < dd.length; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / dd.length);
    var bf = ctx.createBiquadFilter(), bg = ctx.createGain(); bf.type = 'bandpass'; bf.frequency.value = f * 3; bf.Q.value = 1.2; bg.gain.value = v * 0.05;
    bruit.buffer = nb; bruit.connect(bf); bf.connect(bg); bg.connect(filtre); bruit.start(t);
    filtre.connect(sortie);
    if (dest) sortie.connect(dest); else envoi(sortie, 0.55);
  }
  /* Note cristalline : sinus et partiels de cloche (rapports 2,76 et 5,40), décroissance rapide. */
  function cristal(note, t, vel, duree, dest) {
    var f = hz(note), v = vel || 0.3, d = duree || 2.2, sortie = ctx.createGain();
    sortie.gain.setValueAtTime(0.0001, t); sortie.gain.exponentialRampToValueAtTime(v * 0.3, t + 0.004); sortie.gain.exponentialRampToValueAtTime(0.0001, t + d);
    [[1, 1, 1], [2.756, 0.32, 0.45], [5.404, 0.12, 0.25], [2, 0.08, 0.7]].forEach(function (p) {
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * p[0];
      g.gain.setValueAtTime(p[1], t); g.gain.exponentialRampToValueAtTime(0.0001, t + d * p[2]);
      o.connect(g); g.connect(sortie); o.start(t); o.stop(t + d + 0.05);
    });
    if (dest) sortie.connect(dest); else envoi(sortie, 0.8);
  }

  var MOTIFS = {
    /* Signature d'accueil (≈ 2,5 s) : accord de ré majeur égrené au piano feutré, réponse cristalline. */
    signature: function (t) {
      piano('D3', t, 0.34, 3.4); piano('D4', t + 0.02, 0.4); piano('A4', t + 0.11, 0.36); piano('F#5', t + 0.22, 0.34); piano('E5', t + 0.34, 0.22);
      cristal('C#6', t + 0.62, 0.22, 2.4); cristal('A6', t + 0.96, 0.16, 2.8);
    },
    ouverture: function (t) { cristal('A6', t, 0.08, 0.9); },
    validation: function (t) { piano('E5', t, 0.22, 1.2); piano('A5', t + 0.075, 0.26, 1.5); },
    notification: function (t) { cristal('F#6', t, 0.14, 1.4); cristal('D6', t + 0.16, 0.12, 1.8); },
    finalisation: function (t) { piano('D5', t, 0.2, 1.6); piano('F#5', t + 0.06, 0.2, 1.6); piano('A5', t + 0.12, 0.22, 1.8); cristal('D7', t + 0.24, 0.07, 1.6); },
    erreur: function (t) { piano('C5', t, 0.18, 0.8); piano('B4', t + 0.12, 0.16, 1.0); }
  };

  function jouer(nom, force) {
    if (!force && (!reglages.sons || document.hidden)) return;
    if (!ctx && !force) return;               // jamais avant une première interaction explicite
    if (!preparer() || !MOTIFS[nom]) return;
    MOTIFS[nom](ctx.currentTime + 0.03);
  }

  /* Ambiance Loft Eleven : nappes lentes et notes de piano éparses, en boucle générative (jamais deux fois la même). */
  var ACCORDS = [['D3', 'A3', 'E4', 'F#4', 'C#5'], ['B2', 'F#3', 'C#4', 'D4', 'A4'], ['G2', 'D3', 'F#3', 'B3', 'E4'], ['A2', 'E3', 'B3', 'C#4', 'E4']];
  var GAMME = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'A4', 'B4'];
  function nappe(notes, t, d) {
    notes.forEach(function (n, i) {
      [-5, 5].forEach(function (det) {
        var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = i === 0 ? 'triangle' : 'sine'; o.frequency.value = hz(n); o.detune.value = det + (Math.random() - 0.5) * 3;
        f.type = 'lowpass'; f.frequency.value = 1100; f.Q.value = 0.3;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(i === 0 ? 0.05 : 0.028, t + 2.4); g.gain.setValueAtTime(i === 0 ? 0.05 : 0.028, t + d - 2.2); g.gain.linearRampToValueAtTime(0.0001, t + d + 0.6);
        o.connect(f); f.connect(g); g.connect(amb.bus); o.start(t); o.stop(t + d + 0.8);
      });
    });
  }
  function tourAmbiance() {
    if (!amb.actif) return;
    var t = ctx.currentTime + 0.1, d = 9.6, accord = ACCORDS[amb.accord++ % ACCORDS.length];
    nappe(accord, t, d);
    var x = 0.4 + Math.random() * 0.8;
    while (x < d - 1) {
      piano(GAMME[Math.floor(Math.random() * GAMME.length)], t + x, 0.12 + Math.random() * 0.1, 3.2, amb.bus);
      if (Math.random() < 0.28) cristal(GAMME[Math.floor(Math.random() * 5)].replace('5', '6'), t + x + 0.4, 0.05, 2.6, amb.bus);
      x += 1.7 + Math.random() * 2.3;
    }
    amb.minuteur = setTimeout(tourAmbiance, (d - 0.4) * 1000);
  }
  function ambiance(on) {
    reglages.ambiance = !!on;
    if (!on) {
      amb.actif = false; clearTimeout(amb.minuteur);
      if (amb.bus && ctx) { var b = amb.bus; b.gain.cancelScheduledValues(ctx.currentTime); b.gain.setValueAtTime(b.gain.value, ctx.currentTime); b.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.4); setTimeout(function () { try { b.disconnect(); } catch (e) { } }, 1800); amb.bus = null; }
      return;
    }
    if (amb.actif || !preparer()) return;
    amb.actif = true;
    amb.bus = ctx.createGain(); amb.bus.gain.setValueAtTime(0.0001, ctx.currentTime); amb.bus.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 3);
    var g = ctx.createGain(); g.gain.value = 0.5; amb.bus.connect(g); g.connect(salle); amb.bus.connect(sec);
    tourAmbiance();
  }
  function volume(v) { reglages.volume = Math.max(0, Math.min(1, +v)); if (maitre) maitre.gain.setTargetAtTime(reglages.volume, ctx.currentTime, 0.08); }
  function regler(r) { reglages.sons = !!r.sons; reglages.volume = r.volume === undefined ? reglages.volume : +r.volume; if (maitre) volume(reglages.volume); if (!!r.ambiance !== amb.actif && ctx) ambiance(!!r.ambiance); else reglages.ambiance = !!r.ambiance; }

  // Mise en sourdine quand l'application passe en arrière-plan (appel, autre application, écran verrouillé).
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (reglages.sons || reglages.ambiance) ctx.resume();
  });

  return { preparer: preparer, jouer: jouer, ambiance: ambiance, volume: volume, regler: regler, pret: function () { return !!ctx; } };
})();
