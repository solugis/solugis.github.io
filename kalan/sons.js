/* KALAN — sons fabriqués en Web Audio (rien à télécharger). Réglables dans Réglages › Apparence.
   Sur iPhone, un son ne peut jouer qu'après un premier toucher. */
window.Sons = (function () {
  'use strict';
  var ctx = null, actif = true;
  function ac() {
    if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  /* Note douce façon balafon : sinus + harmonique, attaque courte, extinction rapide. */
  function note(f, t0, duree, vol, type) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (t0 || 0), o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), g2 = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 3.98;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.16, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + (duree || 0.5));
    g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime((vol || 0.16) * 0.18, t + 0.004); g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    o.connect(g); o2.connect(g2); g.connect(c.destination); g2.connect(c.destination);
    o.start(t); o2.start(t); o.stop(t + (duree || 0.5) + 0.05); o2.stop(t + 0.2);
  }
  var GAMME = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];   // do ré mi sol la do (pentatonique)
  var S = {
    ouverture: function () { note(392, 0, 0.5, 0.12); note(523.25, 0.11, 0.5, 0.12); note(659.25, 0.22, 0.6, 0.12); note(783.99, 0.34, 0.9, 0.1); },
    onglet: function (i) { note(GAMME[(i || 0) % GAMME.length], 0, 0.28, 0.07); },
    enregistre: function () { note(783.99, 0, 0.3, 0.1); note(1046.5, 0.09, 0.5, 0.1); },
    juste: function () { note(880, 0, 0.25, 0.09); note(1318.5, 0.08, 0.4, 0.08); },
    revoir: function () { note(329.63, 0, 0.35, 0.09, 'triangle'); },
    koro: function () { note(659.25, 0, 0.25, 0.07); note(523.25, 0.1, 0.35, 0.07); },
    bravo: function () { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach(function (f, i) { note(f, i * 0.09, 0.6, 0.09); }); },
    coche: function () { note(1046.5, 0, 0.18, 0.07); }
  };
  function jouer(nom, arg) { if (!actif) return; try { S[nom] && S[nom](arg); } catch (e) { /* audio indisponible */ } }
  function regler(v) { actif = !!v; }
  function debloquer() { try { var c = ac(); if (c) { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } } catch (e) { } }
  return { jouer: jouer, regler: regler, debloquer: debloquer };
})();
