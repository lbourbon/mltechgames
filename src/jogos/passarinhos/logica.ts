// Regras do jogo, sem DOM, para serem testadas com Vitest.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";

export const VIDAS_INICIAIS = 3;
// Até aqui cantar errado é de graça.
export const ULTIMA_FASE_MANSA = 2;

// Frequência de cada fio, do mais baixo (0) ao mais alto. Com poucos fios as notas ficam longe
// umas das outras, fáceis de separar. Nunca há oitava, que soa como a mesma nota.
const ESCALAS: Record<number, number[]> = {
  2: [262, 392],
  3: [262, 330, 392],
  4: [262, 330, 392, 440],
  5: [262, 294, 330, 392, 440],
};

// null é uma pausa: a coluna fica em silêncio.
export type Nota = number | null;
export type Cancao = { notas: Nota[] };
// Onde a criança pôs o passarinho de cada coluna: num fio, no chão (quieto, é a pausa) ou ainda
// em lugar nenhum (null).
export type Pouso = number | "chao" | null;
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  cancao: Cancao;
  pousos: Pouso[];
  // Colunas que saíram erradas no último canto, até a criança mexer nelas.
  confusos: boolean[];
  // Sem nenhum canto errado, vale o bônus.
  limpa: boolean;
};
export type Resultado = "pousou" | "cantou" | "fixo" | "fase" | "errou" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado };

type Config = {
  fios: number;
  colunas: number;
  pausas: number;
  // Maior distância entre duas notas seguidas, em fios.
  salto: number;
  // Milissegundos entre uma nota e a seguinte.
  batida: number;
};

const FASES: Config[] = [
  { fios: 2, colunas: 3, pausas: 0, salto: 1, batida: 560 },
  { fios: 3, colunas: 4, pausas: 0, salto: 2, batida: 540 },
  { fios: 3, colunas: 5, pausas: 0, salto: 2, batida: 520 },
  { fios: 4, colunas: 5, pausas: 0, salto: 2, batida: 500 },
  { fios: 4, colunas: 6, pausas: 1, salto: 3, batida: 480 },
  { fios: 5, colunas: 6, pausas: 0, salto: 2, batida: 470 },
  { fios: 5, colunas: 7, pausas: 1, salto: 3, batida: 450 },
  { fios: 5, colunas: 8, pausas: 1, salto: 4, batida: 430 },
  { fios: 5, colunas: 8, pausas: 2, salto: 4, batida: 410 },
];

export const configDaFase = (fase: number) => FASES[Math.min(fase, FASES.length) - 1];

export const frequencias = (fios: number) => ESCALAS[fios];

// Onde entram as pausas: nunca na primeira coluna, que é a nota de referência, nem na última,
// porque uma pausa no fim não se ouve. Duas pausas nunca ficam juntas.
function lugaresDasPausas({ colunas, pausas }: Config, rng: Rng) {
  for (;;) {
    const lugares = embaralhar(
      Array.from({ length: colunas - 2 }, (_, i) => i + 1),
      rng,
    ).slice(0, pausas);
    if (lugares.every((a) => !lugares.includes(a + 1))) return new Set(lugares);
  }
}

function boaCancao(notas: Nota[], { fios }: Config) {
  const cantadas = notas.filter((n): n is number => n !== null);
  // Todos os fios são usados, então não dá para deixar ninguém de fora.
  if (new Set(cantadas).size < Math.min(fios, cantadas.length)) return false;
  // Mais de duas iguais seguidas parece um despertador, não uma canção.
  if (cantadas.some((n, i) => i >= 2 && n === cantadas[i - 1] && n === cantadas[i - 2])) return false;
  // Precisa subir e descer, senão "sempre um acima" acertaria.
  const passos = cantadas.slice(1).map((n, i) => Math.sign(n - cantadas[i]));
  return cantadas.length < 4 || (passos.includes(1) && passos.includes(-1));
}

export function gerarCancao(fase: number, rng: Rng = Math.random): Cancao {
  const config = configDaFase(fase);
  const { fios, colunas, salto } = config;
  for (;;) {
    const pausas = lugaresDasPausas(config, rng);
    const notas: Nota[] = [sortear(0, fios - 1, rng)];
    let ultima = notas[0]!;
    for (let coluna = 1; coluna < colunas; coluna++) {
      if (pausas.has(coluna)) {
        notas.push(null);
        continue;
      }
      ultima = sortear(Math.max(0, ultima - salto), Math.min(fios - 1, ultima + salto), rng);
      notas.push(ultima);
    }
    if (boaCancao(notas, config)) return { notas };
  }
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const cancao = gerarCancao(fase, rng);
  // O primeiro passarinho já vem pousado: é a nota de referência.
  const pousos: Pouso[] = cancao.notas.map((nota, i) => (i === 0 ? nota : null));
  return { fase, vidas, pontos, cancao, pousos, confusos: pousos.map(() => false), limpa: true };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const temPausas = (fase: number) => configDaFase(fase).pausas > 0;

// Toca num lugar de uma coluna: o passarinho pousa ali. Se já estava ali, só canta de novo.
export function pousar(estado: Estado, coluna: number, lugar: number | "chao"): Jogada {
  if (coluna === 0) return { estado, resultado: "fixo" };
  if (estado.pousos[coluna] === lugar) return { estado, resultado: "cantou" };
  const pousos = estado.pousos.map((pouso, i) => (i === coluna ? lugar : pouso));
  const confusos = estado.confusos.map((confuso, i) => confuso && i !== coluna);
  return { estado: { ...estado, pousos, confusos }, resultado: "pousou" };
}

// Só canta com todas as colunas decididas: uma coluna esquecida não custa um coração.
export const podeCantar = ({ pousos }: Pick<Estado, "pousos">) => pousos.every((pouso) => pouso !== null);

// O que a criança montou, como canção: o chão é pausa.
export const cancaoMontada = ({ pousos }: Pick<Estado, "pousos">): Nota[] =>
  pousos.map((pouso) => (pouso === "chao" || pouso === null ? null : pouso));

export const erradas = ({ cancao, pousos }: Pick<Estado, "cancao" | "pousos">) =>
  cancao.notas.flatMap((nota, i) => (pousos[i] !== (nota === null ? "chao" : nota) ? [i] : []));

export const bonusDaFase = (fase: number, limpa: boolean) => fase * (limpa ? 15 : 10);

export function cantar(estado: Estado, rng: Rng = Math.random): Jogada {
  const erros = erradas(estado);
  if (erros.length === 0) {
    const { fase, vidas, pontos, limpa } = estado;
    return {
      estado: novaFase(fase + 1, Math.min(vidas + 1, VIDAS_INICIAIS), pontos + bonusDaFase(fase, limpa), rng),
      resultado: "fase",
    };
  }
  const confusos = estado.pousos.map((_, i) => erros.includes(i));
  const vidas = estado.fase <= ULTIMA_FASE_MANSA ? estado.vidas : estado.vidas - 1;
  const errado = { ...estado, vidas, confusos, limpa: false };
  return { estado: errado, resultado: vidas <= 0 ? "fim" : "errou" };
}
