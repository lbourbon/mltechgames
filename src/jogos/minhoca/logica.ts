// Regras do jogo, sem DOM, para serem testadas com Vitest. Este é o único jogo em que tudo
// acontece a cada quadro, então passo e andar mudam o estado em vez de copiá-lo.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";
import { C_SS, CURTAS, ENCONTROS, G_J, LONGAS, NH_LH, S_Z, TIL, TODAS, X_CH, type Palavra } from "./palavras";

export const VIDAS_INICIAIS = 3;
export const ULTIMA_FASE_MANSA = 2;
export const CAUDA = 3;
// Distâncias em pixels da tela, as mesmas do CSS.
export const ESPACO_DOS_GOMOS = 32;
export const RAIO_DA_CABECA = 20;
export const RAIO_DA_LETRA = 23;
const ALCANCE_DA_BOCA = RAIO_DA_CABECA + RAIO_DA_LETRA - 4;
// Só erra quem foi buscar a letra errada, com o dedo nela. Um esbarrão no caminho é de graça,
// senão o jogo cobraria coordenação em vez de escrita.
const ALCANCE_DO_DEDO = RAIO_DA_LETRA + 12;
const ALCANCE_MORDIDA = 16;
// A cabeça curva neste raio, que precisa ser menor que ALCANCE_DA_BOCA: assim ela nunca fica
// dando voltas em torno de uma letra sem conseguir comer.
const RAIO_DA_CURVA = 26;
const CHEGOU = 10;
const PERTO_DA_CERCA = 34;
const PASSO_DO_RASTRO = 4;
const TAMANHO_DO_RASTRO = 100;
const GOMO_MAIS_PROXIMO_QUE_MORDE = 3;
const IMUNE_DEPOIS_DE_MORDER = 1.5;
const LONGE_DA_CABECA = 90;
const LONGE_DO_CORPO = 34;
// O dedo em cima de uma letra nunca conta como mirar na vizinha.
const LONGE_DE_OUTRA_LETRA = ALCANCE_DO_DEDO + RAIO_DA_LETRA + 18;
const TENTATIVAS = 40;
const REFORCOS_POR_FASE = 1;
const PONTOS = { letra: 2, perfeita: 5 };
const ALFABETO = [..."ABCDEFGHIJLMNOPQRSTUVXZ"];

// Por onde o olho e o ouvido se confundem: é daqui que saem as letras erradas do jardim.
const PARECIDAS: Record<string, string> = {
  A: "EO",
  B: "DP",
  C: "GKQS",
  D: "BT",
  E: "AI",
  F: "VT",
  G: "CJ",
  H: "NM",
  I: "EL",
  J: "GI",
  L: "RI",
  M: "NW",
  N: "MH",
  O: "UA",
  P: "BR",
  Q: "OG",
  R: "LP",
  S: "ZC",
  T: "DF",
  U: "OV",
  V: "FU",
  X: "SZ",
  Z: "SN",
  Ç: "CS",
  Ã: "AO",
};

export type Ponto = { x: number; y: number };
export type Campo = { largura: number; altura: number };
export type Letra = Ponto & { id: number; texto: string };
export type Minhoca = Ponto & {
  angulo: number;
  // Do mais novo ao mais velho, um ponto a cada PASSO_DO_RASTRO. O corpo anda por cima dele.
  rastro: Ponto[];
};
// Com a guia, a criança copia a palavra enquanto ainda aprende o gesto.
type Guia = "tudo" | "inicio" | "nada";
export type Config = {
  palavras: Palavra[];
  quantas: number;
  opcoes: number;
  guia: Guia;
  // Mansa: ela para quando chega onde o dedo mandou, e nada tira coração.
  mansa: boolean;
  velocidade: number;
};
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  campo: Campo;
  minhoca: Minhoca;
  palavras: Palavra[];
  feitas: number;
  comidas: number;
  // Pedaços da palavra atual que a criança errou: a resposta aparece na casa e não rende pontos.
  reveladas: number[];
  letras: Letra[];
  imune: number;
  // Palavras erradas voltam uma vez, uma por fase. Mais que isso vira repetição.
  reforco: Palavra[];
  revisada: Palavra | null;
  // Da mais antiga à mais recente, entre fases e recomeços: nada repete enquanto houver inédita.
  vistas: Palavra[];
  ultimoId: number;
};
export type Casa = { texto: string; tipo: "comida" | "guia" | "vazia" };
export type Evento =
  | { tipo: "comeu"; letra: Letra; ganhou: number }
  | { tipo: "palavra"; letra: Letra; palavra: Palavra; perfeita: boolean; ganhou: number }
  | { tipo: "errou"; letra: Letra; de: Ponto; palavra: Palavra; certa: string; armadilha: boolean; perdeu: boolean }
  | { tipo: "mordeu" };

const fase = (palavras: Palavra[], quantas: number, opcoes: number, guia: Guia, velocidade: number): Config => ({
  palavras,
  quantas,
  opcoes,
  guia,
  velocidade,
  mansa: false,
});

const FASES = [
  fase(CURTAS, 4, 3, "tudo", 110),
  fase(CURTAS, 4, 3, "inicio", 125),
  fase(LONGAS, 4, 4, "nada", 135),
  fase(NH_LH, 4, 4, "nada", 145),
  fase(ENCONTROS, 4, 4, "nada", 155),
  fase(S_Z, 5, 4, "nada", 165),
  fase(X_CH, 5, 4, "nada", 175),
  fase(C_SS, 5, 4, "nada", 185),
  fase(G_J, 5, 4, "nada", 195),
  fase(TIL, 5, 4, "nada", 205),
].map((config, i) => ({ ...config, mansa: i < ULTIMA_FASE_MANSA }));

const ARMADILHAS = [...S_Z, ...X_CH, ...C_SS, ...G_J, ...TIL];

export function configDaFase(numero: number): Config {
  if (numero <= FASES.length) return FASES[numero - 1];
  // Depois das estreias, todas as armadilhas se misturam com o que já era fácil.
  const velocidade = Math.min(240, 210 + (numero - FASES.length) * 3);
  return fase(numero % 2 ? ARMADILHAS : TODAS, 6, 5, "nada", velocidade);
}

const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

export const palavraAtual = ({ palavras, feitas }: Estado) => palavras[feitas];

export const letraCerta = (estado: Estado) => palavraAtual(estado).pedacos[estado.comidas];

function iscaAtual(estado: Estado) {
  return palavraAtual(estado).iscas[estado.comidas];
}

export function casas(estado: Estado): Casa[] {
  const { guia } = configDaFase(estado.fase);
  return palavraAtual(estado).pedacos.map((texto, i) => {
    if (i < estado.comidas) return { texto, tipo: "comida" };
    if (guia === "tudo" || (guia === "inicio" && i === 0) || estado.reveladas.includes(i)) return { texto, tipo: "guia" };
    return { texto: "", tipo: "vazia" };
  });
}

// O ponto do corpo a tantos pixels da cabeça, medido pelo rastro. Interpola porque o rastro
// anda aos saltos de PASSO_DO_RASTRO, e sem isso o corpo tremeria em velocidade baixa.
export function pontoDoCorpo({ x, y, rastro }: Minhoca, longe: number): Ponto {
  const adiantada = distancia({ x, y }, rastro[0]);
  if (longe <= adiantada) return { x, y };
  const indice = (longe - adiantada) / PASSO_DO_RASTRO;
  const antes = Math.min(Math.floor(indice), rastro.length - 1);
  const depois = Math.min(antes + 1, rastro.length - 1);
  const t = indice - Math.floor(indice);
  return { x: rastro[antes].x + (rastro[depois].x - rastro[antes].x) * t, y: rastro[antes].y + (rastro[depois].y - rastro[antes].y) * t };
}

export const chegouNoAlvo = (minhoca: Minhoca, alvo: Ponto) => distancia(minhoca, alvo) <= CHEGOU;

function novaMinhoca({ largura, altura }: Campo): Minhoca {
  const x = largura / 2;
  const y = altura / 2;
  const rastro = Array.from({ length: TAMANHO_DO_RASTRO }, (_, i) => ({ x: x - i * PASSO_DO_RASTRO, y }));
  return { x, y, angulo: 0, rastro };
}

function lugarLivre(estado: Estado, rng: Rng): Ponto {
  const { campo, minhoca, letras } = estado;
  const margem = RAIO_DA_LETRA + 6;
  const corpo = minhoca.rastro.slice(0, Math.ceil(((estado.comidas + CAUDA) * ESPACO_DOS_GOMOS) / PASSO_DO_RASTRO));
  // Quanto falta para encostar em algo. Sem lugar perfeito, fica com o melhor que achou.
  const folga = (ponto: Ponto) =>
    Math.min(
      distancia(ponto, minhoca) - LONGE_DA_CABECA,
      ...corpo.map((parte) => distancia(ponto, parte) - LONGE_DO_CORPO),
      ...letras.map((letra) => distancia(ponto, letra) - LONGE_DE_OUTRA_LETRA),
    );
  let melhor = { x: margem, y: margem };
  let maiorFolga = -Infinity;
  for (let i = 0; i < TENTATIVAS && maiorFolga < 0; i++) {
    const ponto = { x: sortear(margem, campo.largura - margem, rng), y: sortear(margem, campo.altura - margem, rng) };
    const medida = folga(ponto);
    if (medida > maiorFolga) {
      melhor = ponto;
      maiorFolga = medida;
    }
  }
  return melhor;
}

function plantar(estado: Estado, texto: string, rng: Rng) {
  estado.ultimoId += 1;
  estado.letras.push({ id: estado.ultimoId, texto, ...lugarLivre(estado, rng) });
}

function letraErrada(estado: Estado, rng: Rng) {
  const certa = letraCerta(estado);
  const noJardim = estado.letras.map(({ texto }) => texto);
  const parecidas = embaralhar([...(PARECIDAS[certa] ?? ""), ...palavraAtual(estado).pedacos], rng);
  const outras = embaralhar(ALFABETO, rng);
  return [...parecidas, ...outras].find((texto) => texto !== certa && !noJardim.includes(texto))!;
}

// A letra certa e a isca estão sempre no jardim. As que estão ali há mais tempo saem para dar
// lugar a elas, e as outras ficam paradas: letra pulando de lugar confunde quem está mirando.
function repor(estado: Estado, rng: Rng) {
  const { opcoes } = configDaFase(estado.fase);
  const certa = letraCerta(estado);
  const isca = iscaAtual(estado);
  const precisa = [certa, ...(isca ? [isca] : [])];
  const faltam = precisa.filter((texto) => !estado.letras.some((letra) => letra.texto === texto));
  let sobrando = estado.letras.length + faltam.length - opcoes;
  estado.letras = estado.letras.filter(({ texto }) => precisa.includes(texto) || sobrando-- <= 0);
  faltam.forEach((texto) => plantar(estado, texto, rng));
  while (estado.letras.length < opcoes) plantar(estado, letraErrada(estado, rng), rng);
}

// Inéditas primeiro. Se acabarem, voltam as que foram vistas há mais tempo. O sort é estável,
// então as inéditas, que empatam em -1, continuam embaralhadas.
function escolherPalavras({ palavras, quantas }: Config, reforco: Palavra[], vistas: Palavra[], rng: Rng) {
  const voltam = reforco.slice(0, REFORCOS_POR_FASE);
  const novas = embaralhar(palavras, rng)
    .filter((palavra) => !voltam.includes(palavra))
    .sort((a, b) => vistas.indexOf(a) - vistas.indexOf(b));
  return embaralhar([...voltam, ...novas.slice(0, quantas - voltam.length)], rng);
}

export function novaFase(
  numero: number,
  vidas: number,
  pontos: number,
  campo: Campo,
  reforco: Palavra[] = [],
  rng: Rng = Math.random,
  vistas: Palavra[] = [],
): Estado {
  const palavras = escolherPalavras(configDaFase(numero), reforco, vistas, rng);
  const estado: Estado = {
    fase: numero,
    vidas,
    pontos,
    campo,
    minhoca: novaMinhoca(campo),
    palavras,
    feitas: 0,
    comidas: 0,
    reveladas: [],
    letras: [],
    imune: 0,
    reforco: reforco.slice(REFORCOS_POR_FASE),
    revisada: reforco[0] ?? null,
    vistas: [...vistas.filter((palavra) => !palavras.includes(palavra)), ...palavras],
    ultimoId: 0,
  };
  repor(estado, rng);
  return estado;
}

export const novoJogo = (numero: number, campo: Campo, rng: Rng = Math.random, vistas: Palavra[] = []) =>
  novaFase(numero, VIDAS_INICIAIS, 0, campo, [], rng, vistas);

function virar(atual: number, rumo: number, limite: number) {
  const volta = Math.PI * 2;
  const diferenca = ((rumo - atual + Math.PI) % volta + volta) % volta - Math.PI;
  return atual + Math.max(-limite, Math.min(limite, diferenca));
}

function gravarRastro(minhoca: Minhoca) {
  let ultimo = minhoca.rastro[0];
  let longe = distancia(minhoca, ultimo);
  while (longe >= PASSO_DO_RASTRO) {
    const t = PASSO_DO_RASTRO / longe;
    ultimo = { x: ultimo.x + (minhoca.x - ultimo.x) * t, y: ultimo.y + (minhoca.y - ultimo.y) * t };
    minhoca.rastro.unshift(ultimo);
    longe -= PASSO_DO_RASTRO;
  }
  minhoca.rastro.length = TAMANHO_DO_RASTRO;
}

// Sem alvo, a mansa descansa, e a outra segue reto e faz a curva sozinha antes da cerca. Por
// isso soltar o dedo nunca é perigoso: dá para pensar na palavra com calma, mesmo em movimento.
function andar(minhoca: Minhoca, alvo: Ponto | null, dt: number, { mansa, velocidade }: Config, { largura, altura }: Campo) {
  if (mansa && !alvo) return;
  const raio = RAIO_DA_CABECA;
  const nasBordas =
    minhoca.x < PERTO_DA_CERCA || minhoca.y < PERTO_DA_CERCA || minhoca.x > largura - PERTO_DA_CERCA || minhoca.y > altura - PERTO_DA_CERCA;
  const destino = alvo ?? (nasBordas ? { x: largura / 2, y: altura / 2 } : null);
  if (destino) {
    const rumo = Math.atan2(destino.y - minhoca.y, destino.x - minhoca.x);
    minhoca.angulo = virar(minhoca.angulo, rumo, (velocidade / RAIO_DA_CURVA) * dt);
  }
  minhoca.x = Math.min(largura - raio, Math.max(raio, minhoca.x + Math.cos(minhoca.angulo) * velocidade * dt));
  minhoca.y = Math.min(altura - raio, Math.max(raio, minhoca.y + Math.sin(minhoca.angulo) * velocidade * dt));
  gravarRastro(minhoca);
}

function comer(estado: Estado, letra: Letra, rng: Rng): Evento {
  const palavra = palavraAtual(estado);
  const ganhou = estado.reveladas.includes(estado.comidas) ? 0 : PONTOS.letra;
  estado.letras = estado.letras.filter(({ id }) => id !== letra.id);
  estado.comidas += 1;
  estado.pontos += ganhou;
  if (estado.comidas < palavra.pedacos.length) {
    repor(estado, rng);
    return { tipo: "comeu", letra, ganhou };
  }
  const perfeita = estado.reveladas.length === 0;
  const bonus = perfeita ? PONTOS.perfeita : 0;
  estado.pontos += bonus;
  if (!perfeita && palavra !== estado.revisada) estado.reforco.push(palavra);
  return { tipo: "palavra", letra, palavra, perfeita, ganhou: ganhou + bonus };
}

function errar(estado: Estado, letra: Letra, mansa: boolean, rng: Rng): Evento {
  const de = { x: letra.x, y: letra.y };
  const perdeu = !mansa;
  if (perdeu) estado.vidas -= 1;
  if (!estado.reveladas.includes(estado.comidas)) estado.reveladas.push(estado.comidas);
  // Cuspida para longe, para não ser comida de novo no mesmo instante.
  estado.letras = estado.letras.filter(({ id }) => id !== letra.id);
  estado.letras.push({ ...letra, ...lugarLivre(estado, rng) });
  return {
    tipo: "errou",
    letra,
    de,
    palavra: palavraAtual(estado),
    certa: letraCerta(estado),
    armadilha: iscaAtual(estado) !== null,
    perdeu,
  };
}

function mordeu(estado: Estado) {
  const { minhoca, comidas } = estado;
  const gomos = comidas + CAUDA;
  for (let i = GOMO_MAIS_PROXIMO_QUE_MORDE; i <= gomos; i++) {
    if (distancia(minhoca, pontoDoCorpo(minhoca, i * ESPACO_DOS_GOMOS)) < ALCANCE_MORDIDA) return true;
  }
  return false;
}

// Um quadro do jogo. O alvo é para onde o dedo manda, e null quando ninguém está guiando.
export function passo(estado: Estado, alvo: Ponto | null, dt: number, rng: Rng = Math.random): Evento | null {
  const config = configDaFase(estado.fase);
  andar(estado.minhoca, alvo, dt, config, estado.campo);
  estado.imune = Math.max(0, estado.imune - dt);

  const certa = letraCerta(estado);
  const naBoca = estado.letras.filter((letra) => distancia(letra, estado.minhoca) <= ALCANCE_DA_BOCA);
  const comida = naBoca.find(({ texto }) => texto === certa);
  if (comida) return comer(estado, comida, rng);
  const errada = alvo && naBoca.find((letra) => distancia(letra, alvo) <= ALCANCE_DO_DEDO);
  if (errada) return errar(estado, errada, config.mansa, rng);

  // Só morde quem está guiando: sozinha, ela faria a curva em cima do próprio corpo.
  if (!config.mansa && alvo && estado.imune === 0 && mordeu(estado)) {
    estado.vidas -= 1;
    estado.imune = IMUNE_DEPOIS_DE_MORDER;
    return { tipo: "mordeu" };
  }
  return null;
}

// Depois da festa da palavra: a próxima palavra, ou a próxima fase com uma vida de volta.
export function seguirAdiante(estado: Estado, rng: Rng = Math.random) {
  const { fase: numero, pontos, vidas, campo, reforco, vistas } = estado;
  estado.feitas += 1;
  estado.comidas = 0;
  estado.reveladas = [];
  if (estado.feitas < estado.palavras.length) {
    repor(estado, rng);
    return { estado, bonus: 0, passou: false };
  }
  const bonus = numero * 10;
  const proxima = novaFase(numero + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + bonus, campo, reforco, rng, vistas);
  return { estado: proxima, bonus, passou: true };
}

// A tela girou ou mudou de tamanho: tudo acompanha, na mesma proporção.
export function redimensionar(estado: Estado, campo: Campo) {
  const escalaX = campo.largura / estado.campo.largura;
  const escalaY = campo.altura / estado.campo.altura;
  const ajustar = (ponto: Ponto) => {
    ponto.x *= escalaX;
    ponto.y *= escalaY;
  };
  [estado.minhoca, ...estado.minhoca.rastro, ...estado.letras].forEach(ajustar);
  estado.campo = campo;
}
