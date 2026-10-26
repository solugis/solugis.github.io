/* Sons de MonDjè, fabriqués sur le téléphone (Web Audio, aucun fichier).
   Un seul fichier pour l'application (inséré par app/build.py) et la page d'accueil (sons.js publié à côté de index.html).
   Trois ambiances : « halo » (par défaut), « tirelire », « doux » ; « aucun » coupe tout.
   SONS_MDJ.jouer(ac, nom, ambiance, i) — nom : ouverture, onglet (i = numéro de l'onglet), enregistre, reponse. */
var SONS_MDJ = (function () {
  var AMBIANCES = ['halo', 'tirelire', 'doux'];
  function sortie(ac, g, vers) { var n = ac.createGain(); n.gain.value = g; n.connect(vers || ac.destination); return n; }
  // Écho léger : donne de l'espace au halo
  function echo(ac, g) {
    var entree = ac.createGain(), d = ac.createDelay(1), fb = ac.createGain(), mouille = ac.createGain(), f = ac.createBiquadFilter();
    d.delayTime.value = 0.19; fb.gain.value = 0.32; mouille.gain.value = g; f.type = 'lowpass'; f.frequency.value = 2200;
    entree.connect(ac.destination); entree.connect(d); d.connect(f); f.connect(fb); fb.connect(d); f.connect(mouille); mouille.connect(ac.destination);
    return entree;
  }
  // Note à partiels : parts = [[multiple, volume, durée], …]
  function note(ac, t, f, parts, g, vers, forme) {
    var out = sortie(ac, g, vers);
    parts.forEach(function (p) {
      var o = ac.createOscillator(), e = ac.createGain(); o.type = forme || 'sine'; o.frequency.value = f * p[0];
      e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(p[1], t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + p[2]);
      o.connect(e); e.connect(out); o.start(t); o.stop(t + p[2] + 0.05);
    });
  }
  function bruit(ac, t, duree, g, f0, f1, q, vers) {   // souffle filtré (balayage de f0 à f1)
    var n = Math.floor(ac.sampleRate * duree), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = b;
    f.type = 'bandpass'; f.Q.value = q || 1.2; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + duree);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + duree * 0.45); e.gain.linearRampToValueAtTime(0, t + duree);
    s.connect(f); f.connect(e); e.connect(vers || ac.destination); s.start(t); s.stop(t + duree + 0.02);
  }
  // Nappe montante : oscillateurs légèrement désaccordés, filtre qui s'ouvre
  function nappe(ac, t, freqs, duree, g, vers, f0, f1, f2) {
    var f = ac.createBiquadFilter(), e = ac.createGain(); f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(f0 || 260, t); f.frequency.exponentialRampToValueAtTime(f1 || 2600, t + duree * 0.55); f.frequency.exponentialRampToValueAtTime(f2 || 900, t + duree);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + duree * 0.4); e.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    f.connect(e); e.connect(vers || ac.destination);
    freqs.forEach(function (fr) { [-6, 0, 7].forEach(function (cents) {
      var o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = cents;
      var m = ac.createGain(); m.gain.value = 1 / (freqs.length * 3); o.connect(m); m.connect(f); o.start(t); o.stop(t + duree + 0.05);
    }); });
  }
  function halo(ac, t, f, duree, g, vers) {   // note tenue qui apparaît en douceur, légèrement vibrée
    var o = ac.createOscillator(), e = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain(); o.frequency.value = f; v.frequency.value = 5.5; vg.gain.value = f * 0.004;
    v.connect(vg); vg.connect(o.frequency); e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + duree * 0.35); e.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    o.connect(e); e.connect(vers || ac.destination); o.start(t); v.start(t); o.stop(t + duree + 0.05); v.stop(t + duree + 0.05);
  }
  function tok(ac, t, g, haut, bas) {   // coup sourd (pot en terre cuite, tiroir)
    var o = ac.createOscillator(), e = ac.createGain(); o.frequency.setValueAtTime(haut || 220, t); o.frequency.exponentialRampToValueAtTime(bas || 120, t + 0.1);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(e); e.connect(ac.destination); o.start(t); o.stop(t + 0.22);
  }
  var GAMME = [262, 294, 330, 392, 440];   // do, ré, mi, sol, la (une note par onglet, registre médium)
  var PIECE = [[1, 1, 0.45], [2.76, 0.4, 0.25], [5.4, 0.2, 0.14]];
  var BOIS = [[1, 1, 0.22], [3.9, 0.25, 0.05]];
  var CLOCHE = [[1, 1, 0.9], [2.4, 0.35, 0.5], [3.9, 0.15, 0.25]];
  var SONS = {
    halo: {
      ouverture: function (ac, t) {   // halo futuriste : nappe qui s'ouvre, souffle, scintillement, écho (registre médium, audible sur un haut-parleur de téléphone)
        var ec = echo(ac, 0.32);
        nappe(ac, t, [262, 392, 523, 784], 2.2, 0.42, ec, 600, 5200, 1800);
        bruit(ac, t, 1.1, 0.14, 800, 5000, 0.9, ec);
        halo(ac, t + 0.25, 1568, 1.8, 0.07, ec); halo(ac, t + 0.4, 2093, 1.6, 0.05, ec);
        note(ac, t + 0.95, 1047, [[1, 1, 1.2], [2.4, 0.3, 0.5]], 0.09, ec);
      },
      onglet: function (ac, t, i) {   // bulle feutrée qui monte légèrement
        var f = GAMME[i || 0], o = ac.createOscillator(), e = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        o.frequency.setValueAtTime(f * 0.85, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.07, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(lp); lp.connect(e); e.connect(ac.destination); o.start(t); o.stop(t + 0.25);
      },
      enregistre: function (ac, t) {   // « bip » du lecteur de caisse
        var o = ac.createOscillator(), e = ac.createGain(), lp = ac.createBiquadFilter(); o.type = 'square'; o.frequency.value = 1245; lp.type = 'lowpass'; lp.frequency.value = 2600;
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(0.09, t + 0.005); e.gain.setValueAtTime(0.09, t + 0.11); e.gain.linearRampToValueAtTime(0, t + 0.13);
        o.connect(lp); lp.connect(e); e.connect(ac.destination); o.start(t); o.stop(t + 0.15);
      },
      reponse: function (ac, t) { var ec = echo(ac, 0.25); note(ac, t, 523, [[1, 1, 0.6]], 0.06, ec); note(ac, t + 0.12, 659, [[1, 1, 0.7]], 0.06, ec); }
    },
    tirelire: {
      ouverture: function (ac, t) {   // trois pièces dans le pot, puis un accord de kalimba (une octave plus bas qu'avant)
        note(ac, t, 1319, PIECE, 0.18); note(ac, t + 0.16, 1175, PIECE, 0.16); note(ac, t + 0.3, 1568, PIECE, 0.14); tok(ac, t + 0.42, 0.24);
        [262, 330, 392].forEach(function (f, k) { note(ac, t + 0.5 + k * 0.08, f, [[1, 1, 1.4], [5.95, 0.2, 0.1]], 0.13); });
      },
      onglet: function (ac, t, i) { note(ac, t, GAMME[i || 0], BOIS, 0.08); },   // marimba
      enregistre: function (ac, t) {   // « ka-ching » : le tiroir-caisse, puis la sonnette
        bruit(ac, t, 0.06, 0.12, 1800, 900, 2); tok(ac, t + 0.02, 0.15, 180, 110);
        note(ac, t + 0.09, 1568, CLOCHE, 0.09); note(ac, t + 0.09, 2093, CLOCHE, 0.05);
      },
      reponse: function (ac, t) { note(ac, t, 392, [[1, 1, 1], [5.95, 0.2, 0.1]], 0.08); note(ac, t + 0.12, 523, [[1, 1, 1], [5.95, 0.2, 0.1]], 0.08); }
    },
    doux: {
      ouverture: function (ac, t) { note(ac, t, 392, CLOCHE, 0.08); note(ac, t + 0.22, 523, CLOCHE, 0.08); },
      onglet: function (ac, t) { tok(ac, t, 0.05, 200, 150); },
      enregistre: function (ac, t) { note(ac, t, 660, [[1, 1, 0.12]], 0.05); note(ac, t + 0.12, 880, [[1, 1, 0.14]], 0.05); },
      reponse: function (ac, t) { note(ac, t, 523, [[1, 1, 0.5]], 0.05); }
    }
  };
  return {
    AMBIANCES: AMBIANCES,
    jouer: function (ac, nom, ambiance, i) {
      var a = SONS[ambiance] || SONS.halo, f = a[nom]; if (!f) return;
      try { f(ac, ac.currentTime + 0.02, i); } catch (e) {}
    }
  };
})();
