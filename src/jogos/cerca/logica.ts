// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui a criança aprende o gesto, e cerca do tamanho errado não custa coração.
export const ULTIMA_FASE_MANSA = 2;
const TENTATIVAS_POR_DIVISAO = 40;

export type Retangulo = { x: number; y: number; largura: number; altura: number };
export type Bicho = { x: number; y: number; area: number };
export type Mapa = { colunas: number; linhas: number; bichos: Bicho[]; solucao: Retangulo[] };
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  mapa: Mapa;
  // Uma por bicho, na ordem de mapa.bichos.
  cercas: (Retangulo | null)[];
  // Sem cerca errada nem dica, vale o bônus. Abrir uma cerca é de graça, porque consertar é o jogo.
  limpa: boolean;
};
export type Resultado = "vazia" | "dois" | "encostou" | "errada" | "cercou" | "fase" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado; bicho?: number };

// O menor pedaço cresce com as fases: 2 e 3 só têm um formato, e sem 8, 12 e 15 sobra pouca
// multiplicação para pensar. duvida é a parte dos bichos que precisa começar com mais de um
// lugar possível, senão a fase se resolve sozinha, bicho por bicho.
const FASES = [
  { colunas: 3, linhas: 3, menor: 2, maior: 6, duvida: 0 },
  { colunas: 4, linhas: 3, menor: 2, maior: 6, duvida: 0 },
  { colunas: 4, linhas: 4, menor: 2, maior: 8, duvida: 0.4 },
  { colunas: 5, linhas: 4, menor: 3, maior: 9, duvida: 0.5 },
  { colunas: 5, linhas: 5, menor: 3, maior: 12, duvida: 0.6 },
  { colunas: 6, linhas: 5, menor: 4, maior: 12, duvida: 0.6 },
  { colunas: 6, linhas: 6, menor: 4, maior: 15, duvida: 0.7 },
  { colunas: 6, linhas: 7, menor: 4, maior: 16, duvida: 0.7 },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

export const areaDe = ({ largura, altura }: Retangulo) => largura * altura;

export const contem = ({ x, y, largura, altura }: Retangulo, ponto: { x: number; y: number }) =>
  ponto.x >= x && ponto.x < x + largura && ponto.y >= y && ponto.y < y + altura;

export const cruzam = (a: Retangulo, b: Retangulo) =>
  a.x < b.x + b.largura && b.x < a.x + a.largura && a.y < b.y + b.altura && b.y < a.y + a.altura;

// Do canto onde o dedo começou ao canto onde ele está, em qualquer direção.
export function entre(a: { x: number; y: number }, b: { x: number; y: number }): Retangulo {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    largura: Math.abs(a.x - b.x) + 1,
    altura: Math.abs(a.y - b.y) + 1,
  };
}

export const bichosDentro = ({ bichos }: Mapa, retangulo: Retangulo) =>
  bichos.flatMap((bicho, i) => (contem(retangulo, bicho) ? [i] : []));

// Os lugares onde a cerca desse bicho ainda cabe, inteira e sem pegar outro bicho.
export function opcoes(mapa: Mapa, indice: number, cercas: (Retangulo | null)[]) {
  const bicho = mapa.bichos[indice];
  const achadas: Retangulo[] = [];
  for (let largura = 1; largura <= Math.min(mapa.colunas, bicho.area); largura++) {
    if (bicho.area % largura !== 0) continue;
    const altura = bicho.area / largura;
    if (altura > mapa.linhas) continue;
    for (let x = Math.max(0, bicho.x - largura + 1); x <= Math.min(bicho.x, mapa.colunas - largura); x++) {
      for (let y = Math.max(0, bicho.y - altura + 1); y <= Math.min(bicho.y, mapa.linhas - altura); y++) {
        const cerca = { x, y, largura, altura };
        const cabe = cercas.every((outra, i) => i === indice || !outra || !cruzam(outra, cerca));
        if (cabe && bichosDentro(mapa, cerca).length === 1) achadas.push(cerca);
      }
    }
  }
  return achadas;
}

// Bichos que ficaram sem lugar: é o sinal de que alguma cerca está no canto errado.
export const semLugar = ({ mapa, cercas }: Estado) =>
  mapa.bichos.flatMap((_, i) => (!cercas[i] && opcoes(mapa, i, cercas).length === 0 ? [i] : []));

// Resolve sem chutar, como a criança deveria conseguir: sempre há um bicho com um lugar só.
// Isso também prova que a solução é única, porque cada passo é obrigatório.
export function resolverSemChute(mapa: Mapa) {
  const cercas: (Retangulo | null)[] = mapa.bichos.map(() => null);
  for (let passo = 0; passo < mapa.bichos.length; passo++) {
    const proximo = mapa.bichos.findIndex((_, i) => !cercas[i] && opcoes(mapa, i, cercas).length === 1);
    if (proximo < 0) return null;
    cercas[proximo] = opcoes(mapa, proximo, cercas)[0];
  }
  return cercas as Retangulo[];
}

function dividir(retangulo: Retangulo, menor: number, maior: number, rng: Rng): Retangulo[] {
  const area = areaDe(retangulo);
  // Pedaços médios às vezes ficam inteiros, para a fase não ter só tamanhos parecidos.
  if (area <= maior && rng() < 0.3) return [retangulo];

  const { x, y, largura, altura } = retangulo;
  const cortes: [Retangulo, Retangulo][] = [];
  for (let c = 1; c < largura; c++) {
    if (c * altura < menor || (largura - c) * altura < menor) continue;
    cortes.push([
      { x, y, largura: c, altura },
      { x: x + c, y, largura: largura - c, altura },
    ]);
  }
  for (let c = 1; c < altura; c++) {
    if (largura * c < menor || largura * (altura - c) < menor) continue;
    cortes.push([
      { x, y, largura, altura: c },
      { x, y: y + c, largura, altura: altura - c },
    ]);
  }
  if (cortes.length === 0) return [retangulo];
  const [a, b] = cortes[sortear(0, cortes.length - 1, rng)];
  return [...dividir(a, menor, maior, rng), ...dividir(b, menor, maior, rng)];
}

function porBichoNaSolucao(pedaco: Retangulo, rng: Rng): Bicho {
  return {
    x: pedaco.x + sortear(0, pedaco.largura - 1, rng),
    y: pedaco.y + sortear(0, pedaco.altura - 1, rng),
    area: areaDe(pedaco),
  };
}

// A fase nasce dividindo o pasto em retângulos, então sempre tem solução. O verificador só deixa
// passar a que dá para resolver pensando, sem precisar chutar um lugar.
export function gerarFase(fase: number, rng: Rng = Math.random): Mapa {
  const { colunas, linhas, menor, maior, duvida } = configDaFase(fase);
  for (;;) {
    const solucao = dividir({ x: 0, y: 0, largura: colunas, altura: linhas }, menor, maior, rng);
    if (solucao.length < 2) continue;
    for (let tentativa = 0; tentativa < TENTATIVAS_POR_DIVISAO; tentativa++) {
      const bichos = solucao.map((pedaco) => porBichoNaSolucao(pedaco, rng));
      const mapa = { colunas, linhas, bichos, solucao };
      const vazias = bichos.map(() => null);
      const comDuvida = bichos.filter((_, i) => opcoes(mapa, i, vazias).length > 1).length;
      if (comDuvida >= bichos.length * duvida && resolverSemChute(mapa)) return mapa;
    }
  }
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const mapa = gerarFase(fase, rng);
  return { fase, vidas, pontos, mapa, cercas: mapa.bichos.map(() => null), limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

// Os pontos só entram no fim da fase: abrir e fechar a mesma cerca não pode render nada.
function aposCercar(estado: Estado, cercas: Estado["cercas"], rng: Rng, bicho: number): Jogada {
  if (cercas.some((cerca) => !cerca)) return { estado: { ...estado, cercas }, resultado: "cercou", bicho };
  const { fase, vidas, pontos, limpa } = estado;
  const proxima = novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + fase * (limpa ? 15 : 10), rng);
  return { estado: proxima, resultado: "fase", bicho };
}

export function cercar(estado: Estado, retangulo: Retangulo, rng: Rng = Math.random): Jogada {
  const { mapa, cercas, fase, vidas } = estado;
  if (cercas.some((cerca) => cerca && cruzam(cerca, retangulo))) return { estado, resultado: "encostou" };
  const dentro = bichosDentro(mapa, retangulo);
  if (dentro.length === 0) return { estado, resultado: "vazia" };
  if (dentro.length > 1) return { estado, resultado: "dois" };

  const bicho = dentro[0];
  if (areaDe(retangulo) !== mapa.bichos[bicho].area) {
    if (fase <= ULTIMA_FASE_MANSA) return { estado: { ...estado, limpa: false }, resultado: "errada", bicho };
    const restantes = vidas - 1;
    return {
      estado: { ...estado, vidas: restantes, limpa: false },
      resultado: restantes <= 0 ? "fim" : "errada",
      bicho,
    };
  }
  return aposCercar(estado, cercas.map((cerca, i) => (i === bicho ? retangulo : cerca)), rng, bicho);
}

export const abrirCerca = (estado: Estado, bicho: number): Estado => ({
  ...estado,
  cercas: estado.cercas.map((cerca, i) => (i === bicho ? null : cerca)),
});

export const bichoDaCerca = ({ cercas }: Estado, ponto: { x: number; y: number }) =>
  cercas.findIndex((cerca) => cerca && contem(cerca, ponto));

const mesmaCerca = (a: Retangulo | null, b: Retangulo) =>
  a !== null && a.x === b.x && a.y === b.y && a.largura === b.largura && a.altura === b.altura;

// Põe uma cerca certa e tira as que estavam no caminho dela. Custa só o bônus.
export function dica(estado: Estado, rng: Rng = Math.random): Jogada {
  const { mapa, cercas } = estado;
  const bicho = mapa.solucao.findIndex((cerca, i) => !mesmaCerca(cercas[i], cerca));
  const certa = mapa.solucao[bicho];
  const livres = cercas.map((cerca) => (cerca && cruzam(cerca, certa) ? null : cerca));
  return aposCercar({ ...estado, limpa: false }, livres.map((cerca, i) => (i === bicho ? certa : cerca)), rng, bicho);
}
