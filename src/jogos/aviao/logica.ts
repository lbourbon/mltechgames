// Regras do jogo, sem DOM, para serem testadas com Vitest. Quem mede a distância entre o toque e
// o país é o jogo.ts, com o desenho do mapa: aqui ela chega pronta, em unidades do mapa.
import { embaralhar, type Rng } from "../kit/sorteio";
import { capitalDe, type Id } from "./paises";
import { REGIOES, type RegiaoId } from "./regioes";

export const VIDAS_INICIAIS = 3;
// Até aqui um pouso longe não custa coração.
export const ULTIMA_FASE_MANSA = 2;
export const CARTAS_POR_FASE = 5;

// Pontos de uma carta. Dentro do país vale o máximo, e perto dele vale menos quanto mais longe.
export const PONTOS_NA_MOSCA = 10;
export const PONTOS_PERTO = 7;
// Até onde, em unidades do mapa, um pouso ainda vale pontos. Todo mapa tem 1000 de largura.
export const RAIO_DOS_PONTOS = 150;

// O avião dá a volta ao mundo três vezes, uma região por fase, e cada volta tira uma ajuda.
export const ORDEM: RegiaoId[] = ["america-do-sul", "america-do-norte", "europa", "africa", "oriente-medio", "asia", "oceania"];

// Como a fase mostra os países: com o nome no mapa ou não, e o pedido pelo nome, pela bandeira
// ou pela capital.
export type Pista = { nomes: boolean; pedido: "nome" | "bandeira" | "capital" };
type Config = { regiao: RegiaoId; pista: Pista };

const NOMES_NO_MAPA: Pista = { nomes: true, pedido: "nome" };
const NOMES: Pista = { nomes: false, pedido: "nome" };
const BANDEIRAS: Pista = { nomes: false, pedido: "bandeira" };
const CAPITAIS: Pista = { nomes: false, pedido: "capital" };

const volta = (pista: Pista): Config[] => ORDEM.map((regiao) => ({ regiao, pista }));

const FASES: Config[] = [
  // A primeira fase ensina o toque, com os nomes no mapa. Começa em casa, na América do Sul.
  { regiao: "america-do-sul", pista: NOMES_NO_MAPA },
  ...volta(NOMES),
  ...volta(BANDEIRAS),
  ...volta(CAPITAIS),
];
// Depois da terceira volta, ela se repete.
export const ULTIMA_FASE_FIXA = FASES.length;

export const configDaFase = (fase: number): Config =>
  fase <= FASES.length ? FASES[fase - 1] : FASES[FASES.length - ORDEM.length + ((fase - FASES.length - 1) % ORDEM.length)];
export const pistaDaFase = (fase: number) => configDaFase(fase).pista;
export const paisesDa = (regiao: RegiaoId): Id[] => REGIOES[regiao].paises;

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  regiao: RegiaoId;
  // Destinos das cartas da fase, em ordem, e qual é a da vez.
  cartas: Id[];
  vez: number;
  // Países já mostrados no mapa nesta fase, que viram referência para as próximas cartas.
  revelados: Id[];
  // Pontos ganhos nesta fase, para a tela de fim de fase.
  daFase: number;
};
export type Pouso = "na-mosca" | "perto" | "longe";
export type Jogada = {
  estado: Estado;
  pouso: Pouso;
  pontos: number;
  // O que vem depois da entrega.
  seguinte: "carta" | "fase" | "fim";
};

// Sorteia os destinos da fase. Quando o pedido fala da capital, só entram países com uma
// capital só e sem disputa.
export function sortearCartas(fase: number, rng: Rng = Math.random): Id[] {
  const { regiao, pista } = configDaFase(fase);
  const candidatos = paisesDa(regiao).filter((id) => pista.pedido !== "capital" || capitalDe(id));
  return embaralhar(candidatos, rng).slice(0, CARTAS_POR_FASE);
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  return { fase, vidas, pontos, regiao: configDaFase(fase).regiao, cartas: sortearCartas(fase, rng), vez: 0, revelados: [], daFase: 0 };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const destino = (estado: Estado) => estado.cartas[estado.vez];

// Quanto vale um pouso, pela distância até a borda do país certo.
export function avaliar(dentro: boolean, distancia: number): { pouso: Pouso; pontos: number } {
  if (dentro) return { pouso: "na-mosca", pontos: PONTOS_NA_MOSCA };
  if (distancia > RAIO_DOS_PONTOS) return { pouso: "longe", pontos: 0 };
  return { pouso: "perto", pontos: Math.max(1, Math.round(PONTOS_PERTO * (1 - distancia / RAIO_DOS_PONTOS))) };
}

// Entrega a carta da vez. A carta sempre chega, porque depois de um erro o avião voa até o país
// certo. Pousar longe custa um coração depois das fases mansas.
export function entregar(estado: Estado, dentro: boolean, distancia: number, rng: Rng = Math.random): Jogada {
  const { pouso, pontos } = avaliar(dentro, distancia);
  const vidas = pouso === "longe" && estado.fase > ULTIMA_FASE_MANSA ? estado.vidas - 1 : estado.vidas;
  const depois: Estado = {
    ...estado,
    vidas,
    pontos: estado.pontos + pontos,
    daFase: estado.daFase + pontos,
    vez: estado.vez + 1,
    revelados: [...estado.revelados, destino(estado)],
  };
  if (vidas <= 0) return { estado: depois, pouso, pontos, seguinte: "fim" };
  if (depois.vez < depois.cartas.length) return { estado: depois, pouso, pontos, seguinte: "carta" };
  const proxima = novaFase(estado.fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), depois.pontos, rng);
  return { estado: proxima, pouso, pontos, seguinte: "fase" };
}
