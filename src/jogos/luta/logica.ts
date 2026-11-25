// Regras da Luta Épica, sem DOM. Antes de cada luta a criança vê a ficha do adversário e
// distribui os treinos da fase entre força, velocidade, técnica e resistência. A luta é por
// rodadas, e as contas decidem tudo:
//   - cada soco tira (força − técnica do outro), e pelo menos 1;
//   - a velocidade é quantos socos saem por rodada;
//   - a resistência é a vida.
// Então o treino certo depende de quem está do outro lado: contra uma guarda alta, só força
// resolve; contra quem é rápido mas fraco, técnica faz os socos dele não entrarem. O gerador
// só aceita adversários em que dividir os treinos igualmente perde, e em que algumas escolhas
// ganham com folga. Os treinos valem só para a luta da fase; os equipamentos da loja valem
// para sempre.
import { sortear, type Rng } from "../kit/sorteio";
import { ATRIBUTOS, EQUIPAMENTOS, PODER, PODERES, type Atributo, type Atributos, type PoderId } from "./loja";

export const VIDAS_INICIAIS = 3;
export const ULTIMA_FASE_MANSA = 2;
export const ENERGIA_DO_PODER = 3;
// Uma luta em que ninguém machuca ninguém não acaba nunca: o juiz encerra.
export const LIMITE_DE_RODADAS = 30;
// O melhor treino precisa vencer com essa parte da vida sobrando, para a criança ter margem
// de errar uma defesa ou outra.
export const FOLGA = 0.3;
// O golpe forte vale por dois socos: deixar de defender quando ele vem anunciado custa caro.
export const FORTE = 2;

export const BASE: Atributos = { forca: 2, velocidade: 2, tecnica: 1, resistencia: 2 };

export const vidaDe = (resistencia: number) => 6 + 3 * resistencia;

export type Intencao = "soco" | "forte";

export type EstiloId = "equilibrado" | "brutamontes" | "ligeiro" | "muralha" | "tecnico" | "campeao";

type Estilo = {
  pesos: Atributos;
  padrao: Intencao[];
  frase: string;
  // jeito é o desenho do lutador (desenho.ts).
  lutadores: { nome: string; jeito: number }[];
};

export const ESTILOS: Record<EstiloId, Estilo> = {
  equilibrado: {
    pesos: { forca: 1, velocidade: 1, tecnica: 1, resistencia: 1 },
    padrao: ["soco", "soco", "forte"],
    frase: "Faz um pouco de tudo.",
    lutadores: [
      { nome: "Tigrão", jeito: 0 },
      { nome: "Pimenta", jeito: 1 },
    ],
  },
  brutamontes: {
    pesos: { forca: 1.6, velocidade: 0.6, tecnica: 0.9, resistencia: 1.4 },
    padrao: ["soco", "forte"],
    frase: "Bate muito forte, mas é devagar.",
    lutadores: [
      { nome: "Marreta", jeito: 2 },
      { nome: "Bigorna", jeito: 3 },
    ],
  },
  ligeiro: {
    pesos: { forca: 0.8, velocidade: 1.8, tecnica: 0.6, resistencia: 0.8 },
    padrao: ["soco", "soco", "soco", "forte"],
    frase: "Rápido demais! Solta um monte de socos.",
    lutadores: [
      { nome: "Faísca", jeito: 4 },
      { nome: "Corisco", jeito: 5 },
    ],
  },
  muralha: {
    pesos: { forca: 0.8, velocidade: 0.8, tecnica: 1.7, resistencia: 1.2 },
    padrao: ["soco", "soco", "forte"],
    frase: "Quase nada passa pela guarda.",
    lutadores: [
      { nome: "Muralha", jeito: 6 },
      { nome: "Rocha", jeito: 7 },
    ],
  },
  tecnico: {
    pesos: { forca: 1.1, velocidade: 1.2, tecnica: 1.4, resistencia: 0.7 },
    padrao: ["soco", "forte"],
    frase: "Luta bonito, mas cansa rápido.",
    lutadores: [
      { nome: "Mestre Vento", jeito: 8 },
      { nome: "Gata Ninja", jeito: 9 },
    ],
  },
  campeao: {
    pesos: { forca: 1.3, velocidade: 1.2, tecnica: 1.3, resistencia: 1.5 },
    padrao: ["soco", "forte", "soco"],
    frase: "O campeão do octógono. Ninguém nunca ganhou dele.",
    lutadores: [{ nome: "Titã", jeito: 10 }],
  },
};

export type ConfigFase = {
  rivais: number;
  treinos: number;
  // Nível médio dos atributos dos adversários, sorteado nessa faixa.
  nivel: [number, number];
  estilos: EstiloId[];
  // O golpe forte, que a defesa segura inteiro.
  forte: boolean;
  // Sem nenhum equipamento da loja, nenhum treino vence.
  pedeEquipamento?: boolean;
};

const fase = (rivais: number, treinos: number, nivel: [number, number], estilos: EstiloId[], forte = true, pedeEquipamento = false): ConfigFase => ({
  rivais,
  treinos,
  nivel,
  estilos,
  forte,
  pedeEquipamento,
});

const TODOS: EstiloId[] = ["equilibrado", "brutamontes", "ligeiro", "muralha", "tecnico"];

export const FASES: ConfigFase[] = [
  fase(1, 3, [2, 2.6], ["equilibrado", "ligeiro"], false),
  fase(1, 3, [2.2, 2.8], ["brutamontes", "muralha"], false),
  fase(1, 4, [2.6, 3.2], ["muralha", "ligeiro", "brutamontes"], false),
  fase(1, 4, [2.8, 3.4], TODOS),
  fase(2, 5, [2.4, 3], TODOS),
  fase(1, 5, [3.4, 4], TODOS),
  fase(2, 5, [2.8, 3.4], TODOS),
  fase(1, 6, [4, 4.6], TODOS),
  fase(2, 6, [3.2, 3.8], TODOS),
  fase(3, 6, [2.8, 3.4], TODOS),
  fase(1, 7, [4.6, 5.2], TODOS),
  fase(2, 7, [3.8, 4.4], TODOS),
  fase(3, 7, [3.2, 3.8], TODOS),
  fase(2, 8, [4.2, 4.8], TODOS),
  // A final: o campeão, sozinho.
  fase(1, 8, [5.4, 5.8], ["campeao"], true, true),
];

export const ULTIMA_FASE = FASES.length;
export const configDaFase = (numero: number) => FASES[Math.min(numero, ULTIMA_FASE) - 1];
export const poderesDaFase = (numero: number) => PODERES.filter((poder) => PODER[poder].fase <= numero);

export const premioDaFase = (numero: number) => 30 + 10 * numero;
export const pontosDaFase = (numero: number) => 50 + 10 * numero;

export type Adversario = {
  nome: string;
  jeito: number;
  estilo: EstiloId;
  atributos: Atributos;
  padrao: Intencao[];
  // Onde o padrão começa, para dois adversários iguais não baterem forte juntos.
  inicio: number;
};

export type Voce = { atributos: Atributos; vida: number; vidaMax: number; energia: number; defendendo: boolean };
export type Rival = Adversario & { vida: number; vidaMax: number; passo: number; congelado: number };
export type Fim = "venceu" | "perdeu" | "juiz";
export type Luta = { voce: Voce; rivais: Rival[]; poder: PoderId | null; rodada: number; fim: Fim | null };

export type Acao = { tipo: "soco"; alvo: number } | { tipo: "defesa" } | { tipo: "poder"; alvo: number };

export type Evento =
  | { tipo: "soco"; alvo: number; danos: number[] }
  | { tipo: "defesa" }
  | { tipo: "poder"; poder: PoderId; alvos: { alvo: number; danos: number[] }[] }
  | { tipo: "ataque"; rival: number; forte: boolean; danos: number[]; defendeu: boolean }
  | { tipo: "congelado"; rival: number }
  | { tipo: "nocaute"; rival: number }
  | { tipo: "fim"; fim: Fim };

export const somar = (...lista: Partial<Atributos>[]): Atributos => {
  const total: Atributos = { forca: 0, velocidade: 0, tecnica: 0, resistencia: 0 };
  for (const parte of lista) for (const atributo of ATRIBUTOS) total[atributo] += parte[atributo] ?? 0;
  return total;
};

// Todo soco que acerta tira pelo menos 1: sem isso, técnica alta deixava o lutador invencível
// e treinar só técnica ganhava quase toda luta.
export const danoPorSoco = (forca: number, tecnica: number) => Math.max(1, forca - tecnica);
export const vivo = (rival: Rival) => rival.vida > 0;

export function intencao(rival: Rival): Intencao | "gelo" {
  if (rival.congelado > 0) return "gelo";
  return rival.padrao[(rival.passo + rival.inicio) % rival.padrao.length];
}

export function comecarLuta(atributos: Atributos, adversarios: Adversario[], poder: PoderId | null): Luta {
  const vidaMax = vidaDe(atributos.resistencia);
  return {
    voce: { atributos: { ...atributos }, vida: vidaMax, vidaMax, energia: 0, defendendo: false },
    rivais: adversarios.map((adversario) => {
      const max = vidaDe(adversario.atributos.resistencia);
      return { ...adversario, atributos: { ...adversario.atributos }, vida: max, vidaMax: max, passo: 0, congelado: 0 };
    }),
    poder,
    rodada: 0,
    fim: null,
  };
}

export const poderPronto = (luta: Luta) => luta.poder !== null && luta.voce.energia >= ENERGIA_DO_PODER;

// O alvo pedido, ou o primeiro de pé se ele já caiu.
function alvoValido(luta: Luta, alvo: number) {
  if (luta.rivais[alvo] && vivo(luta.rivais[alvo])) return alvo;
  return luta.rivais.findIndex(vivo);
}

function bater(rival: Rival, golpes: number, dano: number) {
  const danos: number[] = [];
  for (let i = 0; i < golpes && vivo(rival); i++) {
    danos.push(dano);
    rival.vida = Math.max(0, rival.vida - dano);
  }
  return danos;
}

// Uma rodada: a criança age, depois cada adversário de pé faz o que anunciou.
export function agir(luta: Luta, acao: Acao): Evento[] {
  if (luta.fim) return [];
  const { voce, rivais } = luta;
  const eventos: Evento[] = [];
  const caidos = new Set(rivais.filter((rival) => !vivo(rival)));

  if (acao.tipo === "poder" && !poderPronto(luta)) acao = { tipo: "soco", alvo: acao.alvo };

  if (acao.tipo === "soco") {
    const alvo = alvoValido(luta, acao.alvo);
    const rival = rivais[alvo];
    const danos = bater(rival, voce.atributos.velocidade, danoPorSoco(voce.atributos.forca, rival.atributos.tecnica));
    eventos.push({ tipo: "soco", alvo, danos });
    voce.energia = Math.min(ENERGIA_DO_PODER, voce.energia + 1);
  } else if (acao.tipo === "defesa") {
    voce.defendendo = true;
    eventos.push({ tipo: "defesa" });
    voce.energia = Math.min(ENERGIA_DO_PODER, voce.energia + 1);
  } else {
    const poder = luta.poder!;
    voce.energia = 0;
    const { forca, velocidade } = voce.atributos;
    const alvos: { alvo: number; danos: number[] }[] = [];
    rivais.forEach((rival, i) => {
      if (!vivo(rival)) return;
      if (poder === "fogo") alvos.push({ alvo: i, danos: bater(rival, 1, 2 * forca) });
      if (poder === "gelo") {
        rival.congelado = 2;
        alvos.push({ alvo: i, danos: [] });
      }
    });
    if (poder === "raio") {
      const alvo = alvoValido(luta, acao.alvo);
      alvos.push({ alvo, danos: bater(rivais[alvo], velocidade, forca) });
    }
    eventos.push({ tipo: "poder", poder, alvos });
  }

  rivais.forEach((rival, i) => {
    if (!vivo(rival) && !caidos.has(rival)) eventos.push({ tipo: "nocaute", rival: i });
  });
  if (!rivais.some(vivo)) {
    luta.fim = "venceu";
    eventos.push({ tipo: "fim", fim: "venceu" });
    return eventos;
  }

  for (const [i, rival] of rivais.entries()) {
    if (!vivo(rival)) continue;
    if (rival.congelado > 0) {
      rival.congelado--;
      eventos.push({ tipo: "congelado", rival: i });
      continue;
    }
    const forte = intencao(rival) === "forte";
    rival.passo++;
    let dano = danoPorSoco(rival.atributos.forca, voce.atributos.tecnica) * (forte ? FORTE : 1);
    // A defesa segura o golpe forte inteiro e a metade de cada soco.
    if (voce.defendendo) dano = forte ? 0 : Math.floor(dano / 2);
    const danos: number[] = [];
    for (let g = 0; g < rival.atributos.velocidade && voce.vida > 0; g++) {
      danos.push(dano);
      voce.vida = Math.max(0, voce.vida - dano);
    }
    eventos.push({ tipo: "ataque", rival: i, forte, danos, defendeu: voce.defendendo });
    if (voce.vida <= 0) {
      luta.fim = "perdeu";
      eventos.push({ tipo: "fim", fim: "perdeu" });
      return eventos;
    }
  }

  voce.defendendo = false;
  luta.rodada++;
  if (luta.rodada >= LIMITE_DE_RODADAS) {
    luta.fim = "juiz";
    eventos.push({ tipo: "fim", fim: "juiz" });
  }
  return eventos;
}

// Quanto um rival tira por rodada, num soco comum, sem defesa.
const ameaca = (luta: Luta, rival: Rival) =>
  danoPorSoco(rival.atributos.forca, luta.voce.atributos.tecnica) * rival.atributos.velocidade;

const danoNoRival = (luta: Luta, rival: Rival) =>
  danoPorSoco(luta.voce.atributos.forca, rival.atributos.tecnica) * luta.voce.atributos.velocidade;

// Quem joga com cuidado: usa o poder quando enche, defende o golpe forte anunciado e bate em
// quem cai mais rápido. Serve de régua para o gerador e para os testes.
export function jogadaEsperta(luta: Luta): Acao {
  const vivos = luta.rivais.map((rival, i) => ({ rival, i })).filter(({ rival }) => vivo(rival));
  const perigoso = [...vivos].sort((a, b) => ameaca(luta, b.rival) - ameaca(luta, a.rival))[0];
  if (poderPronto(luta)) {
    const algumBate = vivos.some(({ rival }) => ameaca(luta, rival) > 0);
    if (luta.poder !== "gelo" || algumBate) {
      // O raio vai em quem a guarda mais segura os socos comuns.
      const alvo =
        luta.poder === "raio" ? [...vivos].sort((a, b) => danoNoRival(luta, a.rival) - danoNoRival(luta, b.rival))[0].i : perigoso.i;
      return { tipo: "poder", alvo };
    }
  }
  const forteVindo = vivos.some(({ rival }) => intencao(rival) === "forte" && ameaca(luta, rival) > 0);
  if (forteVindo) return { tipo: "defesa" };
  const alvos = vivos
    .filter(({ rival }) => danoNoRival(luta, rival) > 0)
    .map(({ rival, i }) => ({ i, rodadas: Math.ceil(rival.vida / danoNoRival(luta, rival)), ameaca: ameaca(luta, rival) }))
    .sort((a, b) => a.rodadas - b.rodadas || b.ameaca - a.ameaca);
  if (!alvos.length) return { tipo: "defesa" };
  return { tipo: "soco", alvo: alvos[0].i };
}

// Quem só aperta soco no primeiro da fila e solta o poder quando enche.
export function jogadaApressada(luta: Luta): Acao {
  const alvo = luta.rivais.findIndex(vivo);
  return poderPronto(luta) ? { tipo: "poder", alvo } : { tipo: "soco", alvo };
}

export type Jogada = (luta: Luta) => Acao;

export function simular(atributos: Atributos, adversarios: Adversario[], poder: PoderId | null, jogada: Jogada = jogadaEsperta) {
  const luta = comecarLuta(atributos, adversarios, poder);
  while (!luta.fim) agir(luta, jogada(luta));
  return { fim: luta.fim, sobra: luta.voce.vida / luta.voce.vidaMax, rodadas: luta.rodada };
}

// Todas as formas de repartir n treinos entre os quatro atributos.
export function distribuicoes(n: number): Atributos[] {
  const lista: Atributos[] = [];
  for (let f = 0; f <= n; f++)
    for (let v = 0; v <= n - f; v++)
      for (let t = 0; t <= n - f - v; t++) lista.push({ forca: f, velocidade: v, tecnica: t, resistencia: n - f - v - t });
  return lista;
}

// Um pouco de cada, na ordem da academia: o jeito de treinar que não olha o adversário.
export function igualzinho(n: number): Atributos {
  const treino = somar();
  for (let i = 0; i < n; i++) treino[ATRIBUTOS[i % ATRIBUTOS.length]]++;
  return treino;
}

// O melhor resultado de um treino com algum dos poderes que a fase oferece.
export function melhorPoder(atributos: Atributos, adversarios: Adversario[], poderes: PoderId[], jogada: Jogada = jogadaEsperta) {
  let melhor = { ...simular(atributos, adversarios, null, jogada), poder: null as PoderId | null };
  for (const poder of poderes) {
    const tentativa = simular(atributos, adversarios, poder, jogada);
    const vence = (r: { fim: Fim; sobra: number }) => (r.fim === "venceu" ? 1 + r.sobra : 0);
    if (vence(tentativa) > vence(melhor)) melhor = { ...tentativa, poder };
  }
  return melhor;
}

// Os equipamentos que se espera de quem chega à fase, comprando com parte do dinheiro.
export function equipamentosEsperados(numero: number): Atributos {
  let verba = verbaDaFase(numero) * 0.7;
  const niveis = somar();
  const ordem: Atributo[] = ["forca", "tecnica", "resistencia", "velocidade"];
  for (;;) {
    const proximo = ordem
      .map((atributo) => ({ atributo, preco: EQUIPAMENTOS[atributo].precos[niveis[atributo]] }))
      .filter(({ preco }) => preco !== undefined)
      .sort((a, b) => a.preco - b.preco)[0];
    if (!proximo || proximo.preco > verba) return niveis;
    verba -= proximo.preco;
    niveis[proximo.atributo]++;
  }
}

export const referenciaDaFase = (numero: number) => somar(BASE, equipamentosEsperados(numero));

export function verbaDaFase(numero: number) {
  let soma = 0;
  for (let f = 1; f < Math.min(numero, ULTIMA_FASE + 1); f++) soma += premioDaFase(f);
  return soma;
}

export type Avaliacao = { vencem: number; total: number; igualzinho: boolean; folga: number };

export function avaliar(numero: number, adversarios: Adversario[], base = referenciaDaFase(numero)): Avaliacao {
  const { treinos } = configDaFase(numero);
  const poderes = poderesDaFase(numero);
  const todas = distribuicoes(treinos);
  let vencem = 0;
  let folga = 0;
  for (const treino of todas) {
    const r = melhorPoder(somar(base, treino), adversarios, poderes);
    if (r.fim !== "venceu") continue;
    vencem++;
    folga = Math.max(folga, r.sobra);
  }
  const igual = melhorPoder(somar(base, igualzinho(treinos)), adversarios, poderes).fim === "venceu";
  return { vencem, total: todas.length, igualzinho: igual, folga };
}

export const MIN_QUE_VENCEM = 0.04;
export const MAX_QUE_VENCEM = 0.45;

export function aceitavel(numero: number, avaliacao: Avaliacao) {
  return classe(numero, avaliacao) === "boa";
}

// "facil" e "dificil" dizem para que lado o gerador deve mexer no nível.
function classe(numero: number, { vencem, total, igualzinho, folga }: Avaliacao): "boa" | "facil" | "dificil" {
  // Nas primeiras, quase todo treino ganha: a criança aprende as regras sem perder.
  if (numero <= ULTIMA_FASE_MANSA) return igualzinho && folga >= FOLGA && vencem / total >= 0.5 ? "boa" : "dificil";
  if (igualzinho || vencem / total > MAX_QUE_VENCEM) return "facil";
  if (folga < FOLGA || vencem / total < MIN_QUE_VENCEM) return "dificil";
  return "boa";
}

export function semEquipamentoVence(numero: number, adversarios: Adversario[]) {
  const poderes = poderesDaFase(numero);
  return distribuicoes(configDaFase(numero).treinos).some(
    (treino) => melhorPoder(somar(BASE, treino), adversarios, poderes).fim === "venceu",
  );
}

// Como avaliar, mas para de contar assim que a resposta já é "fácil demais".
function classificar(numero: number, adversarios: Adversario[]) {
  const base = referenciaDaFase(numero);
  const { treinos } = configDaFase(numero);
  const poderes = poderesDaFase(numero);
  const igual = melhorPoder(somar(base, igualzinho(treinos)), adversarios, poderes).fim === "venceu";
  if (igual && numero > ULTIMA_FASE_MANSA) return "facil";
  const todas = distribuicoes(treinos);
  const teto = Math.floor(MAX_QUE_VENCEM * todas.length);
  let vencem = 0;
  let folga = 0;
  for (const treino of todas) {
    const r = melhorPoder(somar(base, treino), adversarios, poderes);
    if (r.fim !== "venceu") continue;
    vencem++;
    folga = Math.max(folga, r.sobra);
    if (vencem > teto && numero > ULTIMA_FASE_MANSA) return "facil";
  }
  const resposta = classe(numero, { vencem, total: todas.length, igualzinho: igual, folga });
  if (resposta === "boa" && configDaFase(numero).pedeEquipamento && semEquipamentoVence(numero, adversarios)) return "facil";
  return resposta;
}

function novoAdversario(estilo: EstiloId, nivel: number, forte: boolean, usados: Set<string>, rng: Rng): Adversario {
  const { pesos, padrao, lutadores } = ESTILOS[estilo];
  const livres = lutadores.filter((lutador) => !usados.has(lutador.nome));
  const lista = livres.length ? livres : lutadores;
  const { nome, jeito } = lista[sortear(0, lista.length - 1, rng)];
  usados.add(nome);
  const atributos = somar();
  for (const atributo of ATRIBUTOS) atributos[atributo] = Math.max(1, Math.round(nivel * pesos[atributo] + rng() - 0.5));
  const golpes: Intencao[] = forte ? padrao : ["soco"];
  return { nome, jeito, estilo, atributos, padrao: golpes, inicio: sortear(0, golpes.length - 1, rng) };
}

export const TENTATIVAS = 120;

// Sorteia estilos e atributos e só aceita adversários em que o treino decide a luta. O nível
// começa no meio da faixa da fase e anda para cima quando a luta sai fácil demais, e para
// baixo quando sai difícil demais, então poucas tentativas bastam.
export function gerarAdversarios(numero: number, rng: Rng = Math.random): Adversario[] {
  const config = configDaFase(numero);
  let nivel = config.nivel[0] + rng() * (config.nivel[1] - config.nivel[0]);
  let reserva: Adversario[] = [];
  let ultimo: Adversario[] = [];
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const usados = new Set<string>();
    const sorteados: EstiloId[] = [];
    for (let i = 0; i < config.rivais; i++) {
      const livres = config.estilos.filter((estilo) => !sorteados.includes(estilo));
      const lista = livres.length ? livres : config.estilos;
      sorteados.push(lista[sortear(0, lista.length - 1, rng)]);
    }
    const adversarios = sorteados.map((estilo) => novoAdversario(estilo, nivel + (rng() - 0.5) * 0.4, config.forte, usados, rng));
    ultimo = adversarios;
    const resposta = classificar(numero, adversarios);
    if (resposta === "boa") return adversarios;
    // Sem achar, fica o último fácil: melhor uma luta fácil que uma impossível.
    if (resposta === "facil") reserva = adversarios;
    nivel += resposta === "facil" ? 0.15 : -0.15;
  }
  return reserva.length ? reserva : ultimo;
}

// O jogo inteiro

export type Vestiario = { luvas: string; roupa: string; faixa: string; comprados: string[] };

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  moedas: number;
  equipamentos: Atributos;
  vestiario: Vestiario;
  poder: PoderId | null;
  adversarios: Adversario[];
  treino: Atributos;
  // Derrotas na luta desta fase: a terceira estrela é para quem vence de primeira.
  derrotas: number;
  luta: Luta | null;
};

export const novoVestiario = (): Vestiario => ({
  luvas: "vermelha",
  roupa: "azul",
  faixa: "branca",
  comprados: ["luvas:vermelha", "roupa:azul", "faixa:branca"],
});

export function novoJogo(numero: number, rng: Rng = Math.random): Estado {
  const estado: Estado = {
    fase: numero,
    vidas: VIDAS_INICIAIS,
    pontos: 0,
    moedas: verbaDaFase(numero),
    equipamentos: somar(),
    vestiario: novoVestiario(),
    poder: null,
    adversarios: [],
    treino: somar(),
    derrotas: 0,
    luta: null,
  };
  prepararFase(estado, rng);
  return estado;
}

export function prepararFase(estado: Estado, rng: Rng = Math.random) {
  estado.adversarios = gerarAdversarios(estado.fase, rng);
  estado.treino = somar();
  estado.derrotas = 0;
  estado.luta = null;
  const poderes = poderesDaFase(estado.fase);
  if (!estado.poder || !poderes.includes(estado.poder)) estado.poder = poderes.at(-1) ?? null;
}

export const baseDe = (estado: Estado) => somar(BASE, estado.equipamentos);
export const atributosDe = (estado: Estado) => somar(baseDe(estado), estado.treino);
export const treinosFeitos = (estado: Estado) => ATRIBUTOS.reduce((soma, atributo) => soma + estado.treino[atributo], 0);
export const treinosQueFaltam = (estado: Estado) => configDaFase(estado.fase).treinos - treinosFeitos(estado);

export function treinar(estado: Estado, atributo: Atributo) {
  if (treinosQueFaltam(estado) <= 0) return false;
  estado.treino[atributo]++;
  return true;
}

export function refazerTreino(estado: Estado) {
  estado.treino = somar();
}

export function escolherPoder(estado: Estado, poder: PoderId) {
  if (poderesDaFase(estado.fase).includes(poder)) estado.poder = poder;
}

export function lutar(estado: Estado) {
  estado.luta = comecarLuta(atributosDe(estado), estado.adversarios, estado.poder);
  return estado.luta;
}

export type Resultado = {
  venceu: boolean;
  premio: number;
  pontos: number;
  perfeita: boolean;
  perdeuVida: boolean;
  zerou: boolean;
};

// Fecha a luta: quem vence ganha prêmio e passa de fase; quem perde treina de novo para o
// mesmo adversário, e a partir da fase 3 isso custa um coração.
export function encerrar(estado: Estado): Resultado {
  const luta = estado.luta!;
  const venceu = luta.fim === "venceu";
  if (venceu) {
    const perfeita = estado.derrotas === 0;
    const sobra = Math.round((luta.voce.vida / luta.voce.vidaMax) * 50);
    const pontos = pontosDaFase(estado.fase) + sobra + (perfeita ? 25 : 0);
    const premio = premioDaFase(estado.fase);
    estado.pontos += pontos;
    estado.moedas += premio;
    const zerou = estado.fase >= ULTIMA_FASE;
    if (!zerou) estado.fase++;
    return { venceu, premio, pontos, perfeita, perdeuVida: false, zerou };
  }
  estado.derrotas++;
  const perdeuVida = estado.fase > ULTIMA_FASE_MANSA;
  if (perdeuVida) estado.vidas--;
  estado.treino = somar();
  estado.luta = null;
  return { venceu, premio: 0, pontos: 0, perfeita: false, perdeuVida, zerou: false };
}

// Loja

export function precoDoEquipamento(estado: Estado, atributo: Atributo): number | null {
  return EQUIPAMENTOS[atributo].precos[estado.equipamentos[atributo]] ?? null;
}

export function comprarEquipamento(estado: Estado, atributo: Atributo): "comprou" | "falta" | "nada" {
  const preco = precoDoEquipamento(estado, atributo);
  if (preco === null) return "nada";
  if (preco > estado.moedas) return "falta";
  estado.moedas -= preco;
  estado.equipamentos[atributo]++;
  return "comprou";
}

export const temPeca = (estado: Estado, peca: string, id: string) => estado.vestiario.comprados.includes(`${peca}:${id}`);

// Comprar uma peça já veste. Uma peça que já é sua só troca, de graça.
export function vestir(estado: Estado, peca: "luvas" | "roupa" | "faixa", id: string, preco: number): "vestiu" | "comprou" | "falta" {
  if (!temPeca(estado, peca, id)) {
    if (preco > estado.moedas) return "falta";
    estado.moedas -= preco;
    estado.vestiario.comprados.push(`${peca}:${id}`);
    estado.vestiario[peca] = id;
    return "comprou";
  }
  estado.vestiario[peca] = id;
  return "vestiu";
}
