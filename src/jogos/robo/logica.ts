// Regras do jogo, sem DOM, para serem testadas com Vitest.
export const VIDAS_INICIAIS = 3;

export type Rng = () => number;
export type Poder = { id: string; nome: string; forca: number };
export type Inimigo = { defesa: number; chefe: boolean };
export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  cargas: number[];
  inimigos: Inimigo[];
  restante: number;
};
export type Resultado = "golpe" | "derrotou" | "exato" | "fase" | "sem-forca" | "fim";
export type Jogada = { estado: Estado; resultado: Resultado };

// Um poder novo a cada fase, sempre mais forte que o anterior. As forças não são
// múltiplas entre si de propósito: assim "use o maior que couber" deixa de bastar nas
// fases mais altas, e a criança precisa olhar a fila e planejar. Simule antes de mudar.
export const PODERES: Poder[] = [
  { id: "soco", nome: "Soco", forca: 3 },
  { id: "laser", nome: "Laser", forca: 7 },
  { id: "canhao", nome: "Canhão", forca: 12 },
  { id: "missil", nome: "Míssil", forca: 25 },
  { id: "raio", nome: "Raio", forca: 60 },
  { id: "supernova", nome: "Supernova", forca: 130 },
];

export function configDaFase(fase: number) {
  return {
    poderes: Math.min(fase + 1, PODERES.length),
    comuns: Math.min(fase + 1, 7),
    golpesDoChefe: 1 + Math.min(fase, 3),
    // Socos de sobra, além do plano que vence a fase sem desperdício.
    folga: fase === 1 ? 3 : fase === 2 ? 2 : 1,
  };
}

function embaralhar<T>(lista: T[], rng: Rng) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const somar = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);

// Os inimigos nascem das próprias cargas: dividir os golpes entre eles garante que
// toda fase tem solução. Os golpes mais fortes vão para o chefe, para valer a pena guardá-los.
export function gerarFase(fase: number, rng: Rng = Math.random) {
  const { poderes, comuns, golpesDoChefe, folga } = configDaFase(fase);
  const cargasDoPlano = PODERES.slice(0, poderes).map((_, i) => 2 + poderes - 1 - i);
  const golpes = cargasDoPlano
    .flatMap((quantidade, i) => Array<number>(quantidade).fill(PODERES[i].forca))
    .sort((a, b) => b - a);

  const resto = embaralhar(golpes.slice(golpesDoChefe), rng);
  const grupos: number[][] = Array.from({ length: comuns }, (_, i) => [resto[i]]);
  resto.slice(comuns).forEach((golpe) => grupos[Math.floor(rng() * comuns)].push(golpe));

  return {
    cargas: cargasDoPlano.map((quantidade, i) => (i === 0 ? quantidade + folga : quantidade)),
    inimigos: [
      ...grupos.map((grupo) => ({ defesa: somar(grupo), chefe: false })),
      { defesa: somar(golpes.slice(0, golpesDoChefe)), chefe: true },
    ],
  };
}

export function novaFase(fase: number, vidas: number, pontos: number, rng: Rng = Math.random): Estado {
  const { cargas, inimigos } = gerarFase(fase, rng);
  return { fase, vidas, pontos, cargas, inimigos, restante: inimigos[0].defesa };
}

export const novoJogo = (fase = 1, rng: Rng = Math.random) => novaFase(fase, VIDAS_INICIAIS, 0, rng);

export const poderGuardado = (cargas: number[]) =>
  somar(cargas.map((quantidade, i) => quantidade * PODERES[i].forca));

// Só falha com todas as cargas gastas: a criança sempre joga até o último golpe.
const semCargas = (cargas: number[]) => cargas.every((quantidade) => quantidade === 0);

function falhar(estado: Estado, rng: Rng): Jogada {
  const vidas = estado.vidas - 1;
  if (vidas <= 0) return { estado: { ...estado, vidas }, resultado: "fim" };
  return { estado: novaFase(estado.fase, vidas, estado.pontos, rng), resultado: "sem-forca" };
}

export function atacar(estado: Estado, poder: number, rng: Rng = Math.random): Jogada {
  const cargas = estado.cargas.map((quantidade, i) => (i === poder ? quantidade - 1 : quantidade));
  const restante = estado.restante - PODERES[poder].forca;

  if (restante > 0) {
    const proximo = { ...estado, cargas, restante };
    if (semCargas(cargas)) return falhar(proximo, rng);
    return { estado: proximo, resultado: "golpe" };
  }

  // Golpe na medida vale mais pontos, mas não devolve carga: isso anularia a estratégia.
  const exato = restante === 0;
  const pontos = estado.pontos + estado.fase * (exato ? 15 : 10);
  const [, ...inimigos] = estado.inimigos;

  if (inimigos.length === 0) {
    const proximo = novaFase(estado.fase + 1, estado.vidas, pontos + poderGuardado(cargas), rng);
    return { estado: proximo, resultado: "fase" };
  }

  const proximo = { ...estado, cargas, inimigos, pontos, restante: inimigos[0].defesa };
  if (semCargas(cargas)) return falhar(proximo, rng);
  return { estado: proximo, resultado: exato ? "exato" : "derrotou" };
}
