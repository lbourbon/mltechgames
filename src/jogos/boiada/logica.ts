// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
const MAIOR_BOIADA = 999;

export type Conta = "+" | "−" | "×" | "÷";
export type Porteira = { conta: Conta; valor: number };
export type Trilha = {
  boiada: number;
  // Lado a lado na estrada. A que não foi escolhida fica no mesmo lugar para o próximo trecho.
  abertas: Porteira[];
  reserva: Porteira[];
  trechos: number;
};
export type Mapa = Trilha & { meta: number; melhor: number };
export type Estado = Trilha & { fase: number; vidas: number; pontos: number; mapa: Mapa };
export type Resultado = "fechada" | "passou" | "fase" | "faltou" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado };

const mais = (...valores: number[]) => valores.map((valor): Porteira => ({ conta: "+", valor }));
const vezes = (...valores: number[]) => valores.map((valor): Porteira => ({ conta: "×", valor }));
const menos = (...valores: number[]) => valores.map((valor): Porteira => ({ conta: "−", valor }));
const dividido = (...valores: number[]) => valores.map((valor): Porteira => ({ conta: "÷", valor }));

// Até a fase 3, escolher a maior boiada do momento vence, e a criança aprende o jogo. Depois
// disso a meta passa do que essa escolha alcança, e a ordem das porteiras é que decide.
export const ULTIMA_FASE_FACIL = 3;

// Quanto da distância até a melhor boiada a meta pede. Sobe devagar para a virada não ser um muro.
const apertoDaFase = (fase: number) => (fase <= ULTIMA_FASE_FACIL ? 0.6 : fase < 6 ? 0.3 : 0.5);

// Cada estrada usa trechos + abertas - 1 porteiras sem repetir, então toda lista tem de ser
// maior que isso para as fases não saírem sempre iguais.
export function configDaFase(fase: number) {
  if (fase === 1) return { trechos: 3, abertas: 2, inicial: [4, 6], porteiras: [...mais(5, 10, 15), ...vezes(2, 3)] };
  if (fase === 2) {
    return { trechos: 4, abertas: 2, inicial: [4, 8], porteiras: [...mais(5, 10, 15, 20), ...vezes(2, 3), ...menos(5)] };
  }
  if (fase === 3) {
    return {
      trechos: 4,
      abertas: 3,
      inicial: [6, 12],
      porteiras: [...mais(10, 15, 20), ...vezes(2, 3), ...menos(5, 8), ...dividido(2)],
    };
  }
  if (fase < 6) {
    return {
      trechos: 5,
      abertas: 3,
      inicial: [6, 12],
      porteiras: [...mais(10, 20, 30, 40), ...vezes(2, 3, 4), ...menos(8, 10), ...dividido(2)],
    };
  }
  return {
    trechos: 6,
    abertas: 3,
    inicial: [8, 16],
    porteiras: [...mais(10, 20, 30, 50), ...vezes(2, 3, 4), ...menos(10, 20), ...dividido(2, 3)],
  };
}

export function atravessar(boiada: number, { conta, valor }: Porteira) {
  if (conta === "+") return boiada + valor;
  if (conta === "−") return boiada - valor;
  if (conta === "×") return boiada * valor;
  return boiada / valor;
}

// A boiada nunca some, e divisão só com resultado exato. Uma porteira fechada hoje pode
// abrir depois que a boiada mudar.
export function abre(boiada: number, porteira: Porteira) {
  const depois = atravessar(boiada, porteira);
  return Number.isInteger(depois) && depois >= 1;
}

// A porteira usada sai da estrada, e a próxima da reserva entra no lugar dela.
function avancar<T extends Trilha>(trilha: T, indice: number): T {
  const { boiada, abertas, reserva, trechos } = trilha;
  return {
    ...trilha,
    boiada: atravessar(boiada, abertas[indice]),
    abertas: [...abertas.slice(0, indice), ...reserva.slice(0, 1), ...abertas.slice(indice + 1)],
    reserva: reserva.slice(1),
    trechos: trechos - 1,
  };
}

const cresce = ({ conta }: Porteira) => conta === "+" || conta === "×";

// Testa todos os caminhos. Devolve null se em algum deles a criança só veria porteiras de perder
// boi, o que pareceria uma fase sem saída. Soma e multiplicação nunca ficam fechadas.
function explorar(trilha: Trilha): { melhor: number; pior: number } | null {
  if (trilha.trechos === 0) return { melhor: trilha.boiada, pior: trilha.boiada };
  if (!trilha.abertas.some(cresce)) return null;
  let melhor = 0;
  let pior = Infinity;
  for (let i = 0; i < trilha.abertas.length; i++) {
    if (!abre(trilha.boiada, trilha.abertas[i])) continue;
    const caminho = explorar(avancar(trilha, i));
    if (!caminho) return null;
    melhor = Math.max(melhor, caminho.melhor);
    pior = Math.min(pior, caminho.pior);
  }
  return { melhor, pior };
}

export function maiorAgora({ boiada, abertas }: Pick<Trilha, "boiada" | "abertas">) {
  const depois = abertas.map((porteira) => (abre(boiada, porteira) ? atravessar(boiada, porteira) : 0));
  return depois.indexOf(Math.max(...depois));
}

function seguirMaiorAgora(trilha: Trilha) {
  while (trilha.trechos > 0) trilha = avancar(trilha, maiorAgora(trilha));
  return trilha.boiada;
}

// As fases são sorteadas e passam pelo verificador: só fica a estrada em que escolher importa e
// sempre há uma porteira para crescer. A meta sai da melhor boiada possível, então dá para vencer.
export function gerarFase(fase: number, rng: Rng = Math.random): Mapa {
  const { trechos, abertas, inicial, porteiras } = configDaFase(fase);
  for (;;) {
    const sorteadas = embaralhar(porteiras, rng).slice(0, trechos + abertas - 1);
    const trilha: Trilha = {
      boiada: sortear(inicial[0], inicial[1], rng),
      abertas: sorteadas.slice(0, abertas),
      reserva: sorteadas.slice(abertas),
      trechos,
    };
    const caminhos = explorar(trilha);
    if (!caminhos || caminhos.melhor > MAIOR_BOIADA) continue;

    const { melhor, pior } = caminhos;
    const maior = seguirMaiorAgora(trilha);
    const facil = fase <= ULTIMA_FASE_FACIL;
    // Sem essa folga, passar da escolha mais óbvia pediria acertar a única ordem perfeita.
    if (facil ? maior === pior : melhor < maior * 1.2) continue;

    const [piso, teto] = facil ? [pior, maior] : [maior, melhor];
    const meta = piso + Math.ceil((teto - piso) * apertoDaFase(fase));
    if (meta < trilha.boiada * 2) continue;
    return { ...trilha, melhor, meta };
  }
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const mapa = gerarFase(fase, rng);
  return { ...mapa, fase, vidas, pontos, mapa };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export function passar(estado: Estado, indice: number, rng: Rng = Math.random): Jogada {
  if (!abre(estado.boiada, estado.abertas[indice])) return { estado, resultado: "fechada" };

  const proximo = avancar(estado, indice);
  if (proximo.trechos > 0) return { estado: proximo, resultado: "passou" };

  if (proximo.boiada >= proximo.mapa.meta) {
    // Boiada no maior tamanho possível vale mais pontos, como o golpe na medida do Robô.
    const perfeita = proximo.boiada === proximo.mapa.melhor;
    const pontos = estado.pontos + estado.fase * (perfeita ? 15 : 10);
    const vidas = Math.min(estado.vidas + 1, VIDAS_INICIAIS);
    return { estado: novaFase(estado.fase + 1, vidas, pontos, rng), resultado: "fase" };
  }

  const vidas = estado.vidas - 1;
  if (vidas <= 0) return { estado: { ...proximo, vidas }, resultado: "fim" };
  // A estrada é a mesma: errar ensina, e a criança tenta de novo sabendo o que aconteceu.
  return { estado: { ...estado, ...estado.mapa, vidas }, resultado: "faltou" };
}
