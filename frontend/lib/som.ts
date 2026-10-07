/** Sons do painel de chamada (Web Audio + voz do navegador). */
export type Aviso = "campainha" | "gongo" | "nenhum";

export function tocarAviso(tipo: Aviso = "campainha", volume = 0.7) {
  if (tipo === "nenhum") return;
  try {
    const ctx = new AudioContext();
    const notas = tipo === "gongo" ? [[0, 196, 1.6]] : [[0, 880, 0.5], [0.28, 660, 0.5]];
    for (const [t, freq, dur] of notas) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.3 * volume), ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + dur);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + dur + 0.05);
    }
  } catch {
    /* navegador sem áudio liberado */
  }
}

/** Lê a senha em voz alta: "Senha A 12, guichê 1". */
export function falarSenha(codigo: string, destino: string, volume = 0.7) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const texto = `Senha ${codigo.replace(/(\D+)(\d+)/, "$1 $2").split("").join(" ").replace(/ (\d) (\d)/, " $1$2")}, ${destino}`;
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = "pt-BR";
  fala.volume = volume;
  window.speechSynthesis.speak(fala);
}
