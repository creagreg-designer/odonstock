// Petits signaux sonores (scan réussi, rappel) — sans fichier audio
export function bip(frequence = 880, duree = 0.12) {
  try {
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Contexte();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequence;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duree);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duree);
    osc.onended = () => ctx.close();
  } catch {
    // Pas de son disponible : on continue sans
  }
}
