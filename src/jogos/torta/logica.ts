// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui soltar quem as pistas ainda não livram é de graça.
export const ULTIMA_FASE_MANSA = 2;

export const BICHOS = ["gato", "cachorro", "coelho", "urso"] as const;
export const ROUPAS = ["vermelha", "azul", "amarela", "verde"] as const;
export const ACESSORIOS = ["chapeu", "oculos", "lenco"] as const;

export type Bicho = (typeof BICHOS)[number];
export type Roupa = (typeof ROUPAS)[number];
export type Acessorio = (typeof ACESSORIOS)[number];
export type Suspeito = { bicho: Bicho; roupa: Roupa; chapeu: boolean; oculos: boolean; lenco: boolean; alto: boolean };

// Uma característica de um suspeito só.
export type Atomo =
  | { tipo: "bicho"; valor: Bicho }
  | { tipo: "roupa"; valor: Roupa }
  | { tipo: "acessorio"; valor: Acessorio }
  | { tipo: "altura"; alto: boolean };

export type Pista =
  | { tipo: "simples"; atomo: Atomo; nao: boolean }
  // naoB vira "A, mas não B".
  | { tipo: "e"; a: Atomo; b: Atomo; naoB: boolean }
  // Só sai quando ninguém da fila tem as duas coisas, senão o "ou" ficaria ambíguo.
  | { tipo: "ou"; a: Atomo; b: Atomo }
  | { tipo: "ponta"; nao: boolean }
  | { tipo: "vizinho"; atomo: Atomo; nao: boolean };

export type TipoDePista = "simples" | "negacao" | "e" | "ou" | "ponta" | "vizinho";

export type Caso = {
  fila: Suspeito[];
  culpado: number;
  // As pistas chegam em etapas: a próxima só aparece quando a criança solta todo mundo que as anteriores livram.
  etapas: Pista[][];
};

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  caso: Caso;
  etapa: number;
  soltos: boolean[];
  // Sem nenhum erro, vale o bônus.
  limpa: boolean;
};

export type Resultado = "solto" | "etapa" | "fase" | "cedo" | "errou" | "fim" | "parado";
export type Jogada = { estado: Estado; resultado: Resultado };

type Config = {
  suspeitos: number;
  // Quantas pistas chegam juntas em cada etapa.
  etapas: number[];
  tipos: TipoDePista[];
  // O tipo que a fase estreia precisa aparecer no caso.
  novidade?: TipoDePista;
  // Cada etapa precisa de ao menos uma pista destes tipos.
  dificeis?: TipoDePista[];
};

const SIMPLES: TipoDePista[] = ["simples"];
const COM_NAO: TipoDePista[] = ["simples", "negacao"];
const COM_E: TipoDePista[] = [...COM_NAO, "e"];
const COM_OU: TipoDePista[] = [...COM_E, "ou"];
const TODOS: TipoDePista[] = [...COM_OU, "ponta", "vizinho"];
const DIFICEIS: TipoDePista[] = ["negacao", "e", "ou", "vizinho"];

const FASES: Config[] = [
  { suspeitos: 4, etapas: [1, 1], tipos: SIMPLES },
  { suspeitos: 5, etapas: [1, 1], tipos: COM_NAO, novidade: "negacao" },
  { suspeitos: 5, etapas: [1, 1, 1], tipos: COM_NAO, dificeis: ["negacao"] },
  { suspeitos: 6, etapas: [1, 1, 1], tipos: COM_E, novidade: "e" },
  { suspeitos: 6, etapas: [1, 1, 1], tipos: COM_OU, novidade: "ou" },
  { suspeitos: 6, etapas: [1, 1, 1], tipos: TODOS, novidade: "vizinho" },
  { suspeitos: 6, etapas: [2, 1], tipos: TODOS, dificeis: DIFICEIS },
  { suspeitos: 6, etapas: [2, 2], tipos: TODOS, dificeis: DIFICEIS },
  { suspeitos: 6, etapas: [3, 2], tipos: TODOS, dificeis: DIFICEIS },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

export function vale(atomo: Atomo, s: Suspeito) {
  if (atomo.tipo === "bicho") return s.bicho === atomo.valor;
  if (atomo.tipo === "roupa") return s.roupa === atomo.valor;
  if (atomo.tipo === "acessorio") return s[atomo.valor];
  return s.alto === atomo.alto;
}

const vizinhos = (fila: Suspeito[], i: number) => [fila[i - 1], fila[i + 1]].filter((s) => s !== undefined);

// A pista vale para o suspeito da posição i? Quem não confere com alguma pista é inocente.
export function confere(pista: Pista, fila: Suspeito[], i: number): boolean {
  const s = fila[i];
  switch (pista.tipo) {
    case "simples":
      return vale(pista.atomo, s) !== pista.nao;
    case "e":
      return vale(pista.a, s) && vale(pista.b, s) !== pista.naoB;
    case "ou":
      return vale(pista.a, s) || vale(pista.b, s);
    case "ponta":
      return (i === 0 || i === fila.length - 1) !== pista.nao;
    case "vizinho":
      return vizinhos(fila, i).some((v) => vale(pista.atomo, v)) !== pista.nao;
  }
}

export const tipoDaPista = (pista: Pista): TipoDePista =>
  pista.tipo === "simples" ? (pista.nao ? "negacao" : "simples") : pista.tipo;

// Texto -----------------------------------------------------------------------------------------

const NOME_DO_ACESSORIO: Record<Acessorio, string> = { chapeu: "chapéu", oculos: "óculos", lenco: "lenço" };

function predicado(atomo: Atomo, nao = false) {
  const n = nao ? "não " : "";
  if (atomo.tipo === "bicho") return `${n}é um ${atomo.valor}`;
  if (atomo.tipo === "roupa") return `${n}está de roupa ${atomo.valor}`;
  if (atomo.tipo === "acessorio") return `${n}usa ${NOME_DO_ACESSORIO[atomo.valor]}`;
  return atomo.alto ? "é alto" : "é baixinho";
}

function alguem(atomo: Atomo, nao: boolean) {
  if (atomo.tipo === "bicho") return `${nao ? "nenhum" : "um"} ${atomo.valor}`;
  const quem = nao ? "ninguém" : "alguém";
  if (atomo.tipo === "roupa") return `${quem} de roupa ${atomo.valor}`;
  if (atomo.tipo === "acessorio") return `${quem} de ${NOME_DO_ACESSORIO[atomo.valor]}`;
  return `${quem} ${atomo.alto ? "alto" : "baixinho"}`;
}

// "é um gato ou um coelho" soa melhor que "é um gato ou é um coelho".
function ou(a: Atomo, b: Atomo) {
  if (a.tipo === "bicho" && b.tipo === "bicho") return `é um ${a.valor} ou um ${b.valor}`;
  if (a.tipo === "roupa" && b.tipo === "roupa") return `está de roupa ${a.valor} ou ${b.valor}`;
  if (a.tipo === "acessorio" && b.tipo === "acessorio") {
    return `usa ${NOME_DO_ACESSORIO[a.valor]} ou ${NOME_DO_ACESSORIO[b.valor]}`;
  }
  return `${predicado(a)} ou ${predicado(b)}`;
}

function e(a: Atomo, b: Atomo, naoB: boolean) {
  if (naoB) return `${predicado(a)}, mas ${predicado(b, true)}`;
  if (a.tipo === "acessorio" && b.tipo === "acessorio") {
    return `usa ${NOME_DO_ACESSORIO[a.valor]} e ${NOME_DO_ACESSORIO[b.valor]}`;
  }
  return `${predicado(a)} e ${predicado(b)}`;
}

// A pista sem o começo, para o caderninho, que escreve "Quem comeu a torta..." uma vez só.
export function restoDaPista(pista: Pista) {
  return (() => {
    switch (pista.tipo) {
      case "simples":
        return predicado(pista.atomo, pista.nao);
      case "e":
        return e(pista.a, pista.b, pista.naoB);
      case "ou":
        return ou(pista.a, pista.b);
      case "ponta":
        return pista.nao ? "não estava em nenhuma ponta da fila" : "estava em uma das pontas da fila";
      case "vizinho":
        return `${pista.nao ? "não " : ""}estava ao lado de ${alguem(pista.atomo, pista.nao)}`;
    }
  })();
}

export const textoDaPista = (pista: Pista) => `Quem comeu a torta ${restoDaPista(pista)}.`;

// Geração ---------------------------------------------------------------------------------------

const ATOMOS: Atomo[] = [
  ...BICHOS.map((valor) => ({ tipo: "bicho", valor }) as const),
  ...ROUPAS.map((valor) => ({ tipo: "roupa", valor }) as const),
  ...ACESSORIOS.map((valor) => ({ tipo: "acessorio", valor }) as const),
  { tipo: "altura", alto: true },
  { tipo: "altura", alto: false },
];
// Altura não entra no "ao lado" nem no "não": "não é alto" é só "é baixinho".
const ATOMOS_NEGAVEIS = ATOMOS.filter((a) => a.tipo !== "altura");

const mesmaCategoria = (a: Atomo, b: Atomo) => a.tipo === b.tipo;

function todasAsPistas(tipos: TipoDePista[], fila: Suspeito[]): Pista[] {
  const pistas: Pista[] = [];
  if (tipos.includes("simples")) ATOMOS.forEach((atomo) => pistas.push({ tipo: "simples", atomo, nao: false }));
  if (tipos.includes("negacao")) ATOMOS_NEGAVEIS.forEach((atomo) => pistas.push({ tipo: "simples", atomo, nao: true }));
  if (tipos.includes("e")) {
    for (const a of ATOMOS) {
      for (const b of ATOMOS_NEGAVEIS) {
        if (mesmaCategoria(a, b)) continue;
        pistas.push({ tipo: "e", a, b, naoB: false }, { tipo: "e", a, b, naoB: true });
      }
    }
  }
  if (tipos.includes("ou")) {
    ATOMOS_NEGAVEIS.forEach((a, i) =>
      ATOMOS_NEGAVEIS.slice(i + 1).forEach((b) => {
        if (!fila.some((s) => vale(a, s) && vale(b, s))) pistas.push({ tipo: "ou", a, b });
      }),
    );
  }
  if (tipos.includes("ponta")) pistas.push({ tipo: "ponta", nao: false }, { tipo: "ponta", nao: true });
  if (tipos.includes("vizinho")) {
    ATOMOS_NEGAVEIS.forEach((atomo) => pistas.push({ tipo: "vizinho", atomo, nao: false }, { tipo: "vizinho", atomo, nao: true }));
  }
  return pistas;
}

const sortearDe = <T>(lista: readonly T[], rng: Rng) => lista[sortear(0, lista.length - 1, rng)];

function gerarSuspeito(rng: Rng): Suspeito {
  return {
    bicho: sortearDe(BICHOS, rng),
    roupa: sortearDe(ROUPAS, rng),
    chapeu: rng() < 0.5,
    oculos: rng() < 0.45,
    lenco: rng() < 0.4,
    alto: rng() < 0.5,
  };
}

const chave = (s: Suspeito) => JSON.stringify(s);

function gerarFila(quantos: number, rng: Rng) {
  const fila: Suspeito[] = [];
  while (fila.length < quantos) {
    const novo = gerarSuspeito(rng);
    // Dois iguais confundiriam a vista, mesmo com pistas de posição.
    if (!fila.some((s) => chave(s) === chave(novo))) fila.push(novo);
  }
  return fila;
}

// Tudo o que a pista p livra na fila a pista q também livra: p não acrescenta nada.
const contida = (p: Pista, q: Pista, fila: Suspeito[]) => fila.every((_, i) => confere(p, fila, i) || !confere(q, fila, i));

const livra = (pista: Pista, fila: Suspeito[], restantes: number[]) => restantes.filter((i) => !confere(pista, fila, i));

// Escolhe as pistas de uma etapa: cada uma livra alguém que ainda está na fila, e só a última
// etapa livra todos.
function escolherEtapa(candidatas: Pista[], fila: Suspeito[], restantes: number[], quantas: number, config: Config, ultima: boolean, rng: Rng) {
  const uteis = candidatas.filter((p) => livra(p, fila, restantes).length > 0);
  if (uteis.length < quantas) return null;
  for (let tentativa = 0; tentativa < 40; tentativa++) {
    const escolhidas = embaralhar(uteis, rng).slice(0, quantas);
    // Prefere pistas em que uma não diz o mesmo que a outra, como "verde ou vermelha" e "verde".
    if (tentativa < 30 && escolhidas.some((p, i) => escolhidas.some((q, j) => i !== j && contida(p, q, fila)))) continue;
    if (config.dificeis && !escolhidas.some((p) => config.dificeis!.includes(tipoDaPista(p)))) continue;
    const sobram = restantes.filter((i) => escolhidas.every((p) => confere(p, fila, i)));
    if (ultima ? sobram.length === 0 : sobram.length > 0) return { escolhidas, sobram };
  }
  return null;
}

export function gerarCaso(fase: number, rng: Rng = Math.random): Caso {
  const config = configDaFase(fase);
  for (let tentativa = 0; tentativa < 20_000; tentativa++) {
    const fila = gerarFila(config.suspeitos, rng);
    const culpado = sortear(0, fila.length - 1, rng);
    const candidatas = todasAsPistas(config.tipos, fila).filter((p) => confere(p, fila, culpado));
    let restantes = fila.map((_, i) => i).filter((i) => i !== culpado);
    const etapas: Pista[][] = [];
    for (const [etapa, quantas] of config.etapas.entries()) {
      const usadas = new Set(etapas.flat().map((p) => JSON.stringify(p)));
      const livres = candidatas.filter((p) => !usadas.has(JSON.stringify(p)));
      const escolha = escolherEtapa(livres, fila, restantes, quantas, config, etapa === config.etapas.length - 1, rng);
      if (!escolha) break;
      etapas.push(escolha.escolhidas);
      restantes = escolha.sobram;
    }
    if (etapas.length < config.etapas.length) continue;
    if (config.novidade && !etapas.flat().some((p) => tipoDaPista(p) === config.novidade)) continue;
    return { fila, culpado, etapas };
  }
  throw new Error(`Nenhum caso para a fase ${fase}`);
}

// Partida ---------------------------------------------------------------------------------------

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const caso = gerarCaso(fase, rng);
  return { fase, vidas, pontos, caso, etapa: 0, soltos: caso.fila.map(() => false), limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const pistasVisiveis = ({ caso, etapa }: Pick<Estado, "caso" | "etapa">) => caso.etapas.slice(0, etapa + 1).flat();

// As pistas à vista provam que o suspeito i é inocente?
export const inocentado = (estado: Pick<Estado, "caso" | "etapa">, i: number) =>
  pistasVisiveis(estado).some((p) => !confere(p, estado.caso.fila, i));

// Quem as pistas à vista livram e ainda está na fila.
export const faltamSoltar = (estado: Estado) =>
  estado.caso.fila.flatMap((_, i) => (!estado.soltos[i] && inocentado(estado, i) ? [i] : []));

export const ultimaEtapa = ({ caso, etapa }: Pick<Estado, "caso" | "etapa">) => etapa === caso.etapas.length - 1;

export const bonusDaFase = (fase: number, limpa: boolean) => fase * (limpa ? 15 : 10);

export function soltar(estado: Estado, i: number, rng: Rng = Math.random): Jogada {
  if (estado.soltos[i]) return { estado, resultado: "parado" };
  if (!inocentado(estado, i)) {
    if (estado.fase <= ULTIMA_FASE_MANSA) return { estado: { ...estado, limpa: false }, resultado: "cedo" };
    const vidas = estado.vidas - 1;
    const errado = { ...estado, vidas, limpa: false };
    return { estado: errado, resultado: vidas <= 0 ? "fim" : "errou" };
  }

  const soltos = estado.soltos.map((solto, j) => solto || j === i);
  const depois = { ...estado, soltos };
  if (faltamSoltar(depois).length > 0) return { estado: depois, resultado: "solto" };
  if (!ultimaEtapa(depois)) return { estado: { ...depois, etapa: depois.etapa + 1 }, resultado: "etapa" };

  const { fase, vidas, pontos, limpa } = depois;
  return {
    estado: novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + bonusDaFase(fase, limpa), rng),
    resultado: "fase",
  };
}
