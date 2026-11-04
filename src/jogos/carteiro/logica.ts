// Regras e física do jogo, sem DOM, para serem testadas com Vitest. A simulação tem passo fixo,
// então o mesmo lançamento sempre faz o mesmo caminho, e o jogo.ts só anima os pontos.
import { embaralhar, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui os pacotes não acabam.
export const ULTIMA_FASE_MANSA = 2;

// O espaço tem 1 de largura e ALTURA de altura, com y crescendo para baixo, como na tela.
export const ALTURA = 1.3;
export const PASSO = 1 / 120;
const DURACAO_MAXIMA = 7;
// Gravidade do jogo, ajustada para as curvas aparecerem sem virarem um redemoinho.
const G = 0.0045;
const SUAVE = 0.0006;
export const VELOCIDADE_MAXIMA = 0.95;
export const FORCA_MINIMA = 0.3;
export const RAIO_DO_PACOTE = 0.014;
// Longe assim da borda, o pacote se perdeu no espaço.
const MARGEM = 0.3;
// Um ponto do caminho a cada tantos passos basta para desenhar o rastro.
const PONTOS_A_CADA = 2;

export type Planeta = "mercurio" | "venus" | "terra" | "marte" | "jupiter" | "saturno" | "urano" | "netuno" | "lua" | "sol";

// Raio e massa no jogo. Não estão em escala, mas a ordem é a de verdade: quem tem mais massa puxa mais.
export const PLANETAS: Record<Planeta, { nome: string; raio: number; massa: number }> = {
  mercurio: { nome: "Mercúrio", raio: 0.036, massa: 0.4 },
  marte: { nome: "Marte", raio: 0.042, massa: 0.6 },
  venus: { nome: "Vênus", raio: 0.05, massa: 1 },
  terra: { nome: "Terra", raio: 0.052, massa: 1.1 },
  urano: { nome: "Urano", raio: 0.066, massa: 2.6 },
  netuno: { nome: "Netuno", raio: 0.064, massa: 3 },
  saturno: { nome: "Saturno", raio: 0.082, massa: 4.6 },
  jupiter: { nome: "Júpiter", raio: 0.098, massa: 6.2 },
  lua: { nome: "Lua", raio: 0.03, massa: 0.3 },
  sol: { nome: "Sol", raio: 0.1, massa: 7.5 },
};

export type Ponto = { x: number; y: number };
export type Corpo = Ponto & { planeta: Planeta; raio: number; massa: number; alvo: boolean };
// Asteroide não puxa: só atrapalha.
export type Pedra = Ponto & { raio: number };
export type Mapa = { lancador: Ponto; corpos: Corpo[]; pedras: Pedra[] };
export type Fim =
  | { tipo: "entregou"; corpo: number }
  | { tipo: "bateu"; corpo: number }
  | { tipo: "pedra"; pedra: number }
  | { tipo: "perdeu" };
export type Voo = { pontos: Ponto[]; fim: Fim };

export type Estado = {
  fase: number;
  // Todos os alvos receberam o pacote. A fase seguinte só é sorteada em passarDeFase, depois da
  // festa, porque o verificador leva um tempinho.
  concluida: boolean;
  vidas: number;
  pontos: number;
  mapa: Mapa;
  // Um por corpo: true quando o pacote já chegou ali.
  entregues: boolean[];
  // null é sem limite, nas fases mansas.
  pacotes: number | null;
  // Sem nenhum pacote perdido, vale o bônus.
  limpa: boolean;
};
export type Resultado = "entregou" | "errou" | "fase" | "acabou" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado; voo: Voo };

type Config = {
  alvos: number;
  // Planetas no caminho, sem contar os alvos.
  outros: number;
  sol: boolean;
  pedras: number;
  // Pacotes além do necessário. null é sem limite.
  folga: number | null;
  // Fração dos lançamentos possíveis que acerta cada alvo: nem impossível, nem de qualquer jeito.
  acerto: [number, number];
  // Mirar reto no alvo não pode funcionar: é preciso usar a curva.
  curva: boolean;
};

const FASES: Config[] = [
  { alvos: 1, outros: 0, sol: false, pedras: 0, folga: null, acerto: [0.02, 0.25], curva: false },
  { alvos: 1, outros: 1, sol: false, pedras: 0, folga: null, acerto: [0.015, 0.12], curva: false },
  { alvos: 1, outros: 1, sol: false, pedras: 0, folga: 2, acerto: [0.008, 0.04], curva: true },
  { alvos: 2, outros: 1, sol: false, pedras: 0, folga: 2, acerto: [0.008, 0.04], curva: false },
  { alvos: 1, outros: 0, sol: true, pedras: 0, folga: 2, acerto: [0.006, 0.035], curva: true },
  { alvos: 2, outros: 1, sol: false, pedras: 2, folga: 2, acerto: [0.006, 0.035], curva: false },
  { alvos: 2, outros: 2, sol: false, pedras: 0, folga: 2, acerto: [0.005, 0.03], curva: true },
  { alvos: 2, outros: 1, sol: true, pedras: 2, folga: 2, acerto: [0.005, 0.03], curva: true },
  { alvos: 3, outros: 2, sol: false, pedras: 2, folga: 2, acerto: [0.004, 0.03], curva: true },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

// Planetas que cada fase pode usar como alvo ou como obstáculo, para a criança ir conhecendo todos.
const ESTREIAS: Planeta[][] = [
  ["terra", "marte"],
  ["jupiter", "venus", "lua"],
  ["saturno", "mercurio"],
  ["urano", "netuno"],
];

export const planetasDaFase = (fase: number) => ESTREIAS.slice(0, Math.min(fase, ESTREIAS.length)).flat();

// Física ------------------------------------------------------------------------------------------

const longe = ({ x, y }: Ponto) => x < -MARGEM || x > 1 + MARGEM || y < -MARGEM || y > ALTURA + MARGEM;

export function velocidade(angulo: number, forca: number) {
  const v = VELOCIDADE_MAXIMA * Math.max(FORCA_MINIMA, Math.min(1, forca));
  return { vx: Math.cos(angulo) * v, vy: Math.sin(angulo) * v };
}

// Voa até entregar, bater ou se perder. Corpos já entregues viram obstáculo como os outros.
export function voar(mapa: Mapa, angulo: number, forca: number, entregues: boolean[] = mapa.corpos.map(() => false)): Voo {
  let { x, y } = mapa.lancador;
  let { vx, vy } = velocidade(angulo, forca);
  const pontos: Ponto[] = [{ x, y }];
  const passos = Math.round(DURACAO_MAXIMA / PASSO);
  for (let passo = 1; passo <= passos; passo++) {
    for (const corpo of mapa.corpos) {
      const dx = corpo.x - x;
      const dy = corpo.y - y;
      const d2 = dx * dx + dy * dy;
      const forcaDaGravidade = (G * corpo.massa) / (d2 + SUAVE);
      const d = Math.sqrt(d2);
      vx += (forcaDaGravidade * dx * PASSO) / d;
      vy += (forcaDaGravidade * dy * PASSO) / d;
    }
    x += vx * PASSO;
    y += vy * PASSO;
    if (passo % PONTOS_A_CADA === 0) pontos.push({ x, y });

    const tocou = mapa.corpos.findIndex((c) => Math.hypot(c.x - x, c.y - y) < c.raio + RAIO_DO_PACOTE);
    if (tocou >= 0) {
      pontos.push({ x, y });
      const corpo = mapa.corpos[tocou];
      return { pontos, fim: { tipo: corpo.alvo && !entregues[tocou] ? "entregou" : "bateu", corpo: tocou } };
    }
    const pedra = mapa.pedras.findIndex((p) => Math.hypot(p.x - x, p.y - y) < p.raio + RAIO_DO_PACOTE);
    if (pedra >= 0) {
      pontos.push({ x, y });
      return { pontos, fim: { tipo: "pedra", pedra } };
    }
    if (longe({ x, y })) return { pontos, fim: { tipo: "perdeu" } };
  }
  return { pontos, fim: { tipo: "perdeu" } };
}

// Geração -----------------------------------------------------------------------------------------

// A grade de lançamentos que o verificador experimenta.
const ANGULOS = 96;
const FORCAS = [0.3, 0.42, 0.54, 0.66, 0.78, 0.9, 1];

// Para de contar quando algum alvo passa de teto: o mapa já está fácil demais.
export function acertosPorAlvo(mapa: Mapa, entregues = mapa.corpos.map(() => false), teto = 1) {
  const total = ANGULOS * FORCAS.length;
  const acertos = mapa.corpos.map(() => 0);
  for (let a = 0; a < ANGULOS; a++) {
    const angulo = (a / ANGULOS) * Math.PI * 2;
    for (const forca of FORCAS) {
      const { fim } = voar(mapa, angulo, forca, entregues);
      if (fim.tipo !== "entregou") continue;
      if (++acertos[fim.corpo] > teto * total) return acertos.map((n) => n / total);
    }
  }
  return acertos.map((n) => n / total);
}

// Mirar direto no centro do alvo, com qualquer força, acerta?
export function acertaReto(mapa: Mapa, alvo: number) {
  const { x, y } = mapa.corpos[alvo];
  const angulo = Math.atan2(y - mapa.lancador.y, x - mapa.lancador.x);
  return FORCAS.some((forca) => voar(mapa, angulo, forca).fim.tipo === "entregou");
}

const entre = (min: number, max: number, rng: Rng) => min + rng() * (max - min);

function cabe(ponto: Ponto, raio: number, ocupados: { x: number; y: number; raio: number }[], folga: number) {
  if (ponto.x - raio < 0.04 || ponto.x + raio > 0.96 || ponto.y - raio < 0.04 || ponto.y + raio > ALTURA - 0.04) return false;
  return ocupados.every((o) => Math.hypot(o.x - ponto.x, o.y - ponto.y) > o.raio + raio + folga);
}

function sortearLugar(raio: number, ocupados: { x: number; y: number; raio: number }[], zona: [number, number], folga: number, rng: Rng) {
  for (let tentativa = 0; tentativa < 80; tentativa++) {
    const ponto = { x: entre(0.08, 0.92, rng), y: entre(zona[0], zona[1], rng) };
    if (cabe(ponto, raio, ocupados, folga)) return ponto;
  }
  return null;
}

export function montarMapa(fase: number, rng: Rng): Mapa | null {
  const config = configDaFase(fase);
  const lancador = { x: entre(0.15, 0.85, rng), y: ALTURA - 0.12 };
  const ocupados: { x: number; y: number; raio: number }[] = [{ ...lancador, raio: 0.12 }];
  const corpos: Corpo[] = [];
  const escolhidos = embaralhar(planetasDaFase(fase), rng);
  const pegar = () => escolhidos.pop() ?? "lua";

  if (config.sol) {
    const lugar = sortearLugar(PLANETAS.sol.raio, ocupados, [0.45, 0.85], 0.12, rng);
    if (!lugar) return null;
    ocupados.push({ ...lugar, raio: PLANETAS.sol.raio });
    corpos.push({ ...lugar, planeta: "sol", ...PLANETAS.sol, alvo: false });
  }
  for (let i = 0; i < config.alvos + config.outros; i++) {
    const planeta = pegar();
    const { raio, massa } = PLANETAS[planeta];
    const alvo = i < config.alvos;
    // Os alvos ficam lá em cima, e os outros planetas no meio do caminho.
    const lugar = sortearLugar(raio, ocupados, alvo ? [0.08, 0.55] : [0.4, 0.9], 0.1, rng);
    if (!lugar) return null;
    ocupados.push({ ...lugar, raio });
    corpos.push({ ...lugar, planeta, raio, massa, alvo });
  }
  const pedras: Pedra[] = [];
  for (let i = 0; i < config.pedras; i++) {
    const raio = entre(0.022, 0.03, rng);
    const lugar = sortearLugar(raio, ocupados, [0.25, 0.95], 0.06, rng);
    if (!lugar) return null;
    ocupados.push({ ...lugar, raio });
    pedras.push({ ...lugar, raio });
  }
  return { lancador, corpos, pedras };
}

export function gerarFase(fase: number, rng: Rng = Math.random): Mapa {
  const config = configDaFase(fase);
  for (let tentativa = 0; tentativa < 400; tentativa++) {
    const mapa = montarMapa(fase, rng);
    if (!mapa) continue;
    const alvos = mapa.corpos.flatMap((c, i) => (c.alvo ? [i] : []));
    // A conferência barata vem antes da varredura.
    if (config.curva && alvos.some((i) => acertaReto(mapa, i))) continue;
    const acertos = acertosPorAlvo(mapa, undefined, config.acerto[1]);
    if (!alvos.every((i) => acertos[i] >= config.acerto[0] && acertos[i] <= config.acerto[1])) continue;
    return mapa;
  }
  throw new Error(`Nenhum mapa para a fase ${fase}`);
}

// Partida -----------------------------------------------------------------------------------------

const alvosDe = (mapa: Mapa) => mapa.corpos.filter((c) => c.alvo).length;

function pacotesDaFase(fase: number, mapa: Mapa) {
  const { folga } = configDaFase(fase);
  return folga === null ? null : alvosDe(mapa) + folga;
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const mapa = gerarFase(fase, rng);
  return { fase, vidas, pontos, mapa, concluida: false, entregues: mapa.corpos.map(() => false), pacotes: pacotesDaFase(fase, mapa), limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const faltam = ({ mapa, entregues }: Pick<Estado, "mapa" | "entregues">) =>
  mapa.corpos.filter((c, i) => c.alvo && !entregues[i]).length;

export const bonusDaFase = (fase: number, limpa: boolean) => fase * (limpa ? 15 : 10);

export function passarDeFase({ fase, vidas, pontos, limpa }: Estado, rng: Rng = Math.random) {
  return novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + bonusDaFase(fase, limpa), rng);
}

export function lancar(estado: Estado, angulo: number, forca: number): Jogada {
  if (estado.concluida) throw new Error("Fase já concluída: chame passarDeFase");
  const voo = voar(estado.mapa, angulo, forca, estado.entregues);
  const pacotes = estado.pacotes === null ? null : estado.pacotes - 1;
  if (voo.fim.tipo === "entregou") {
    const corpo = voo.fim.corpo;
    const entregues = estado.entregues.map((e, i) => e || i === corpo);
    const depois = { ...estado, entregues, pacotes };
    if (faltam(depois) > 0) return { estado: depois, resultado: "entregou", voo };
    return { estado: { ...depois, concluida: true }, resultado: "fase", voo };
  }

  const errado = { ...estado, pacotes, limpa: false };
  if (pacotes === null || pacotes >= faltam(errado)) return { estado: errado, resultado: "errou", voo };
  // Não sobram pacotes para todos os alvos: perde um coração e o mesmo céu volta do começo.
  const vidas = estado.vidas - 1;
  if (vidas <= 0) return { estado: { ...errado, vidas }, resultado: "fim", voo };
  const recomeco = { ...errado, vidas, entregues: estado.mapa.corpos.map(() => false), pacotes: pacotesDaFase(estado.fase, estado.mapa) };
  return { estado: recomeco, resultado: "acabou", voo };
}
