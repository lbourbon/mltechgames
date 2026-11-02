// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui a criança aprende o gesto, e servir errado não custa coração.
export const ULTIMA_FASE_MANSA = 2;
// Tudo é medido em partes de 24, que dividem certinho todos os cortes.
export const INTEIRO = 24;
export const CORTES = [2, 3, 4, 6, 8, 12];
export const SABORES = ["verde", "vermelha", "azul", "roxa"] as const;

export type Sabor = (typeof SABORES)[number];
export type Parte = { sabor: Sabor; n: number; d: number };
// resto é o sabor que cobre o que os outros não cobriram.
export type Pedido = { partes: Parte[]; resto: Sabor | null };
export type Config = {
  pedidos: number;
  sabores: number;
  // Cada molde lista os denominadores de um pedido.
  moldes: number[][];
  cortes: number[];
  // A pizza já vem cortada na medida do pedido: a criança só aprende a cobrir.
  cortada: boolean;
  resto: boolean;
  // Vale escrever 2/4 em vez de 1/2.
  equivalentes: boolean;
};
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  config: Config;
  pedidos: Pedido[];
  atual: number;
  corte: number | null;
  // Uma por fatia, com o sabor que cobre cada uma. null é só queijo.
  fatias: (Sabor | null)[];
  errosNoPedido: number;
  // Sem erro nem dica na fase, vale o bônus.
  limpa: boolean;
};
export type Conferencia = { sabor: Sabor; problema: "faltou" | "sobrou" | "nao-pediu" };
export type Resultado = "vazia" | "errado" | "fim" | "certo" | "fase";
export type Jogada = { estado: Estado; resultado: Resultado; ganhou?: number; conferencia?: Conferencia };

const FASES: Config[] = [
  { pedidos: 3, sabores: 2, moldes: [[2], [4]], cortes: CORTES, cortada: true, resto: false, equivalentes: false },
  { pedidos: 4, sabores: 2, moldes: [[3], [4], [8]], cortes: CORTES, cortada: true, resto: false, equivalentes: false },
  { pedidos: 4, sabores: 3, moldes: [[2], [3], [4], [6], [8]], cortes: CORTES, cortada: false, resto: false, equivalentes: false },
  { pedidos: 4, sabores: 3, moldes: [[4, 4], [6, 6], [8, 8]], cortes: CORTES, cortada: false, resto: false, equivalentes: false },
  // Daqui em diante, o corte precisa servir para as duas frações ao mesmo tempo.
  { pedidos: 4, sabores: 3, moldes: [[2, 4], [2, 8], [4, 8]], cortes: CORTES, cortada: false, resto: false, equivalentes: false },
  { pedidos: 4, sabores: 3, moldes: [[2, 3], [2, 6], [3, 6]], cortes: CORTES, cortada: false, resto: false, equivalentes: false },
  { pedidos: 5, sabores: 3, moldes: [[2], [3], [4], [6], [8]], cortes: CORTES, cortada: false, resto: true, equivalentes: false },
  { pedidos: 5, sabores: 4, moldes: [[2, 4, 8], [2, 3, 6], [4, 4, 8]], cortes: CORTES, cortada: false, resto: false, equivalentes: false },
  // Com um cortador só, 1/2 vira 4 fatias de 8: é o mesmo tamanho com outro nome.
  { pedidos: 5, sabores: 3, moldes: [[2, 8], [4, 8], [2, 4]], cortes: [8], cortada: true, resto: false, equivalentes: true },
  { pedidos: 5, sabores: 3, moldes: [[2, 6], [3, 6], [2, 3]], cortes: [6], cortada: true, resto: false, equivalentes: true },
  { pedidos: 6, sabores: 4, moldes: [[3, 4], [4, 6], [2, 3], [2, 4, 8]], cortes: CORTES, cortada: false, resto: true, equivalentes: true },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

const mdc = (a: number, b: number): number => (b === 0 ? a : mdc(b, a % b));
export const medida = ({ n, d }: Pick<Parte, "n" | "d">) => (INTEIRO * n) / d;

export function medidas({ partes, resto }: Pedido) {
  const quer = new Map<Sabor, number>(partes.map((parte) => [parte.sabor, medida(parte)]));
  const soma = [...quer.values()].reduce((total, valor) => total + valor, 0);
  if (resto) quer.set(resto, INTEIRO - soma);
  return quer;
}

// Os cortes em que todas as frações do pedido viram um número inteiro de fatias.
export function cortesQueServem(pedido: Pedido, cortes: number[] = CORTES) {
  const quer = [...medidas(pedido).values()];
  return cortes.filter((corte) => quer.every((valor) => valor % (INTEIRO / corte) === 0));
}

function sortearNumerador(d: number, equivalentes: boolean, rng: Rng) {
  const opcoes = Array.from({ length: d - 1 }, (_, i) => i + 1).filter((n) => equivalentes || mdc(n, d) === 1);
  return opcoes[sortear(0, opcoes.length - 1, rng)];
}

function gerarPedido(config: Config, rng: Rng): Pedido {
  for (;;) {
    const molde = config.moldes[sortear(0, config.moldes.length - 1, rng)];
    const sabores = embaralhar([...SABORES].slice(0, config.sabores), rng);
    const partes = molde.map((d, i): Parte => ({ sabor: sabores[i], n: sortearNumerador(d, config.equivalentes, rng), d }));
    const soma = partes.reduce((total, parte) => total + medida(parte), 0);
    const pedido = { partes, resto: config.resto ? sabores[molde.length] : null };
    if (soma > INTEIRO || (config.resto && soma >= INTEIRO)) continue;
    if (config.equivalentes && !config.resto && partes.every(({ n, d }) => mdc(n, d) === 1)) continue;
    if (cortesQueServem(pedido, config.cortes).length > 0) return pedido;
  }
}

const chave = ({ partes, resto }: Pedido) => `${partes.map(({ sabor, n, d }) => `${n}/${d} ${sabor}`).join("+")} ${resto}`;

export function gerarPedidos(config: Config, rng: Rng = Math.random) {
  const achados = new Map<string, Pedido>();
  while (achados.size < config.pedidos) {
    const pedido = gerarPedido(config, rng);
    achados.set(chave(pedido), pedido);
  }
  return [...achados.values()];
}

function pizzaNova({ config }: Pick<Estado, "config">, pedido: Pedido) {
  const unico = config.cortes.length === 1 ? config.cortes[0] : null;
  const corte = unico ?? (config.cortada ? Math.max(...pedido.partes.map(({ d }) => d)) : null);
  return { corte, fatias: Array.from({ length: corte ?? 0 }, (): Sabor | null => null), errosNoPedido: 0 };
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const config = configDaFase(fase);
  const pedidos = gerarPedidos(config, rng);
  return { fase, vidas, pontos, config, pedidos, atual: 0, limpa: true, ...pizzaNova({ config }, pedidos[0]) };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const pedidoAtual = ({ pedidos, atual }: Estado) => pedidos[atual];

// Cortar de novo começa uma pizza nova, de graça.
export const cortar = (estado: Estado, corte: number): Estado => ({
  ...estado,
  corte,
  fatias: Array.from({ length: corte }, () => null),
});

export const cobrir = (estado: Estado, indice: number, sabor: Sabor | null): Estado => ({
  ...estado,
  fatias: estado.fatias.map((atual, i) => (i === indice ? sabor : atual)),
});

// Quanto de cada sabor está na pizza, em partes de 24.
function naPizza({ corte, fatias }: Estado) {
  const tem = new Map<Sabor, number>();
  for (const sabor of fatias) {
    if (sabor) tem.set(sabor, (tem.get(sabor) ?? 0) + INTEIRO / corte!);
  }
  return tem;
}

// Devolve o primeiro problema da pizza, na ordem do pedido, ou null se estiver certa.
export function conferir(estado: Estado): Conferencia | null {
  const quer = medidas(pedidoAtual(estado));
  const tem = naPizza(estado);
  for (const sabor of tem.keys()) {
    if (!quer.has(sabor)) return { sabor, problema: "nao-pediu" };
  }
  for (const [sabor, valor] of quer) {
    const atual = tem.get(sabor) ?? 0;
    if (atual < valor) return { sabor, problema: "faltou" };
    if (atual > valor) return { sabor, problema: "sobrou" };
  }
  return null;
}

export function servir(estado: Estado, rng: Rng = Math.random): Jogada {
  if (!estado.fatias.some(Boolean)) return { estado, resultado: "vazia" };
  const { fase, vidas, pontos, pedidos, atual, errosNoPedido, limpa, config } = estado;
  const conferencia = conferir(estado);
  if (conferencia) {
    const restantes = fase <= ULTIMA_FASE_MANSA ? vidas : vidas - 1;
    return {
      estado: { ...estado, vidas: restantes, errosNoPedido: errosNoPedido + 1, limpa: false },
      resultado: restantes <= 0 ? "fim" : "errado",
      conferencia,
    };
  }

  const ganhou = fase * (errosNoPedido === 0 ? 3 : 1);
  if (atual + 1 < pedidos.length) {
    const proximo = { ...estado, atual: atual + 1, pontos: pontos + ganhou };
    return { estado: { ...proximo, ...pizzaNova({ config }, pedidos[atual + 1]) }, resultado: "certo", ganhou };
  }
  const total = ganhou + fase * (limpa ? 15 : 10);
  return { estado: novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + total, rng), resultado: "fase", ganhou: total };
}

// Um passo de cada vez: acerta o corte, tira uma fatia a mais ou cobre uma que falta. Custa só o bônus.
export function dica(estado: Estado): Estado {
  const pedido = pedidoAtual(estado);
  const ajudado = { ...estado, limpa: false };
  const cortes = cortesQueServem(pedido, estado.config.cortes);
  if (!estado.corte || !cortes.includes(estado.corte)) return cortar(ajudado, cortes[0]);

  const conferencia = conferir(estado);
  if (!conferencia) return estado;
  const { sabor, problema } = conferencia;
  if (problema !== "faltou") return cobrir(ajudado, estado.fatias.indexOf(sabor), null);
  const livre = estado.fatias.indexOf(null);
  if (livre >= 0) return cobrir(ajudado, livre, sabor);
  // Sem fatia livre, sobra outro sabor: abre espaço tirando o que passou da conta.
  const quer = medidas(pedido);
  const tem = naPizza(estado);
  const demais = estado.fatias.findIndex((fatia) => fatia && (tem.get(fatia) ?? 0) > (quer.get(fatia) ?? 0));
  return cobrir(ajudado, demais, null);
}
