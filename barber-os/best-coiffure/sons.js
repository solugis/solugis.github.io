/* BARBER OS — sons discrets fabriqués en Web Audio (rien à télécharger), coupables dans le profil.
   Sur iPhone, un son ne joue qu'après un premier toucher. */
window.Sons = (function () {
  'use strict';
  var ctx = null, actif = true;
  function ac() { if (!ctx) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  function note(f, t0, duree, vol, type) {
    var c = ac(); if (!c) return;
    var t = c.currentTime + (t0 || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.1, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + (duree || 0.4));
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + (duree || 0.4) + 0.05);
  }
  var S = {
    ouverture: function () { note(392, 0, 0.45, 0.08); note(587.33, 0.1, 0.6, 0.07); },
    onglet: function () { note(880, 0, 0.12, 0.035); },
    ajout: function () { note(1174.66, 0, 0.1, 0.05, 'triangle'); },
    vente: function () { note(783.99, 0, 0.25, 0.08, 'triangle'); note(1174.66, 0.08, 0.3, 0.07, 'triangle'); note(1567.98, 0.16, 0.5, 0.06, 'triangle'); },
    depense: function () { note(659.25, 0, 0.2, 0.06); note(493.88, 0.09, 0.3, 0.06); },
    annule: function () { note(440, 0, 0.2, 0.06); note(329.63, 0.1, 0.35, 0.06); }
  };
  function jouer(n) { if (!actif) return; try { S[n] && S[n](); } catch (e) { } }
  function regler(v) { actif = !!v; }
  function debloquer() { try { var c = ac(); if (c && !debloquer.fait) { var b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); debloquer.fait = true; } } catch (e) { } }
  return { jouer: jouer, regler: regler, debloquer: debloquer };
})();
