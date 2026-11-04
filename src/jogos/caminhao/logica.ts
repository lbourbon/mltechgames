// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";
import { CARGAS, ESTADOS, SIGLAS, type Sigla } from "./estados";

export const VIDAS_INICIAIS = 3;
// Até aqui ficar sem combustível só faz recomeçar a viagem.
export const ULTIMA_FASE_MANSA = 2;

export type Pedido = { emoji: string; nome: string; de: Sigla; para: Sigla };
// Cada pedido espera na origem, viaja no caminhão e termina entregue.
export type Situacao = "esperando" | "levando" | "entregue";
export type Viagem = {
  inicio: Sigla;
  pedidos: Pedido[];
  // Estados gastos pela melhor rota, e o tanque da fase.
  menor: number;
  tanque: number;
};
// Como a fase mostra os lugares: com sigla no mapa ou sem nada, e o pedido pelo estado ou pela capital.
export type Pista = { siglas: boolean; marcas: boolean; capital: boolean; siglaNoPedido: boolean };
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  viagem: Viagem;
  posicao: Sigla;
  combustivel: number;
  situacao: Situacao[];
  // Por onde o caminhão já passou nesta fase, para pintar o mapa.
  visitados: Sigla[];
  // A dica mostra no mapa onde pegar e onde entregar.
  dica: boolean;
  // Sem ficar sem combustível nem pedir dica, vale o bônus.
  limpa: boolean;
};
export type Resultado = "longe" | "parado" | "andou" | "pegou" | "entregou" | "fase" | "seco" | "fim";
export type Jogada = {
  estado: Estado;
  resultado: Resultado;
  // O que aconteceu na chegada, para a tela comemorar.
  pegou: number[];
  entregou: number[];
};

type Config = {
  pedidos: number;
  // O primeiro pedido já sai de onde o caminhão está.
  comecaNaOrigem: boolean;
  menor: [number, number];
  folga: number;
  pista: Pista;
  // Fazer os pedidos na ordem da lista, um de cada vez, não cabe no tanque: é preciso planejar.
  planejar: boolean;
};

const COM_SIGLA: Pista = { siglas: true, marcas: true, capital: false, siglaNoPedido: true };
const SO_SIGLA: Pista = { siglas: true, marcas: false, capital: false, siglaNoPedido: false };
const SEM_NADA: Pista = { siglas: false, marcas: false, capital: false, siglaNoPedido: false };
const CAPITAL: Pista = { siglas: false, marcas: false, capital: true, siglaNoPedido: false };

const FASES: Config[] = [
  { pedidos: 1, comecaNaOrigem: true, menor: [2, 3], folga: 3, pista: COM_SIGLA, planejar: false },
  { pedidos: 1, comecaNaOrigem: true, menor: [3, 5], folga: 2, pista: COM_SIGLA, planejar: false },
  { pedidos: 1, comecaNaOrigem: false, menor: [4, 6], folga: 2, pista: COM_SIGLA, planejar: false },
  { pedidos: 2, comecaNaOrigem: true, menor: [5, 8], folga: 2, pista: SO_SIGLA, planejar: false },
  { pedidos: 2, comecaNaOrigem: false, menor: [6, 9], folga: 2, pista: SO_SIGLA, planejar: false },
  { pedidos: 2, comecaNaOrigem: true, menor: [5, 8], folga: 2, pista: SEM_NADA, planejar: false },
  { pedidos: 2, comecaNaOrigem: false, menor: [6, 10], folga: 1, pista: SEM_NADA, planejar: true },
  { pedidos: 2, comecaNaOrigem: true, menor: [6, 10], folga: 1, pista: CAPITAL, planejar: true },
  { pedidos: 3, comecaNaOrigem: false, menor: [8, 12], folga: 1, pista: CAPITAL, planejar: true },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];
export const pistaDaFase = (fase: number) => configDaFase(fase).pista;

export const vizinhos = (a: Sigla, b: Sigla) => ESTADOS[a].vizinhos.includes(b);

// Estados entre a e b, contando só os passos.
export function distancia(a: Sigla, b: Sigla) {
  const passos = new Map<Sigla, number>([[a, 0]]);
  const fila: Sigla[] = [a];
  while (fila.length > 0) {
    const atual = fila.shift()!;
    if (atual === b) return passos.get(atual)!;
    for (const vizinho of ESTADOS[atual].vizinhos) {
      if (passos.has(vizinho)) continue;
      passos.set(vizinho, passos.get(atual)! + 1);
      fila.push(vizinho);
    }
  }
  return Infinity;
}

// Ao chegar num estado, entrega o que leva para ali e pega o que espera ali.
function chegar(pedidos: Pedido[], situacao: Situacao[], onde: Sigla) {
  const pegou: number[] = [];
  const entregou: number[] = [];
  const depois = situacao.map((s, i) => {
    if (s === "levando" && pedidos[i].para === onde) {
      entregou.push(i);
      return "entregue";
    }
    if (s === "esperando" && pedidos[i].de === onde) {
      // Pegou e o destino é ali mesmo não acontece: a origem nunca é o destino.
      pegou.push(i);
      return "levando";
    }
    return s;
  });
  return { situacao: depois as Situacao[], pegou, entregou };
}

const situacaoInicial = (viagem: Pick<Viagem, "inicio" | "pedidos">) =>
  chegar(viagem.pedidos, viagem.pedidos.map(() => "esperando"), viagem.inicio).situacao;

const chaveDe = (onde: Sigla, situacao: Situacao[]) => `${onde}|${situacao.join(",")}`;

// O menor número de estados até entregar tudo, saindo de onde está. Busca em largura sobre o
// lugar do caminhão e a situação de cada pedido.
export function menorRota(pedidos: Pedido[], onde: Sigla, situacao: Situacao[]) {
  const vistos = new Set([chaveDe(onde, situacao)]);
  let camada: { onde: Sigla; situacao: Situacao[] }[] = [{ onde, situacao }];
  for (let passos = 0; camada.length > 0; passos++) {
    const proxima: typeof camada = [];
    for (const atual of camada) {
      if (atual.situacao.every((s) => s === "entregue")) return passos;
      for (const vizinho of ESTADOS[atual.onde].vizinhos) {
        const { situacao: depois } = chegar(pedidos, atual.situacao, vizinho);
        const chave = chaveDe(vizinho, depois);
        if (vistos.has(chave)) continue;
        vistos.add(chave);
        proxima.push({ onde: vizinho, situacao: depois });
      }
    }
    camada = proxima;
  }
  return Infinity;
}

// Quem faz um pedido de cada vez, na ordem da lista: vai pegar, vai entregar, passa ao próximo.
export function rotaEmOrdem({ inicio, pedidos }: Pick<Viagem, "inicio" | "pedidos">) {
  let onde = inicio;
  let total = 0;
  for (const { de, para } of pedidos) {
    total += distancia(onde, de) + distancia(de, para);
    onde = para;
  }
  return total;
}

export function gerarViagem(fase: number, rng: Rng = Math.random): Viagem {
  const config = configDaFase(fase);
  for (let tentativa = 0; tentativa < 5000; tentativa++) {
    const cargas = embaralhar(CARGAS, rng).slice(0, config.pedidos);
    const pedidos = cargas.map(({ emoji, nome, de }) => {
      const destinos = SIGLAS.filter((s) => s !== de);
      return { emoji, nome, de, para: destinos[sortear(0, destinos.length - 1, rng)] };
    });
    // Dois pedidos para o mesmo lugar, ou um que sai de onde outro chega, deixam a fase confusa.
    const lugares = pedidos.flatMap((p) => [p.de, p.para]);
    if (new Set(lugares).size < lugares.length) continue;
    const outros = SIGLAS.filter((s) => !lugares.includes(s));
    const inicio = config.comecaNaOrigem ? pedidos[0].de : outros[sortear(0, outros.length - 1, rng)];
    const viagem = { inicio, pedidos };
    const menor = menorRota(pedidos, inicio, situacaoInicial(viagem));
    if (menor < config.menor[0] || menor > config.menor[1]) continue;
    const tanque = menor + config.folga;
    if (config.planejar && rotaEmOrdem(viagem) <= tanque) continue;
    return { ...viagem, menor, tanque };
  }
  throw new Error(`Nenhuma viagem para a fase ${fase}`);
}

function comecarViagem(viagem: Viagem) {
  return {
    posicao: viagem.inicio,
    combustivel: viagem.tanque,
    situacao: situacaoInicial(viagem),
    visitados: [viagem.inicio],
  };
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const viagem = gerarViagem(fase, rng);
  return { fase, vidas, pontos, viagem, ...comecarViagem(viagem), dica: false, limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const bonusDaFase = (fase: number, limpa: boolean) => fase * (limpa ? 15 : 10);

// Ainda dá para entregar tudo com o que sobrou no tanque?
export const daParaChegar = ({ viagem, posicao, situacao, combustivel }: Estado) =>
  menorRota(viagem.pedidos, posicao, situacao) <= combustivel;

export function andar(estado: Estado, destino: Sigla, rng: Rng = Math.random): Jogada {
  const nada = { pegou: [], entregou: [] };
  if (destino === estado.posicao) return { estado, resultado: "parado", ...nada };
  if (!vizinhos(estado.posicao, destino)) return { estado, resultado: "longe", ...nada };

  const { viagem } = estado;
  const chegada = chegar(viagem.pedidos, estado.situacao, destino);
  const andou: Estado = {
    ...estado,
    posicao: destino,
    combustivel: estado.combustivel - 1,
    situacao: chegada.situacao,
    visitados: estado.visitados.includes(destino) ? estado.visitados : [...estado.visitados, destino],
  };
  const { pegou, entregou } = chegada;

  if (andou.situacao.every((s) => s === "entregue")) {
    const { fase, vidas, pontos, limpa } = andou;
    const proxima = novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + bonusDaFase(fase, limpa), rng);
    return { estado: proxima, resultado: "fase", pegou, entregou };
  }
  if (daParaChegar(andou)) {
    const resultado = entregou.length > 0 ? "entregou" : pegou.length > 0 ? "pegou" : "andou";
    return { estado: andou, resultado, pegou, entregou };
  }

  // O tanque não dá mais para terminar: a viagem recomeça, e depois das fases mansas custa um coração.
  const vidas = estado.fase <= ULTIMA_FASE_MANSA ? estado.vidas : estado.vidas - 1;
  if (vidas <= 0) return { estado: { ...andou, vidas }, resultado: "fim", pegou, entregou };
  return { estado: { ...estado, ...comecarViagem(viagem), vidas, limpa: false }, resultado: "seco", pegou, entregou };
}

// Mostra no mapa onde pegar e onde entregar até o fim da fase. Custa só o bônus.
export const pedirDica = (estado: Estado): Estado => ({ ...estado, dica: true, limpa: false });
