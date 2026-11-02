// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";
import { ADIVINHAS, CORES, FORMAS, ITEM, ITENS, NECESSIDADES, type Charada, type Item } from "./cardapio";

export const VIDAS_INICIAIS = 3;
export const MAX_BANDEJA = 6;
// Desta fase em diante, o chefão esconde um "não" no fim do pedido.
const FASE_DO_NAO = 7;
const FASE_DOS_NUMEROS = 4;
// A fase 1 não tem painel de novidades: a dica vem antes, para o chute não custar a partida.
const erroQueTrazDica = (fase: number) => (fase === 1 ? 1 : 2);
const CHANCE_DO_TIPO_NOVO = 0.6;

export type Tipo =
  | "palavra"
  | "pedido"
  | "numero"
  | "cor"
  | "dois"
  | "nao"
  | "ordem"
  | "muda"
  | "precisa"
  | "adivinha";
export type ConfigFase = {
  // O primeiro é a novidade da fase, e aparece mais que os outros.
  tipos: Tipo[];
  // O último pedido é sempre o do chefão.
  pedidos: number;
  prateleira: number;
};
// aceita tem mais de um item quando várias coisas resolvem, como qualquer bebida para a sede.
export type Linha = { aceita: string[]; quantos: number };
export type Pedido = {
  tipo: Tipo | "chefao";
  frase: string;
  linhas: Linha[];
  emOrdem: boolean;
  // Citados na frase sem que ele queira. Ficam na prateleira, ou seriam só enfeite.
  armadilhas: string[];
};
export type Estado = {
  fase: number;
  // Pedido atual dentro da fase, a partir de 0.
  numero: number;
  vidas: number;
  pontos: number;
  sequencia: number;
  pedido: Pedido;
  prateleira: string[];
  bandeja: string[];
  // O que a criança errou volta nos próximos pedidos.
  reforco: string[];
  // O que já foi pedido nesta fase, para variar.
  vistos: string[];
  erros: number;
  dica: boolean;
};
export type Resultado = "certo" | "fase" | "faltou" | "errou" | "ordem" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado; sobraram: string[] };

type Rascunho = Pick<Pedido, "frase" | "linhas"> & Partial<Pick<Pedido, "emOrdem" | "armadilhas">>;
type Sorteio = Pick<Estado, "fase" | "reforco" | "vistos"> & { rng: Rng };
type Base = Pick<Estado, "fase" | "numero" | "vidas" | "pontos" | "sequencia" | "reforco" | "vistos">;

const TODOS: Tipo[] = ["adivinha", "precisa", "muda", "ordem", "nao", "dois", "cor", "numero"];

const FASES: ConfigFase[] = [
  { tipos: ["palavra"], pedidos: 4, prateleira: 4 },
  { tipos: ["pedido"], pedidos: 5, prateleira: 6 },
  { tipos: ["pedido"], pedidos: 5, prateleira: 6 },
  { tipos: ["numero", "pedido"], pedidos: 5, prateleira: 6 },
  { tipos: ["cor", "numero"], pedidos: 5, prateleira: 8 },
  { tipos: ["dois", "cor", "numero"], pedidos: 6, prateleira: 8 },
  { tipos: ["nao", "dois"], pedidos: 6, prateleira: 8 },
  { tipos: ["ordem", "nao"], pedidos: 6, prateleira: 8 },
  { tipos: ["muda", "ordem"], pedidos: 6, prateleira: 8 },
  { tipos: ["precisa", "muda"], pedidos: 6, prateleira: 8 },
  { tipos: ["adivinha", "precisa"], pedidos: 6, prateleira: 8 },
  { tipos: TODOS, pedidos: 7, prateleira: 8 },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

const um = <T>(lista: readonly T[], rng: Rng) => lista[sortear(0, lista.length - 1, rng)];
const maiuscula = (texto: string) => texto[0].toUpperCase() + texto.slice(1);
const unir = (...listas: string[][]) => [...new Set(listas.flat())];
const contavel = (item: Item) => item.plural !== undefined;
const conhecidos = (fase: number) => ITENS.filter((item) => item.fase <= fase);
const comuns = (fase: number) => conhecidos(fase).filter((item) => !item.cor);

const comArtigo = (item: Item) => `${item.artigo} ${item.en}`;
const noPlural = (item: Item) => item.plural ?? item.en;
const quantidade = (item: Item, quantos: number) =>
  quantos > 1 ? `${["", "", "two", "three"][quantos]} ${noPlural(item)}` : comArtigo(item);
const linha = (item: Item, quantos = 1): Linha => ({ aceita: [item.id], quantos });

function lista(partes: string[]) {
  return `${partes.slice(0, -1).join(", ")} and ${partes.at(-1)}`;
}

const PEDIDOS = [
  (o: string) => `${maiuscula(o)}, please.`,
  (o: string) => `I want ${o}.`,
  (o: string) => `Can I have ${o}?`,
  (o: string) => `Give me ${o}, please.`,
  (o: string) => `I would like ${o}.`,
];

// Primeiro o que falta reforçar, depois as palavras novas da fase e só então o que ainda não saiu.
function escolher(pool: Item[], { fase, reforco, vistos, rng }: Sorteio, fora: string[] = []) {
  const livres = pool.filter((item) => !fora.includes(item.id));
  const reforcar = livres.filter((item) => reforco.includes(item.id));
  const novos = livres.filter((item) => item.fase === fase && !vistos.includes(item.id));
  const frescos = livres.filter((item) => !vistos.includes(item.id));
  return um([reforcar, novos, frescos, livres].find((grupo) => grupo.length > 0)!, rng);
}

// A armadilha é da mesma família do pedido: maçã contra pera engana mais que maçã contra meia.
function escolherParecido(item: Item, s: Sorteio) {
  const parecidos = comuns(s.fase).filter((outro) => outro.grupo === item.grupo && outro.id !== item.id);
  return escolher(parecidos.length ? parecidos : comuns(s.fase), s, [item.id]);
}

function deCharada(charadas: Charada[], s: Sorteio): Rascunho {
  const conhecidas = charadas
    .map(({ frase, aceita }) => ({ frase, aceita: aceita.filter((id) => ITEM[id].fase <= s.fase) }))
    .filter(({ aceita }) => aceita.length > 0);
  const reforcar = conhecidas.filter(({ aceita }) => aceita.some((id) => s.reforco.includes(id)));
  const novas = conhecidas.filter(({ frase }) => !s.vistos.includes(frase));
  const { frase, aceita } = um([reforcar, novas, conhecidas].find((grupo) => grupo.length > 0)!, s.rng);
  return { frase, linhas: [{ aceita, quantos: 1 }] };
}

const GERADORES: Record<Tipo, (s: Sorteio) => Rascunho> = {
  palavra(s) {
    const item = escolher(comuns(s.fase), s);
    return { frase: `${maiuscula(item.en)}!`, linhas: [linha(item)] };
  },
  pedido(s) {
    const item = escolher(comuns(s.fase), s);
    return { frase: um(PEDIDOS, s.rng)(comArtigo(item)), linhas: [linha(item)] };
  },
  numero(s) {
    const item = escolher(comuns(s.fase).filter(contavel), s);
    const quantos = sortear(2, 3, s.rng);
    return { frase: um(PEDIDOS, s.rng)(quantidade(item, quantos)), linhas: [linha(item, quantos)] };
  },
  cor(s) {
    const item = escolher(conhecidos(s.fase).filter((outro) => outro.cor), s);
    return { frase: um(PEDIDOS, s.rng)(comArtigo(item)), linhas: [linha(item)] };
  },
  dois(s) {
    const primeiro = escolher(comuns(s.fase), s);
    const segundo = escolher(comuns(s.fase), s, [primeiro.id]);
    const quantos = contavel(segundo) ? sortear(1, 2, s.rng) : 1;
    const partes = [comArtigo(primeiro), quantidade(segundo, quantos)];
    return {
      frase: um(PEDIDOS, s.rng)(lista(partes)),
      linhas: [linha(primeiro), linha(segundo, quantos)],
    };
  },
  nao(s) {
    const item = escolher(comuns(s.fase), s);
    const recusa = escolherParecido(item, s);
    const frases = [
      `No ${noPlural(recusa)}! I want ${comArtigo(item)}.`,
      `I don't want ${noPlural(recusa)}. Give me ${comArtigo(item)}, please.`,
      `${maiuscula(comArtigo(item))}, please. No ${noPlural(recusa)}!`,
    ];
    return { frase: um(frases, s.rng), linhas: [linha(item)], armadilhas: [recusa.id] };
  },
  ordem(s) {
    const primeiro = escolher(comuns(s.fase), s);
    const depois = escolher(comuns(s.fase), s, [primeiro.id]);
    const frases = [
      `First the ${primeiro.en}, then the ${depois.en}.`,
      `The ${primeiro.en} first, then the ${depois.en}.`,
      `I want the ${depois.en} after the ${primeiro.en}.`,
    ];
    return { frase: um(frases, s.rng), linhas: [linha(primeiro), linha(depois)], emOrdem: true };
  },
  muda(s) {
    const item = escolher(comuns(s.fase), s);
    const desistiu = escolherParecido(item, s);
    const frases = [
      `${maiuscula(comArtigo(desistiu))}, please... No, wait! ${maiuscula(comArtigo(item))}!`,
      `I want ${comArtigo(desistiu)}. Hmm... no! ${maiuscula(comArtigo(item))}, please.`,
    ];
    return { frase: um(frases, s.rng), linhas: [linha(item)], armadilhas: [desistiu.id] };
  },
  precisa: (s) => deCharada(NECESSIDADES, s),
  adivinha: (s) => deCharada(ADIVINHAS, s),
};

// O chefão fecha cada fase com um pedido comprido. Só um item vem em quantidade, para caber na bandeja.
function pedidoDoChefao(s: Sorteio): Rascunho {
  const { fase } = s;
  const tamanho = fase < 4 ? 2 : fase < 8 ? 3 : 4;
  const itens: Item[] = [];
  while (itens.length < tamanho) {
    itens.push(escolher(conhecidos(fase), s, itens.map((item) => item.id)));
  }
  if (fase === 1) {
    return { frase: itens.map((item) => `${maiuscula(item.en)}!`).join(" "), linhas: itens.map((item) => linha(item)) };
  }
  const cresce = fase >= FASE_DOS_NUMEROS ? itens.find(contavel) : undefined;
  const quantos = (item: Item) => (item === cresce ? sortear(2, 3, s.rng) : 1);
  const pedidos = itens.map((item) => ({ item, quantos: quantos(item) }));
  const frase = `${maiuscula(lista(pedidos.map(({ item, quantos }) => quantidade(item, quantos))))}, please.`;
  const linhas = pedidos.map(({ item, quantos }) => linha(item, quantos));
  if (fase < FASE_DO_NAO) return { frase, linhas };

  const recusa = escolher(comuns(fase), s, itens.map((item) => item.id));
  return { frase: `${frase} No ${noPlural(recusa)}!`, linhas, armadilhas: [recusa.id] };
}

function sortearTipo(tipos: Tipo[], numero: number, rng: Rng) {
  if (numero === 0 || tipos.length === 1 || rng() < CHANCE_DO_TIPO_NOVO) return tipos[0];
  return um(tipos.slice(1), rng);
}

function novoPedido(s: Sorteio, numero: number): Pedido {
  const { tipos, pedidos } = configDaFase(s.fase);
  const tipo = numero === pedidos - 1 ? "chefao" : sortearTipo(tipos, numero, s.rng);
  const rascunho = tipo === "chefao" ? pedidoDoChefao(s) : GERADORES[tipo](s);
  return { emOrdem: false, armadilhas: [], ...rascunho, tipo };
}

const idsDoPedido = (pedido: Pedido) => pedido.linhas.flatMap((linha) => linha.aceita);

// Sempre traz uma das respostas certas e as armadilhas. O resto é sorteado entre o que a
// criança já viu, metade da mesma família do pedido, onde a confusão é mais provável.
function montarPrateleira(pedido: Pedido, fase: number, rng: Rng) {
  const { prateleira } = configDaFase(fase);
  const certos = pedido.linhas.map(({ aceita }) => um(aceita, rng));
  const fixos = unir(certos, pedido.armadilhas);
  const ocupados = unir(fixos, idsDoPedido(pedido));
  const outros = embaralhar(conhecidos(fase).filter((item) => !ocupados.includes(item.id)), rng);
  const vagas = prateleira - fixos.length;
  const parecidos = outros.filter((item) => item.grupo === ITEM[certos[0]].grupo).slice(0, Math.ceil(vagas / 2));
  const resto = outros.filter((item) => !parecidos.includes(item));
  const extras = [...parecidos, ...resto].slice(0, vagas).map((item) => item.id);
  return embaralhar([...fixos, ...extras], rng);
}

function atender(base: Base, rng: Rng): Estado {
  const pedido = novoPedido({ ...base, rng }, base.numero);
  return {
    ...base,
    pedido,
    prateleira: montarPrateleira(pedido, base.fase, rng),
    bandeja: [],
    vistos: unir(base.vistos, idsDoPedido(pedido), [pedido.frase]),
    erros: 0,
    dica: false,
  };
}

export function novoJogo(fase = 1, rng: Rng = Math.random): Estado {
  return atender(
    { fase, numero: 0, vidas: VIDAS_INICIAIS, pontos: 0, sequencia: 0, reforco: [], vistos: [] },
    rng,
  );
}

export function colocar(estado: Estado, id: string): Estado {
  if (estado.bandeja.length >= MAX_BANDEJA) return estado;
  return { ...estado, bandeja: [...estado.bandeja, id] };
}

export function tirar(estado: Estado, indice: number): Estado {
  return { ...estado, bandeja: estado.bandeja.filter((_, i) => i !== indice) };
}

export function conferir(pedido: Pedido, bandeja: string[]) {
  const faltam = pedido.linhas.map(({ quantos }) => quantos);
  const sobram = bandeja.flatMap((id, i) => {
    const onde = pedido.linhas.findIndex(({ aceita }, l) => aceita.includes(id) && faltam[l] > 0);
    if (onde < 0) return [i];
    faltam[onde]--;
    return [];
  });
  const completo = faltam.every((quantos) => quantos === 0);
  const emOrdem = !pedido.emOrdem || bandeja.every((id, i) => pedido.linhas[i]?.aceita.includes(id));
  return { sobram, completo, emOrdem };
}

// Perder o coração nunca muda o pedido: o que estava certo fica na bandeja para ser consertado.
function errar(estado: Estado, resultado: Resultado, bandeja: string[], sobraram: string[]): Jogada {
  const vidas = estado.vidas - 1;
  const erros = estado.erros + 1;
  return {
    estado: {
      ...estado,
      vidas,
      bandeja,
      erros,
      sequencia: 0,
      dica: estado.dica || erros >= erroQueTrazDica(estado.fase),
      reforco: unir(estado.reforco, idsDoPedido(estado.pedido)),
    },
    resultado: vidas > 0 ? resultado : "fim",
    sobraram,
  };
}

function acertar(estado: Estado, rng: Rng): Jogada {
  const { fase, numero, pedido, erros, dica } = estado;
  const perfeito = erros === 0 && !dica;
  const sequencia = perfeito ? estado.sequencia + 1 : 0;
  const bonus = perfeito ? Math.min(sequencia, 5) * 5 : 0;
  const pontos = estado.pontos + (10 + fase * 5) * (pedido.tipo === "chefao" ? 2 : 1) + bonus;
  const pedidos = idsDoPedido(pedido);
  const reforco = estado.reforco.filter((id) => !pedidos.includes(id));
  const subiu = numero + 1 >= configDaFase(fase).pedidos;
  const base: Base = subiu
    ? { fase: fase + 1, numero: 0, vidas: VIDAS_INICIAIS, pontos, sequencia, reforco, vistos: [] }
    : { ...estado, numero: numero + 1, pontos, sequencia, reforco };
  return { estado: atender(base, rng), resultado: subiu ? "fase" : "certo", sobraram: [] };
}

export function servir(estado: Estado, rng: Rng = Math.random): Jogada {
  const { sobram, completo, emOrdem } = conferir(estado.pedido, estado.bandeja);
  if (sobram.length > 0) {
    const ficam = estado.bandeja.filter((_, i) => !sobram.includes(i));
    return errar(estado, "errou", ficam, sobram.map((i) => estado.bandeja[i]));
  }
  // Faltar não custa nada: o que está na bandeja estava certo.
  if (!completo) return { estado, resultado: "faltou", sobraram: [] };
  if (!emOrdem) return errar(estado, "ordem", [], []);
  return acertar(estado, rng);
}

// A dica mostra o desenho do pedido, para não precisar de tradução. Só custa o bônus.
export const usarDica = (estado: Estado): Estado => ({ ...estado, dica: true });

// O que chega na cozinha nesta fase. As cores vêm com uma forma cada, em vez de todas as combinações.
export function novidades(fase: number) {
  const novos = ITENS.filter((item) => item.fase === fase);
  if (!novos.some((item) => item.cor)) return novos;
  return (Object.keys(CORES) as (keyof typeof CORES)[]).map((cor, i) => ITEM[`${cor} ${FORMAS[i % FORMAS.length]}`]);
}

// Cada fase passada deixa um enfeite, calculado da fase para não guardar nenhum dado novo.
const ENFEITES = ["🪴", "🎈", "🖼️", "🌻", "🎀", "🏮", "🎉", "🧁", "⭐", "🎏", "🌈", "👑"];

export const enfeites = (fase: number) => ENFEITES.slice(0, Math.max(0, fase - 1));
export const enfeiteNovo = (fase: number) => ENFEITES[fase - 2];
