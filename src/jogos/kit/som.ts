// Efeitos sonoros sintetizados na hora com a Web Audio: nada para baixar e nenhuma requisição.
// Só tocam em resposta a uma ação da criança. Não há música de fundo, que seria autoplay.
import { lerSomLigado, salvarSomLigado } from "../../lib/local";

type Tom = { de: number; ate?: number; dura: number; onda?: OscillatorType; volume?: number; atraso?: number };
type Chiado = { dura: number; filtro?: number; filtroAte?: number; volume?: number; atraso?: number };

let contexto: AudioContext | null = null;
let saida: AudioNode;
let ruido: AudioBuffer;
let ligado = lerSomLigado();

function preparar(ctx: AudioContext) {
  // O compressor segura o volume quando vários efeitos tocam juntos.
  const compressor = ctx.createDynamicsCompressor();
  const volume = ctx.createGain();
  volume.gain.value = 0.5;
  volume.connect(compressor).connect(ctx.destination);
  saida = volume;

  ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  ruido.getChannelData(0).forEach((_, i, dados) => (dados[i] = Math.random() * 2 - 1));
}

function audio() {
  // Numa aba em segundo plano nada toca: a criança não está vendo o que fez o som.
  if (!ligado || document.hidden) return null;
  if (!contexto) {
    contexto = new AudioContext();
    preparar(contexto);
  }
  if (contexto.state !== "running") contexto.resume();
  return contexto;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) contexto?.suspend();
});

function envelope(ctx: AudioContext, inicio: number, dura: number, volume: number) {
  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(0.0001, inicio);
  ganho.gain.exponentialRampToValueAtTime(volume, inicio + Math.min(0.01, dura / 4));
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + dura);
  ganho.connect(saida);
  return ganho;
}

export function tom({ de, ate = de, dura, onda = "sine", volume = 0.3, atraso = 0 }: Tom) {
  const ctx = audio();
  if (!ctx) return;
  const inicio = ctx.currentTime + atraso;
  const oscilador = ctx.createOscillator();
  oscilador.type = onda;
  oscilador.frequency.setValueAtTime(de, inicio);
  oscilador.frequency.exponentialRampToValueAtTime(ate, inicio + dura);
  oscilador.connect(envelope(ctx, inicio, dura, volume));
  oscilador.start(inicio);
  oscilador.stop(inicio + dura);
}

// Ruído filtrado: mordidas, explosões, rajadas de vento.
export function chiado({ dura, filtro = 2000, filtroAte = filtro, volume = 0.3, atraso = 0 }: Chiado) {
  const ctx = audio();
  if (!ctx) return;
  const inicio = ctx.currentTime + atraso;
  const fonte = ctx.createBufferSource();
  fonte.buffer = ruido;
  const passaBaixa = ctx.createBiquadFilter();
  passaBaixa.frequency.setValueAtTime(filtro, inicio);
  passaBaixa.frequency.exponentialRampToValueAtTime(filtroAte, inicio + dura);
  fonte.connect(passaBaixa).connect(envelope(ctx, inicio, dura, volume));
  fonte.start(inicio, Math.random() * 0.5);
  fonte.stop(inicio + dura);
}

// Notas em sequência, para as pequenas melodias de vitória.
export function melodia(notas: number[], passo = 0.09, onda: OscillatorType = "triangle", volume = 0.3) {
  notas.forEach((nota, i) => tom({ de: nota, dura: passo * 2, onda, volume, atraso: i * passo }));
}

export const somClique = () => tom({ de: 660, ate: 880, dura: 0.07, onda: "triangle", volume: 0.2 });
export const somVitoria = () => melodia([523, 659, 784, 1047, 784, 1047, 1319], 0.1);
export const somRecorde = () => melodia([523, 659, 784, 1047, 1319, 1568, 2093, 1568, 2093], 0.09);
export const somFim = () => melodia([392, 349, 311, 262], 0.16, "triangle", 0.22);

export const somLigado = () => ligado;

export function ligarSom(valor: boolean) {
  ligado = valor;
  salvarSomLigado(valor);
  if (valor) somClique();
  else contexto?.suspend();
}
