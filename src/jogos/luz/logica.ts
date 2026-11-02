// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui a criança aprende a peça, e girar à vontade é de graça.
export const ULTIMA_FASE_MANSA = 2;

// Os lados são 0 em cima, 1 à direita, 2 embaixo e 3 à esquerda.
const VIZINHO = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
];
const LADOS = [0, 1, 2, 3];
const oposto = (lado: number) => (lado + 2) % 4;
const bit = (lado: number) => 1 << lado;

export type Tipo = "vazio" | "fio" | "casa" | "fabrica" | "usina" | "bateria";
// bracos guarda os lados do fio já na posição certa, um bit por lado, em sentido horário.
export type Peca = { tipo: Tipo; bracos: number; carga: number };
export type Mapa = {
  colunas: number;
  linhas: number;
  pecas: Peca[];
  // Giros (de 0 a 3) de cada peça no começo da fase. Zero é a posição da solução.
  inicio: number[];
  // As peças na ordem em que a rede cresceu a partir das fontes: é a ordem da dica.
  ordem: number[];
  // Toques que bastam para chegar à solução, e o limite da fase. Sem limite nas fases mansas.
  menor: number;
  toques: number | null;
};
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  mapa: Mapa;
  giros: number[];
  gastos: number;
  // Sem apagão nem dica, vale o bônus.
  limpa: boolean;
};
export type Resultado = "parada" | "girou" | "fase" | "apagou" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado; indice?: number };
export type Energia = {
  // Passos desde a fonte de cada peça viva, para a corrente correr em ordem. -1 é apagada.
  passos: number[];
  // Quantos fios vivos chegam em cada casa ou fábrica.
  entradas: number[];
  sobrecarga: number[];
  casas: number;
  acesas: number;
};

type Config = {
  colunas: number;
  linhas: number;
  ocupacao: number;
  // Sem ramos, cada caminho da usina é uma linha só, sem peça de três pontas.
  ramos: boolean;
  casas: [number, number];
  fabricas: number;
  baterias: number;
  // Quanto além do menor número de toques a fase deixa gastar.
  folga: number;
};

const FASES: Config[] = [
  { colunas: 3, linhas: 3, ocupacao: 0.7, ramos: false, casas: [1, 2], fabricas: 0, baterias: 0, folga: 0 },
  { colunas: 3, linhas: 4, ocupacao: 0.75, ramos: false, casas: [2, 3], fabricas: 0, baterias: 0, folga: 0 },
  { colunas: 4, linhas: 4, ocupacao: 0.8, ramos: true, casas: [3, 4], fabricas: 0, baterias: 0, folga: 1.2 },
  { colunas: 4, linhas: 5, ocupacao: 0.85, ramos: true, casas: [3, 5], fabricas: 0, baterias: 0, folga: 1 },
  { colunas: 5, linhas: 5, ocupacao: 0.85, ramos: true, casas: [4, 7], fabricas: 1, baterias: 0, folga: 1 },
  { colunas: 5, linhas: 6, ocupacao: 0.9, ramos: true, casas: [5, 8], fabricas: 1, baterias: 0, folga: 0.8 },
  { colunas: 5, linhas: 6, ocupacao: 0.9, ramos: true, casas: [5, 8], fabricas: 0, baterias: 1, folga: 0.8 },
  { colunas: 6, linhas: 6, ocupacao: 0.95, ramos: true, casas: [6, 10], fabricas: 1, baterias: 1, folga: 0.7 },
  { colunas: 6, linhas: 7, ocupacao: 1, ramos: true, casas: [7, 12], fabricas: 2, baterias: 1, folga: 0.6 },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

const ehFio = ({ tipo }: Peca) => tipo === "fio";
const ehCasa = ({ tipo }: Peca) => tipo === "casa" || tipo === "fabrica";
const ehFonte = ({ tipo }: Peca) => tipo === "usina" || tipo === "bateria";

export const entradasDa = ({ tipo }: Peca) => (tipo === "fabrica" ? 2 : 1);

export function girado(bracos: number, giros: number) {
  return ((bracos << giros) | (bracos >> (4 - giros))) & 15;
}

// Quantos toques até a peça voltar à mesma figura: reto é 2, cruz é 1, o resto é 4.
export function voltaDe(bracos: number) {
  if (girado(bracos, 1) === bracos) return 1;
  return girado(bracos, 2) === bracos ? 2 : 4;
}

const toquesAteCerto = ({ bracos }: Peca, giro: number) => (voltaDe(bracos) - giro % voltaDe(bracos)) % voltaDe(bracos);

const contarBracos = (bracos: number) => LADOS.filter((lado) => bracos & bit(lado)).length;

export const bracosDe = ({ pecas }: Mapa, giros: number[], indice: number) => girado(pecas[indice].bracos, giros[indice]);

function vizinho({ colunas, linhas }: Pick<Mapa, "colunas" | "linhas">, indice: number, lado: number) {
  const x = (indice % colunas) + VIZINHO[lado].dx;
  const y = Math.floor(indice / colunas) + VIZINHO[lado].dy;
  return x < 0 || y < 0 || x >= colunas || y >= linhas ? -1 : y * colunas + x;
}

// A corrente sai da fonte e anda só por fios que se encostam. Casa não deixa passar.
function espalhar(mapa: Mapa, giros: number[], fonte: number) {
  const passos = new Map([[fonte, 0]]);
  const entradas = new Map<number, number>();
  const fila = [fonte];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    const saiDaFonte = ehFonte(mapa.pecas[atual]);
    for (const lado of LADOS) {
      if (!saiDaFonte && !(bracosDe(mapa, giros, atual) & bit(lado))) continue;
      const proximo = vizinho(mapa, atual, lado);
      if (proximo < 0) continue;
      const peca = mapa.pecas[proximo];
      if (ehCasa(peca) && !saiDaFonte) entradas.set(proximo, (entradas.get(proximo) ?? 0) + 1);
      if (!ehFio(peca) || passos.has(proximo)) continue;
      if (!(bracosDe(mapa, giros, proximo) & bit(oposto(lado)))) continue;
      passos.set(proximo, passos.get(atual)! + 1);
      fila.push(proximo);
    }
  }
  return { passos, entradas };
}

export function energia(mapa: Mapa, giros: number[]): Energia {
  const { pecas } = mapa;
  const passos = pecas.map(() => -1);
  const entradas = pecas.map(() => 0);
  const sobrecarga: number[] = [];
  const somar = (rede: ReturnType<typeof espalhar>) => {
    rede.passos.forEach((valor, indice) => {
      if (passos[indice] < 0) passos[indice] = valor;
    });
    rede.entradas.forEach((valor, indice) => (entradas[indice] += valor));
  };

  somar(espalhar(mapa, giros, pecas.findIndex(({ tipo }) => tipo === "usina")));
  pecas.forEach(({ tipo, carga }, indice) => {
    if (tipo !== "bateria") return;
    const rede = espalhar(mapa, giros, indice);
    // Encostou na rede da usina: quem segura tudo é ela.
    if ([...rede.passos.keys()].some((peca) => peca !== indice && passos[peca] >= 0)) return;
    if (rede.entradas.size > carga) sobrecarga.push(indice);
    else somar(rede);
  });

  const casas = pecas.filter(ehCasa).length;
  const acesas = pecas.filter((peca, indice) => ehCasa(peca) && entradas[indice] >= entradasDa(peca)).length;
  return { passos, entradas, sobrecarga, casas, acesas };
}

export const completa = (mapa: Mapa, giros: number[]) => {
  const { casas, acesas } = energia(mapa, giros);
  return acesas === casas;
};

type Grade = Pick<Mapa, "colunas" | "linhas">;

function bracosDaRede(grade: Grade, config: Config, raizes: number[], rng: Rng) {
  const total = grade.colunas * grade.linhas;
  const alvo = Math.round(total * config.ocupacao);
  const bracos = Array.from({ length: total }, () => 0);
  const dono = Array.from({ length: total }, () => -1);
  raizes.forEach((raiz, i) => (dono[raiz] = i));
  const ordem: number[] = [];
  const grauMaximo = config.ramos ? 3 : 2;
  let tomadas = raizes.length;

  const pontas = () =>
    [...raizes, ...ordem].filter((de) => raizes.includes(de) || contarBracos(bracos[de]) < grauMaximo);

  while (tomadas < alvo) {
    const opcoes = pontas().flatMap((de) =>
      LADOS.flatMap((lado) => {
        const para = vizinho(grade, de, lado);
        return para >= 0 && dono[para] < 0 ? [{ de, para, lado }] : [];
      }),
    );
    if (opcoes.length === 0) break;
    const { de, para, lado } = opcoes[sortear(0, opcoes.length - 1, rng)];
    dono[para] = dono[de];
    if (!raizes.includes(de)) bracos[de] |= bit(lado);
    bracos[para] |= bit(oposto(lado));
    ordem.push(para);
    tomadas++;
  }
  return { bracos, dono, ordem };
}

// A fábrica precisa de dois fios: um segundo fio, vizinho e da mesma rede, passa a apontar para ela.
function criarFabrica(grade: Grade, pecas: Peca[], dono: number[], casa: number, rng: Rng) {
  const ladosLivres = embaralhar(LADOS, rng).filter((lado) => {
    const outro = vizinho(grade, casa, lado);
    return outro >= 0 && ehFio(pecas[outro]) && dono[outro] === dono[casa] && !(pecas[outro].bracos & bit(oposto(lado)));
  });
  if (ladosLivres.length === 0) return false;
  const outro = vizinho(grade, casa, ladosLivres[0]);
  pecas[outro].bracos |= bit(oposto(ladosLivres[0]));
  pecas[casa].tipo = "fabrica";
  return true;
}

function montarPecas(grade: Grade, config: Config, rng: Rng) {
  const total = grade.colunas * grade.linhas;
  const raizes = embaralhar(Array.from({ length: total }, (_, i) => i), rng).slice(0, 1 + config.baterias);
  const { bracos, dono, ordem } = bracosDaRede(grade, config, raizes, rng);

  const pecas: Peca[] = bracos.map((valor, indice) => {
    if (raizes[0] === indice) return { tipo: "usina", bracos: 0, carga: 0 };
    if (raizes.includes(indice)) return { tipo: "bateria", bracos: 0, carga: 0 };
    if (dono[indice] < 0) return { tipo: "vazio", bracos: 0, carga: 0 };
    return contarBracos(valor) === 1
      ? { tipo: "casa", bracos: 0, carga: 0 }
      : { tipo: "fio", bracos: valor, carga: 0 };
  });
  // A casa precisa de um fio: colada na fonte, ela não entraria no quebra-cabeça.
  const colada = pecas.some((peca, indice) => {
    if (!ehCasa(peca)) return false;
    const lado = LADOS.find((l) => bracos[indice] & bit(l))!;
    const pai = vizinho(grade, indice, lado);
    return raizes.includes(pai);
  });
  if (colada) return null;

  const casas = embaralhar(pecas.flatMap((peca, i) => (peca.tipo === "casa" && dono[i] === 0 ? [i] : [])), rng);
  let faltam = config.fabricas;
  for (const casa of casas) {
    if (faltam === 0) break;
    if (criarFabrica(grade, pecas, dono, casa, rng)) faltam--;
  }
  if (faltam > 0) return null;

  for (const [i, raiz] of raizes.slice(1).entries()) {
    pecas[raiz].carga = pecas.filter((peca, indice) => ehCasa(peca) && dono[indice] === i + 1).length;
    if (pecas[raiz].carga < 2) return null;
  }
  return { pecas, ordem: ordem.filter((indice) => ehFio(pecas[indice])) };
}

// A fase nasce de uma rede já ligada, e só depois os fios são embaralhados: sempre tem solução.
export function gerarFase(fase: number, rng: Rng = Math.random): Mapa {
  const config = configDaFase(fase);
  const { colunas, linhas, casas, folga } = config;
  for (;;) {
    const montada = montarPecas({ colunas, linhas }, config, rng);
    if (!montada) continue;
    const { pecas, ordem } = montada;
    const quantas = pecas.filter(ehCasa).length;
    if (quantas < casas[0] || quantas > casas[1]) continue;

    const inicio = pecas.map((peca) => (ehFio(peca) ? sortear(0, 3, rng) : 0));
    const menor = pecas.reduce((soma, peca, indice) => soma + toquesAteCerto(peca, inicio[indice]), 0);
    const mapa = {
      colunas,
      linhas,
      pecas,
      inicio,
      ordem,
      menor,
      toques: fase <= ULTIMA_FASE_MANSA ? null : menor + Math.max(4, Math.ceil(menor * folga)),
    };
    if (menor < Math.max(2, ordem.length / 2) || completa(mapa, inicio)) continue;
    return mapa;
  }
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const mapa = gerarFase(fase, rng);
  return { fase, vidas, pontos, mapa, giros: mapa.inicio, gastos: 0, limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

function passarDeFase({ fase, vidas, pontos, gastos, limpa, mapa }: Estado, rng: Rng) {
  const perfeita = limpa && gastos <= mapa.menor;
  return novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + fase * (perfeita ? 15 : 10), rng);
}

export const toquesRestantes = ({ mapa, gastos }: Estado) => (mapa.toques === null ? null : Math.max(0, mapa.toques - gastos));

export function girar(estado: Estado, indice: number, rng: Rng = Math.random): Jogada {
  const peca = estado.mapa.pecas[indice];
  if (!ehFio(peca) || voltaDe(peca.bracos) === 1) return { estado, resultado: "parada" };

  const giros = estado.giros.map((giro, i) => (i === indice ? (giro + 1) % 4 : giro));
  const girou = { ...estado, giros, gastos: estado.gastos + 1 };
  if (completa(estado.mapa, giros)) return { estado: passarDeFase(girou, rng), resultado: "fase", indice };
  if (toquesRestantes(girou) !== 0) return { estado: girou, resultado: "girou", indice };

  const vidas = estado.vidas - 1;
  if (vidas <= 0) return { estado: { ...girou, vidas }, resultado: "fim", indice };
  // A vila é a mesma: agora a criança já viu para onde cada fio precisa apontar.
  return { estado: { ...estado, vidas, giros: estado.mapa.inicio, gastos: 0, limpa: false }, resultado: "apagou", indice };
}

// Acerta um fio de graça, a partir da usina. Custa só o bônus.
export function dica(estado: Estado, rng: Rng = Math.random): Jogada {
  const { mapa, giros } = estado;
  const indice = mapa.ordem.find((peca) => toquesAteCerto(mapa.pecas[peca], giros[peca]) > 0)!;
  const certos = giros.map((giro, i) => (i === indice ? 0 : giro));
  const ajudado = { ...estado, giros: certos, limpa: false };
  if (completa(mapa, certos)) return { estado: passarDeFase(ajudado, rng), resultado: "fase", indice };
  return { estado: ajudado, resultado: "girou", indice };
}
