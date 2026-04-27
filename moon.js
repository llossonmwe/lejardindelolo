// 🌙 Phases lunaires pour le jardinage
// Algorithme basé sur la nouvelle lune de référence du 6 janvier 2000 00:18 UTC
// Période synodique : 29.53059 jours
window.MOON = (() => {
  'use strict';

  const SYNODIC = 29.53059;
  const REF_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 0, 18, 0)); // 6 jan 2000 00:18 UTC

  function getPhase(date) {
    const d = date instanceof Date ? date : new Date(date);
    const diff = (d.getTime() - REF_NEW_MOON.getTime()) / 86400000;
    return ((diff % SYNODIC) + SYNODIC) % SYNODIC;
  }

  function getPhaseName(phase) {
    if (phase < 1.85)  return 'Nouvelle lune';
    if (phase < 7.38)  return 'Premier croissant';
    if (phase < 11.07) return 'Premier quartier';
    if (phase < 14.76) return 'Gibbeuse croissante';
    if (phase < 16.61) return 'Pleine lune';
    if (phase < 22.14) return 'Gibbeuse décroissante';
    if (phase < 25.83) return 'Dernier quartier';
    return 'Dernier croissant';
  }

  function getPhaseEmoji(phase) {
    if (phase < 1.85)  return '🌑';
    if (phase < 7.38)  return '🌒';
    if (phase < 11.07) return '🌓';
    if (phase < 14.76) return '🌔';
    if (phase < 16.61) return '🌕';
    if (phase < 22.14) return '🌖';
    if (phase < 25.83) return '🌗';
    return '🌘';
  }

  function isWaxing(phase) { return phase < 14.76; }
  function isWaning(phase) { return phase >= 14.76; }

  function getGardeningTip(phase) {
    if (phase < 1.85)  return 'Repos — ne pas jardiner (nouvelle lune).';
    if (phase < 7.38)  return 'Lune montante — idéal pour semer les plantes à feuilles et fruits aériens.';
    if (phase < 11.07) return 'Lune montante — bon moment pour semer, greffer, récolter fruits et légumes-feuilles.';
    if (phase < 14.76) return 'Lune montante — favorable aux semis, greffes et récoltes de fruits.';
    if (phase < 16.61) return 'Repos — ne pas jardiner (pleine lune).';
    if (phase < 22.14) return 'Lune descendante — favorable pour planter, bouturer, diviser et tailler.';
    if (phase < 25.83) return 'Lune descendante — bon moment pour planter, repiquer et travailler le sol.';
    return 'Lune descendante — idéal pour enrichir le sol, pailler et préparer les plantations.';
  }

  function getMonthPhases(year, month) {
    const phases = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const p = getPhase(d);
      phases.push({
        date: d,
        day,
        phase: p,
        name: getPhaseName(p),
        emoji: getPhaseEmoji(p),
        tip: getGardeningTip(p),
        waxing: isWaxing(p),
        waning: isWaning(p)
      });
    }
    return phases;
  }

  // Trouve les jours clés du mois (nouvelle lune, pleine lune, quartiers)
  function getKeyDates(year, month) {
    const phases = getMonthPhases(year, month);
    const keys = [];
    for (let i = 1; i < phases.length; i++) {
      const prev = phases[i - 1];
      const curr = phases[i];
      // Nouvelle lune : phase passe sous 1.85 ou wrap autour de 29.53
      if (curr.phase < prev.phase) keys.push({ ...curr, event: 'Nouvelle lune' });
      else if (prev.phase < 14.76 && curr.phase >= 14.76) keys.push({ ...curr, event: 'Pleine lune' });
      else if (prev.phase < 7.38 && curr.phase >= 7.38) keys.push({ ...curr, event: 'Premier quartier' });
      else if (prev.phase < 22.14 && curr.phase >= 22.14) keys.push({ ...curr, event: 'Dernier quartier' });
    }
    return keys;
  }

  return { getPhase, getPhaseName, getPhaseEmoji, isWaxing, isWaning, getGardeningTip, getMonthPhases, getKeyDates };
})();
