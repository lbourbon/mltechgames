// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
export const LADO = 7;

// Repete até achar tudo, bater ou voltar a um ponto onde já esteve.
export const SEMPRE = Infinity;
const VEZES = [2, 3, 4, 5, 6];

export type Carta = "frente" | "esquerda" | "direita" | "laco" | "truque" | "seDireita" | "seEsquerda";
export type Trilho = "principal" | "laco" | "truque";
export type Ponto = { x: number; y: number };
export type Mapa = { lado: number; inicio: Ponto; direcao: number; tesouros: Ponto[]; pedras: Ponto[] };
export type Rota = Record<Trilho, Carta[]> & { vezes: number };
export type Pronto = { rota: Rota; trilho: Trilho };
export type Desafio = {
  etapa: number;
  mapa: Mapa;
  solucao: Rota;
  vagas: Record<Trilho, number>;
  cartas: Carta[];
  vezes: number[];
  pronto: Pronto;
};
export type Estado = Desafio & { fase: number; vidas: number; pontos: number; dicas: number };
export type Lugar = { trilho: Trilho; indice: number };
export type Passo = Ponto & Lugar & {
  carta: Carta;
  direcao: number;
  // Índice do tesouro pego neste passo.
  pegou: number | null;
  // O sensor viu pedra ou parede e virou.
  disparou: boolean;
  // As cartas 🔁 e ⭐ que levaram até este passo, de fora para dentro.
  chamadas: Lugar[];
  // Em qual repetição está, contando de 1. Zero fora do 🔁.
  volta: number;
};
export type Resultado = "venceu" | "bateu" | "faltou" | "circulos";
export type Execucao = { passos: Passo[]; resultado: Resultado };

export const TRILHOS: Trilho[] = ["principal", "laco", "truque"];

// Norte, leste, sul e oeste: virar à direita soma 1.
const RUMOS: Ponto[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

const MOVIMENTOS: Carta[] = ["frente", "esquerda", "direita"];
const SENSORES: Carta[] = ["seDireita", "seEsquerda"];

const chave = ({ x, y }: Ponto) => `${x},${y}`;
const rotaVazia = (vezes = VEZES[0]): Rota => ({ principal: [], laco: [], truque: [], vezes });

// Nenhuma fileira chama a si mesma: é o que garante que toda rota termina. O 🔁 é um
// só, porque o bloco dele fica desenhado no lugar da carta, no meio da rota.
export function cabeNaRota(rota: Rota, trilho: Trilho, carta: Carta) {
  if (carta === "laco") return trilho === "principal" && !rota.principal.includes("laco");
  if (carta === "truque") return trilho !== "truque";
  return true;
}

export function rodar(mapa: Mapa, rota: Rota): Execucao {
  const { lado, inicio, tesouros } = mapa;
  const pedras = new Set(mapa.pedras.map(chave));
  const faltam = new Map(tesouros.map((tesouro, i) => [chave(tesouro), i]));
  const passos: Passo[] = [];
  let { x, y } = inicio;
  let direcao = mapa.direcao;
  let fim: Resultado | null = null;
  let volta = 0;

  const adiante = () => ({ x: x + RUMOS[direcao].x, y: y + RUMOS[direcao].y });
  const livre = (ponto: Ponto) =>
    ponto.x >= 0 && ponto.y >= 0 && ponto.x < lado && ponto.y < lado && !pedras.has(chave(ponto));

  function avancar() {
    const proximo = adiante();
    if (!livre(proximo)) {
      fim = "bateu";
      return null;
    }
    ({ x, y } = proximo);
    const pegou = faltam.get(chave(proximo)) ?? null;
    faltam.delete(chave(proximo));
    if (faltam.size === 0) fim = "venceu";
    return pegou;
  }

  function tocar(trilho: Trilho, cartas: Carta[], chamadas: Lugar[]) {
    for (const [indice, carta] of cartas.entries()) {
      if (fim) return;
      const caminho = [...chamadas, { trilho, indice }];
      if (carta === "laco") repetir(caminho);
      else if (carta === "truque") tocar("truque", rota.truque, caminho);
      else {
        let pegou: number | null = null;
        let disparou = false;
        if (carta === "frente") pegou = avancar();
        if (carta === "esquerda") direcao = (direcao + 3) % 4;
        if (carta === "direita") direcao = (direcao + 1) % 4;
        if ((carta === "seDireita" || carta === "seEsquerda") && !livre(adiante())) {
          disparou = true;
          direcao = (direcao + (carta === "seDireita" ? 1 : 3)) % 4;
        }
        passos.push({ trilho, indice, carta, x, y, direcao, pegou, disparou, chamadas, volta });
      }
    }
  }

  function repetir(chamadas: Lugar[]) {
    const vistos = new Set<string>();
    for (let vez = 0; vez < rota.vezes && !fim; vez++) {
      const agora = `${x},${y},${direcao},${faltam.size}`;
      if (rota.vezes === SEMPRE && vistos.has(agora)) {
        fim = "circulos";
        return;
      }
      vistos.add(agora);
      volta = vez + 1;
      tocar("laco", rota.laco, chamadas);
    }
    volta = 0;
  }

  tocar("principal", rota.principal, []);
  return { passos, resultado: fim ?? "faltou" };
}

// O menor número de cartas de movimento que pega tudo. Serve para a fase recusar mapas
// em que a rota comprida ainda caberia inteira nas vagas, sem usar a carta nova.
export function menorCaminho({ lado, inicio, direcao, tesouros, pedras }: Mapa) {
  const bloqueadas = new Set(pedras.map(chave));
  const indices = new Map(tesouros.map((tesouro, i) => [chave(tesouro), i]));
  const tudo = (1 << tesouros.length) - 1;
  const vistos = new Set<number>();
  let fila = [{ ...inicio, direcao, pegos: 0 }];

  for (let cartas = 0; fila.length > 0; cartas++) {
    const proxima: typeof fila = [];
    for (const atual of fila) {
      if (atual.pegos === tudo) return cartas;
      const codigo = atual.x + lado * (atual.y + lado * (atual.direcao + 4 * atual.pegos));
      if (vistos.has(codigo)) continue;
      vistos.add(codigo);
      proxima.push({ ...atual, direcao: (atual.direcao + 1) % 4 }, { ...atual, direcao: (atual.direcao + 3) % 4 });
      const x = atual.x + RUMOS[atual.direcao].x;
      const y = atual.y + RUMOS[atual.direcao].y;
      if (x < 0 || y < 0 || x >= lado || y >= lado || bloqueadas.has(chave({ x, y }))) continue;
      const tesouro = indices.get(chave({ x, y }));
      proxima.push({ ...atual, x, y, pegos: tesouro === undefined ? atual.pegos : atual.pegos | (1 << tesouro) });
    }
    fila = proxima;
  }
  return Infinity;
}

// Cada etapa traz uma carta nova. Depois da última, as fases sorteiam entre elas.
export function etapaDaFase(fase: number, rng: Rng = Math.random) {
  if (fase <= 3) return 1;
  if (fase <= 6) return 2;
  if (fase <= 9) return 3;
  if (fase <= 12) return 4;
  return sortear(2, 4, rng);
}

const sortearVolta = (rng: Rng): Carta => (rng() < 0.5 ? "esquerda" : "direita");
const sortearCarta = (rng: Rng): Carta => MOVIMENTOS[sortear(0, 2, rng)];

// Um trecho que vale a pena repetir: anda, vira, e não gira sem sair do lugar.
function sortearCorpo(tamanho: number, rng: Rng) {
  for (;;) {
    const corpo = Array.from({ length: tamanho }, () => (rng() < 0.6 ? "frente" : sortearVolta(rng)));
    const voltas = corpo.filter((carta) => carta !== "frente").length;
    const colados = corpo.some((carta, i) => carta !== "frente" && corpo[(i + 1) % tamanho] !== "frente");
    if (voltas > 0 && voltas < tamanho && !colados) return corpo;
  }
}

function rotaReta(fase: number, rng: Rng) {
  const principal: Carta[] = [];
  for (let trecho = 0; trecho < fase; trecho++) {
    if (trecho > 0) principal.push(sortearVolta(rng));
    principal.push(...Array<Carta>(fase === 1 ? sortear(3, 5, rng) : sortear(2, 3, rng)).fill("frente"));
  }
  return { ...rotaVazia(), principal };
}

function rotaRepetida(fase: number, rng: Rng) {
  const corpo = sortearCorpo(fase < 13 ? 3 : sortear(3, 4, rng), rng);
  const antes = Array.from({ length: fase === 4 ? 0 : sortear(0, 2, rng) }, () => sortearCarta(rng));
  return { ...rotaVazia(sortear(3, 4, rng)), principal: [...antes, "laco" as Carta], laco: corpo };
}

function rotaComTruque(fase: number, rng: Rng) {
  const truque = sortearCorpo(fase < 13 ? 3 : sortear(3, 4, rng), rng);
  const principal: Carta[] = ["truque"];
  for (let uso = sortear(2, 3, rng); uso > 0; uso--) principal.push(sortearCarta(rng), "truque");
  return { ...rotaVazia(), principal, truque };
}

// As pedras enfeitam e confundem, mas nunca ficam no caminho da rota secreta.
function espalharPedras(fase: number, ocupadas: Set<string>, rng: Rng) {
  const casas = Array.from({ length: LADO * LADO }, (_, i) => ({ x: i % LADO, y: Math.floor(i / LADO) }));
  const livres = casas.filter((casa) => !ocupadas.has(chave(casa)));
  return embaralhar(livres, rng).slice(0, Math.min(fase + 2, 12));
}

// A rota secreta nasce em mar aberto e o rastro dela vira o mapa, por isso toda fase
// tem solução. Os tesouros ficam nas curvas e no fim de cada volta, o que obriga a
// criança a seguir o padrão em vez de cortar caminho.
function mapaDoRastro(solucao: Rota, fase: number, direcao: number, rng: Rng): Mapa | null {
  const meio = Math.floor(100 / 2);
  const aberto = { lado: 100, inicio: { x: meio, y: meio }, direcao, tesouros: [{ x: -1, y: -1 }], pedras: [] };
  const { passos } = rodar(aberto, solucao);
  const pontos = [aberto.inicio, ...passos];
  const xs = pontos.map(({ x }) => x);
  const ys = pontos.map(({ y }) => y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  if (maxX - minX >= LADO || maxY - minY >= LADO) return null;

  const dx = sortear(-minX, LADO - 1 - maxX, rng);
  const dy = sortear(-minY, LADO - 1 - maxY, rng);
  const mover = ({ x, y }: Ponto) => ({ x: x + dx, y: y + dy });
  const inicio = mover(aberto.inicio);
  const fim = mover(pontos.at(-1)!);
  if (chave(fim) === chave(inicio)) return null;

  const marcos = passos
    .filter(({ trilho, indice, carta }) =>
      trilho === "principal" ? carta !== "frente" : indice === solucao[trilho].length - 1,
    )
    .map(mover);
  const tesouros = new Map([...marcos, fim].map((ponto) => [chave(ponto), ponto]));
  tesouros.delete(chave(inicio));
  tesouros.delete(chave(fim));

  return {
    lado: LADO,
    inicio,
    direcao,
    tesouros: [...[...tesouros.values()].slice(-5), fim],
    pedras: espalharPedras(fase, new Set(pontos.map(mover).map(chave)), rng),
  };
}

// Uma trilha de trechos desiguais, sempre virando para o mesmo lado. Só quem olha a
// pedra à frente percorre com poucas cartas: uma repetição fixa não acerta os trechos.
function desafioDoSensor(fase: number, rng: Rng) {
  const passada = fase > 12 && rng() < 0.5 ? 2 : 1;
  const sensor: Carta = rng() < 0.5 ? "seDireita" : "seEsquerda";
  const inicio = { x: sortear(0, LADO - 1, rng), y: sortear(0, LADO - 1, rng) };
  const primeira = sortear(0, 3, rng);
  const caminho = new Map([[chave(inicio), inicio]]);
  const pedras = new Map<string, Ponto>();
  const cantos: Ponto[] = [];
  const trechos: number[] = [];
  let atual = inicio;
  let direcao = primeira;

  for (let trecho = sortear(4, 5, rng); trecho > 0; trecho--) {
    const tamanho = passada * sortear(1, Math.floor(5 / passada), rng);
    trechos.push(tamanho);
    for (let i = 0; i < tamanho; i++) {
      atual = { x: atual.x + RUMOS[direcao].x, y: atual.y + RUMOS[direcao].y };
      const dentro = atual.x >= 0 && atual.y >= 0 && atual.x < LADO && atual.y < LADO;
      if (!dentro || caminho.has(chave(atual)) || pedras.has(chave(atual))) return null;
      caminho.set(chave(atual), atual);
    }
    cantos.push(atual);
    if (trecho === 1) break;

    const pedra = { x: atual.x + RUMOS[direcao].x, y: atual.y + RUMOS[direcao].y };
    if (caminho.has(chave(pedra))) return null;
    const naParede = pedra.x < 0 || pedra.y < 0 || pedra.x >= LADO || pedra.y >= LADO;
    if (!naParede) pedras.set(chave(pedra), pedra);
    direcao = (direcao + (sensor === "seDireita" ? 1 : 3)) % 4;
  }
  if (new Set(trechos).size < 2) return null;

  const corpo: Carta[] = [sensor, ...Array<Carta>(passada).fill("frente")];
  const ocupadas = new Set([...caminho.keys(), ...pedras.keys()]);
  const mapa: Mapa = {
    lado: LADO,
    inicio,
    direcao: primeira,
    tesouros: cantos.slice(-6),
    pedras: [...pedras.values(), ...espalharPedras(fase, ocupadas, rng)],
  };
  return { mapa, solucao: { ...rotaVazia(SEMPRE), principal: ["laco"] as Carta[], laco: corpo } };
}

function rotaPronta(etapa: number, fase: number, solucao: Rota): Pronto {
  const estreia = fase === [0, 1, 4, 7, 10][etapa];
  if (etapa === 1 || !estreia) return { rota: rotaVazia(), trilho: "principal" };
  if (etapa === 3) {
    return { rota: { ...rotaVazia(), principal: ["truque"], truque: solucao.truque }, trilho: "principal" };
  }
  return {
    rota: { ...rotaVazia(solucao.vezes), principal: ["laco"], laco: solucao.laco.slice(0, 1) },
    trilho: "laco",
  };
}

function sortearDesafio(etapa: number, fase: number, rng: Rng) {
  if (etapa === 4) return desafioDoSensor(fase, rng);
  const solucao = etapa === 1 ? rotaReta(fase, rng) : etapa === 2 ? rotaRepetida(fase, rng) : rotaComTruque(fase, rng);
  const mapa = mapaDoRastro(solucao, fase, fase === 1 ? 1 : sortear(0, 3, rng), rng);
  return mapa && { mapa, solucao };
}

export function gerarFase(fase: number, rng: Rng = Math.random): Desafio {
  const etapa = etapaDaFase(fase, rng);
  for (;;) {
    const sorteado = sortearDesafio(etapa, fase, rng);
    if (!sorteado) continue;
    const { mapa, solucao } = sorteado;
    const vagas = {
      principal: solucao.principal.length + (fase === 1 ? 2 : 1),
      laco: solucao.laco.length === 0 ? 0 : solucao.laco.length + 1,
      truque: solucao.truque.length,
    };
    if (rodar(mapa, solucao).resultado !== "venceu") continue;
    const total = vagas.principal + vagas.laco + vagas.truque;
    if (etapa > 1 && menorCaminho(mapa) <= total) continue;

    const cartas = [
      ...MOVIMENTOS,
      ...(vagas.laco > 0 ? (["laco"] as Carta[]) : []),
      ...(vagas.truque > 0 ? (["truque"] as Carta[]) : []),
      ...(etapa === 4 ? SENSORES : []),
    ];
    const vezes = etapa === 4 ? [...VEZES, SEMPRE] : VEZES;
    return { etapa, mapa, solucao, vagas, cartas, vezes, pronto: rotaPronta(etapa, fase, solucao) };
  }
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  return { ...gerarFase(fase, rng), fase, vidas, pontos, dicas: 0 };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const cartasUsadas = (rota: Rota) => TRILHOS.reduce((total, trilho) => total + rota[trilho].length, 0);

// Errar não tira pontos: testar e consertar é a brincadeira. Só as vagas e as dicas contam.
export function pontosDaFase({ fase, vagas, dicas }: Estado, rota: Rota) {
  const sobra = TRILHOS.reduce((total, trilho) => total + vagas[trilho], 0) - cartasUsadas(rota);
  return Math.max(fase * 5, fase * 10 + (sobra - dicas) * 5);
}

export function concluir(estado: Estado, rota: Rota, rng: Rng = Math.random) {
  const pontos = estado.pontos + pontosDaFase(estado, rota);
  return novaFase(estado.fase + 1, Math.min(estado.vidas + 1, VIDAS_INICIAIS), pontos, rng);
}

// Só bater custa vida. Faltar tesouro ou andar em círculos é só uma rota a consertar.
export const bater = (estado: Estado): Estado => ({ ...estado, vidas: estado.vidas - 1 });

// Revela a primeira carta que difere da solução e tira o que vinha depois dela.
export function darDica(rota: Rota, solucao: Rota): Rota {
  const comVezes = { ...rota, vezes: solucao.vezes };
  for (const trilho of TRILHOS) {
    const certo = solucao[trilho];
    const errada = certo.findIndex((carta, i) => rota[trilho][i] !== carta);
    if (errada >= 0) return { ...comVezes, [trilho]: certo.slice(0, errada + 1) };
    if (rota[trilho].length > certo.length) return { ...comVezes, [trilho]: certo };
  }
  return comVezes;
}
