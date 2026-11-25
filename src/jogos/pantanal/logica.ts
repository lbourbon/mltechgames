// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui um ano que não fecha volta sem custar coração.
export const ULTIMA_FASE_MANSA = 2;

export const ESPECIES = ["capim", "capivara", "onca", "peixe", "garca", "jacare"] as const;
export type Especie = (typeof ESPECIES)[number];
export type Bando = Record<Especie, number>;
export type Estacao = "cheia" | "seca";

// Só os bichos contam no fim do ano: o capim e os peixes voltam sozinhos.
export const BICHOS: readonly Especie[] = ["capivara", "onca", "garca", "jacare"];

export const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// A cheia do Pantanal vem com as chuvas, de novembro a abril. De maio a outubro é a seca.
export const estacaoDoMes = (mes: number): Estacao => (mes % 12 >= 4 && mes % 12 <= 9 ? "seca" : "cheia");

// O que nasce sozinho a cada mês. Na cheia o capim brota e os peixes se espalham para
// desovar; na seca o capim quase para e nenhum peixe nasce.
export const CRESCE: Record<Estacao, { capim: number; peixe: number }> = {
  cheia: { capim: 3, peixe: 3 },
  seca: { capim: 1, peixe: 0 },
};
// O pasto e a lagoa têm tamanho: passando disso, não cabe mais.
export const MAXIMO = { capim: 12, peixe: 12 };

// Cada carta traz um grupo no começo do mês. O capim é plantado, os bichos chegam.
export type Carta = { especie: Especie; quantos: number };

export const vazio = (): Bando => ({ capim: 0, capivara: 0, onca: 0, peixe: 0, garca: 0, jacare: 0 });

// O que aconteceu no mês, na ordem, para a tela animar. Ninguém morre em cena: quem fica
// sem comida vai embora.
export type Evento =
  | { tipo: "chegou"; especie: Especie; quantos: number }
  | { tipo: "cresceu"; especie: "capim" | "peixe"; quantos: number }
  | { tipo: "comeu"; quem: Especie; comida: Especie; quantos: number }
  | { tipo: "saiu"; especie: Especie; quantos: number }
  | { tipo: "nasceu"; especie: Especie; quantos: number };

export type Mes = { bando: Bando; eventos: Evento[] };

// Um mês inteiro, na ordem em que a tela conta:
// 1. a carta chega; 2. o capim e os peixes crescem; 3. cada capivara come 1 capim;
// 4. cada jacaré e depois cada garça come 1 peixe; 5. cada onça come 1 capivara ou, sem
// capivara, 1 jacaré; 6. com 2 ou mais capivaras, nasce 1 filhote.
// Quem não acha o que comer vai embora.
export function passarMes(antes: Bando, estacao: Estacao, carta: Carta | null): Mes {
  const bando = { ...antes };
  const eventos: Evento[] = [];

  if (carta) {
    const teto = carta.especie === "capim" || carta.especie === "peixe" ? MAXIMO[carta.especie] : Infinity;
    const quantos = Math.min(carta.quantos, teto - bando[carta.especie]);
    bando[carta.especie] += quantos;
    eventos.push({ tipo: "chegou", especie: carta.especie, quantos });
  }

  for (const especie of ["capim", "peixe"] as const) {
    const quantos = Math.min(CRESCE[estacao][especie], MAXIMO[especie] - bando[especie]);
    if (quantos > 0) {
      bando[especie] += quantos;
      eventos.push({ tipo: "cresceu", especie, quantos });
    }
  }

  function comer(quem: Especie, comida: Especie) {
    if (bando[quem] === 0) return;
    const comeram = Math.min(bando[quem], bando[comida]);
    if (comeram > 0) {
      bando[comida] -= comeram;
      eventos.push({ tipo: "comeu", quem, comida, quantos: comeram });
    }
    const saem = bando[quem] - comeram;
    if (saem > 0) {
      bando[quem] -= saem;
      eventos.push({ tipo: "saiu", especie: quem, quantos: saem });
    }
  }

  comer("capivara", "capim");
  comer("jacare", "peixe");
  comer("garca", "peixe");

  // A onça prefere capivara. Só caça jacaré quando não sobrou nenhuma.
  if (bando.onca > 0) {
    const capivaras = Math.min(bando.onca, bando.capivara);
    if (capivaras > 0) {
      bando.capivara -= capivaras;
      eventos.push({ tipo: "comeu", quem: "onca", comida: "capivara", quantos: capivaras });
    }
    const jacares = Math.min(bando.onca - capivaras, bando.jacare);
    if (jacares > 0) {
      bando.jacare -= jacares;
      eventos.push({ tipo: "comeu", quem: "onca", comida: "jacare", quantos: jacares });
    }
    const saem = bando.onca - capivaras - jacares;
    if (saem > 0) {
      bando.onca -= saem;
      eventos.push({ tipo: "saiu", especie: "onca", quantos: saem });
    }
  }

  if (bando.capivara >= 2) {
    bando.capivara += 1;
    eventos.push({ tipo: "nasceu", especie: "capivara", quantos: 1 });
  }

  return { bando, eventos };
}

export type Fase = {
  // Mês em que o ano da fase começa (0 é janeiro) e quantos meses ele tem.
  inicio: number;
  meses: number;
  // Quantos de cada bicho precisam estar lá depois do último mês.
  metas: Partial<Record<Especie, number>>;
  comeco: Bando;
  // Uma carta por mês, em qualquer ordem.
  mao: Carta[];
};

export const mesesDa = ({ inicio, meses }: Fase) => Array.from({ length: meses }, (_, i) => (inicio + i) % 12);

export const especiesDa = (fase: Fase) => Object.keys(fase.metas) as Especie[];

export const fechou = (fase: Fase, bando: Bando) =>
  especiesDa(fase).every((especie) => bando[especie] >= fase.metas[especie]!);

// Quem saiu e não tem mais carta para voltar deixa o ano perdido antes do fim.
export function semVolta(fase: Fase, bando: Bando, restantes: Carta[]) {
  return especiesDa(fase).filter(
    (especie) => bando[especie] === 0 && !restantes.some((carta) => carta.especie === especie),
  );
}

const chaveDaCarta = ({ especie, quantos }: Carta) => `${especie}${quantos}`;
const chaveDoBando = (bando: Bando) => ESPECIES.map((especie) => bando[especie]).join(",");

// Conta quantas ordens diferentes da mão fecham o ano, e quantas existem. Cartas iguais
// trocadas de lugar são a mesma ordem.
export function contarOrdens(fase: Fase) {
  const meses = mesesDa(fase);
  const memo = new Map<string, { vencem: number; total: number }>();

  function explorar(mes: number, bando: Bando, restantes: Carta[]): { vencem: number; total: number } {
    if (restantes.length === 0) return { vencem: fechou(fase, bando) ? 1 : 0, total: 1 };
    const chave = `${mes}|${chaveDoBando(bando)}|${restantes.map(chaveDaCarta).sort().join(" ")}`;
    const guardado = memo.get(chave);
    if (guardado) return guardado;
    const soma = { vencem: 0, total: 0 };
    const vistas = new Set<string>();
    restantes.forEach((carta, i) => {
      if (vistas.has(chaveDaCarta(carta))) return;
      vistas.add(chaveDaCarta(carta));
      const resto = restantes.filter((_, j) => j !== i);
      const { bando: depois } = passarMes(bando, estacaoDoMes(meses[mes]), carta);
      const parcial = explorar(mes + 1, depois, resto);
      soma.vencem += parcial.vencem;
      soma.total += parcial.total;
    });
    memo.set(chave, soma);
    return soma;
  }

  return explorar(0, fase.comeco, fase.mao);
}

// Quem come quem, de baixo para cima: é a ordem de quem só pensa "comida primeiro".
const NIVEL: Record<Especie, number> = { capim: 0, peixe: 0, capivara: 1, garca: 1, jacare: 1, onca: 2 };
const ORDEM_DAS_ESPECIES = Object.fromEntries(ESPECIES.map((especie, i) => [especie, i])) as Record<Especie, number>;
const porNivel = (a: Carta, b: Carta) =>
  NIVEL[a.especie] - NIVEL[b.especie] || ORDEM_DAS_ESPECIES[a.especie] - ORDEM_DAS_ESPECIES[b.especie];
export const deBaixoParaCima = (mao: Carta[]) => [...mao].sort(porNivel);
export const deCimaParaBaixo = (mao: Carta[]) => [...mao].sort((a, b) => porNivel(b, a));

// Joga uma ordem inteira e devolve como o bando ficou mês a mês.
export function jogarOrdem(fase: Fase, ordem: Carta[]) {
  const meses = mesesDa(fase);
  let bando = fase.comeco;
  const historia = [bando];
  ordem.forEach((carta, i) => {
    bando = passarMes(bando, estacaoDoMes(meses[i]), carta).bando;
    historia.push(bando);
  });
  return { bando, historia, venceu: fechou(fase, bando) };
}

// Quanto cada carta traz.
export const QUANTOS: Record<Especie, number> = { capim: 4, peixe: 4, capivara: 2, onca: 1, garca: 2, jacare: 1 };

type Faixa = [number, number];
type Config = {
  // A meta de cada bicho no fim do ano. Sem faixa, basta um.
  metas: Partial<Record<Especie, Faixa>>;
  // Quantas cartas de cada tipo. A mão tem uma carta por mês, então ela decide o tamanho do ano.
  cartas: Partial<Record<Especie, Faixa>>;
  comeco: Partial<Record<Especie, Faixa>>;
  // A parte das ordens possíveis que fecha o ano. Abaixo do teto, chutar a ordem não funciona.
  vencem: Faixa;
  // A ordem "comida primeiro, caçador por último" e a contrária não podem fechar o ano.
  ingenua: boolean;
  // A espécie que a fase apresenta, que precisa aparecer na mão.
  novidade?: Especie;
};

const FASES: Config[] = [
  { metas: { capivara: [4, 6] }, cartas: { capivara: [1, 2], capim: [2, 2] }, comeco: { capim: [0, 2], capivara: [1, 3] }, vencem: [0.2, 0.8], ingenua: false },
  { metas: { capivara: [1, 1], onca: [1, 1] }, cartas: { capivara: [2, 2], onca: [1, 1], capim: [2, 2] }, comeco: { capim: [2, 6] }, vencem: [0.15, 0.7], ingenua: false, novidade: "onca" },
  { metas: { capivara: [1, 1], onca: [1, 1] }, cartas: { capivara: [2, 3], onca: [2, 2], capim: [2, 2] }, comeco: { capim: [2, 6], capivara: [0, 2] }, vencem: [0.05, 0.35], ingenua: true },
  { metas: { garca: [1, 1], jacare: [1, 1] }, cartas: { garca: [2, 2], jacare: [2, 2], peixe: [1, 2] }, comeco: { peixe: [2, 6], capim: [4, 8] }, vencem: [0.05, 0.4], ingenua: true, novidade: "garca" },
  { metas: { capivara: [1, 1], onca: [1, 1], jacare: [1, 1] }, cartas: { capivara: [2, 2], onca: [2, 2], jacare: [2, 2], peixe: [1, 1], capim: [1, 1] }, comeco: { capim: [3, 7], peixe: [3, 7] }, vencem: [0.04, 0.3], ingenua: true },
  { metas: { capivara: [1, 1], onca: [1, 1], garca: [1, 1], jacare: [1, 1] }, cartas: { capivara: [2, 2], onca: [1, 2], garca: [1, 2], jacare: [1, 1], peixe: [1, 1], capim: [1, 2] }, comeco: { capim: [3, 8], peixe: [3, 8] }, vencem: [0.03, 0.25], ingenua: true },
  { metas: { capivara: [1, 1], onca: [1, 1], garca: [1, 1], jacare: [1, 1] }, cartas: { capivara: [2, 3], onca: [2, 2], garca: [2, 2], jacare: [1, 1], peixe: [1, 1], capim: [1, 2] }, comeco: { capim: [3, 8], peixe: [3, 8] }, vencem: [0.02, 0.2], ingenua: true },
  { metas: { capivara: [1, 1], onca: [1, 1], garca: [1, 1], jacare: [1, 1] }, cartas: { capivara: [3, 3], onca: [2, 2], garca: [2, 2], jacare: [2, 2], peixe: [1, 2], capim: [1, 2] }, comeco: { capim: [3, 8], peixe: [3, 8] }, vencem: [0.02, 0.15], ingenua: true },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

export function sortearFase(config: Config, rng: Rng): Fase {
  const mao: Carta[] = [];
  for (const [especie, [de, ate]] of Object.entries(config.cartas) as [Especie, Faixa][]) {
    const vezes = sortear(de, ate, rng);
    for (let i = 0; i < vezes; i++) mao.push({ especie, quantos: QUANTOS[especie] });
  }
  const comeco = vazio();
  for (const [especie, [de, ate]] of Object.entries(config.comeco) as [Especie, Faixa][]) comeco[especie] = sortear(de, ate, rng);
  const metas: Fase["metas"] = {};
  for (const [especie, [de, ate]] of Object.entries(config.metas) as [Especie, Faixa][]) metas[especie] = sortear(de, ate, rng);
  return { inicio: sortear(0, 11, rng), meses: mao.length, metas, comeco, mao: embaralhar(mao, rng) };
}

// Contar todas as ordens de um ano inteiro leva segundos. Ordens sorteadas ao acaso dão a
// mesma parte com folga, num instante.
const AMOSTRA = 400;
export function estimarVitorias(fase: Fase, rng: Rng) {
  let vencem = 0;
  for (let i = 0; i < AMOSTRA; i++) if (jogarOrdem(fase, embaralhar(fase.mao, rng)).venceu) vencem++;
  return vencem / AMOSTRA;
}

// Toda fase passa pelo verificador: tem solução, chutar a ordem quase nunca dá certo e, depois
// das primeiras, pensar só em "comida primeiro" também não basta.
export function gerarFase(fase: number, rng: Rng = Math.random): Fase {
  const config = configDaFase(fase);
  for (;;) {
    const candidata = sortearFase(config, rng);
    if (config.novidade && !candidata.mao.some((carta) => carta.especie === config.novidade)) continue;
    if (config.ingenua) {
      if (jogarOrdem(candidata, deBaixoParaCima(candidata.mao)).venceu) continue;
      if (jogarOrdem(candidata, deCimaParaBaixo(candidata.mao)).venceu) continue;
    }
    // Uma vitória na amostra já prova que a fase tem solução.
    const parte = estimarVitorias(candidata, rng);
    if (parte >= config.vencem[0] && parte <= config.vencem[1]) return candidata;
  }
}

// Uma ordem que fecha o ano, achada por busca. É a dica e a prova de que a fase tem solução.
export function resolver(fase: Fase): Carta[] | null {
  const meses = mesesDa(fase);
  const falhas = new Set<string>();

  function buscar(mes: number, bando: Bando, restantes: Carta[]): Carta[] | null {
    if (restantes.length === 0) return fechou(fase, bando) ? [] : null;
    if (semVolta(fase, bando, restantes).length > 0) return null;
    const chave = `${mes}|${chaveDoBando(bando)}|${restantes.map(chaveDaCarta).sort().join(" ")}`;
    if (falhas.has(chave)) return null;
    const vistas = new Set<string>();
    for (const [i, carta] of restantes.entries()) {
      if (vistas.has(chaveDaCarta(carta))) continue;
      vistas.add(chaveDaCarta(carta));
      const depois = passarMes(bando, estacaoDoMes(meses[mes]), carta).bando;
      const resto = buscar(mes + 1, depois, restantes.filter((_, j) => j !== i));
      if (resto) return [carta, ...resto];
    }
    falhas.add(chave);
    return null;
  }

  return buscar(0, fase.comeco, fase.mao);
}

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  mapa: Fase;
  // Quantos meses já passaram, o bando de agora e as cartas que ainda estão na mão.
  mes: number;
  bando: Bando;
  mao: Carta[];
  // O bando no começo e depois de cada mês, para o gráfico.
  historia: Bando[];
  // O ano que não fechou da última tentativa, que fica no gráfico como referência.
  anterior: Bando[] | null;
  // Sem ano perdido nem dica, vale o bônus.
  limpa: boolean;
};

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  return recomecar({ fase, vidas, pontos, mapa: gerarFase(fase, rng), mes: 0, bando: vazio(), mao: [], historia: [], anterior: null, limpa: true });
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

// O mesmo ano, do primeiro mês, com a mão cheia.
export const recomecar = (estado: Estado): Estado => ({
  ...estado,
  mes: 0,
  bando: estado.mapa.comeco,
  mao: estado.mapa.mao,
  historia: [estado.mapa.comeco],
});

export const estacaoAgora = ({ mapa, mes }: Estado) => estacaoDoMes(mesesDa(mapa)[mes]);

export type Resultado = "mes" | "fase" | "perdeu" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado; eventos: Evento[]; bando: Bando; faltam: Especie[] };

export const pontosDaFase = (fase: number, limpa: boolean) => fase * (limpa ? 15 : 10);

// A carta da mão chega, o mês passa e o ano termina quando a mão acaba ou quando alguém que
// precisa ficar foi embora sem carta para voltar.
export function jogar(estado: Estado, indiceDaCarta: number, rng: Rng = Math.random): Jogada {
  const carta = estado.mao[indiceDaCarta];
  const { bando, eventos } = passarMes(estado.bando, estacaoAgora(estado), carta);
  const mao = estado.mao.filter((_, i) => i !== indiceDaCarta);
  const depois: Estado = { ...estado, mes: estado.mes + 1, bando, mao, historia: [...estado.historia, bando] };

  const semComoVoltar = semVolta(estado.mapa, bando, mao);
  const acabou = mao.length === 0;
  if (!acabou && semComoVoltar.length === 0) return { estado: depois, resultado: "mes", eventos, bando, faltam: [] };

  if (acabou && fechou(estado.mapa, bando)) {
    const { fase, vidas, pontos, limpa } = estado;
    const proxima = novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + pontosDaFase(fase, limpa), rng);
    return { estado: proxima, resultado: "fase", eventos, bando, faltam: [] };
  }

  // Quando o ano acaba antes, só conta quem não tem como voltar.
  const faltam = acabou
    ? especiesDa(estado.mapa).filter((especie) => bando[especie] < estado.mapa.metas[especie]!)
    : semComoVoltar;
  const vidas = estado.fase > ULTIMA_FASE_MANSA ? estado.vidas - 1 : estado.vidas;
  const perdido = recomecar({ ...depois, vidas, limpa: false, anterior: depois.historia });
  return { estado: perdido, resultado: vidas <= 0 ? "fim" : "perdeu", eventos, bando, faltam };
}

// A carta que fecha o ano a partir de agora, ou -1 se este ano não fecha mais. Custa o bônus.
export function cartaDaDica(estado: Estado) {
  const { mapa, mes, bando, mao } = estado;
  const resto: Fase = { ...mapa, inicio: (mapa.inicio + mes) % 12, meses: mao.length, comeco: bando, mao };
  const ordem = resolver(resto);
  if (!ordem) return -1;
  return mao.findIndex((carta) => carta.especie === ordem[0].especie && carta.quantos === ordem[0].quantos);
}
