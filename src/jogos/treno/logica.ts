// Regras do Trenó de Natal, sem DOM. A noite tem duas partes. Primeiro o Papai Noel chama as
// renas: a conta aparece no alto (4 + 3 = ?), renas soltas voam em grupos de três com um
// número no sino, e só entra no time a que traz o resultado. Não há relógio nessa parte, e o
// trenó começa devagar e acelera a cada rena. Com o time completo, as contas somem e começa a
// entrega: o sol vai nascendo, e os presentes caem com a velocidade do trenó, então é preciso
// soltar um pouco antes da chaminé. Mais renas fazem um trenó mais rápido, que passa por mais
// casas antes do amanhecer.
//
// Unidades da cena: 100 de altura, y para baixo, x crescendo para a frente.
import { embaralhar, sortear, type Rng } from "../kit/sorteio";
import {
  FORCA_DA_RENA,
  MELHORIAS,
  PRESENTES_NO_SACO,
  TAMANHO_DA_RENA,
  TRENOS,
  type MelhoriaId,
  type TrenoId,
} from "./oficina";

export const VIDAS_INICIAIS = 3;
export const ULTIMA_FASE_MANSA = 2;

// O topo da neve, e a faixa onde o centro do trenó pode ficar: acima das chaminés.
export const CHAO = 92;
export const TETO = 21;
export const PISO = 51;
// As três alturas onde voam as renas soltas. A de cima fica abaixo da conta, no topo da cena.
export const FAIXAS = [24, 37.5, 51];
// Da borda esquerda da tela até a ponta do time: o que vem pela frente tem sempre a mesma
// distância para aparecer, tenha o time quantas renas tiver.
export const ANCORA = 40;
export const SUBIDA = 80;
export const GRAVIDADE = 110;
export const LARGURA_DA_CHAMINE = 6;
// Quanto o presente pode passar da beira da chaminé e ainda entrar.
export const FOLGA_DA_CHAMINE = 2.5;
// Distância vertical em que a ponta do time pega uma rena.
export const ALCANCE_DA_RENA = 6.5;
// Enquanto chama as renas, o trenó anda devagar e os grupos chegam com essa velocidade, que
// cresce a cada rena do time: a primeira conta tem tempo de sobra, e o ritmo sobe aos poucos.
export const VELOCIDADE_CHAMANDO = 5;
export const APROXIMACAO = 10;
export const ACELERA_POR_RENA = 0.6;
export const ESPACO_DA_FILA = 6;
export const COMPRIMENTO_DO_TRENO = 14;
// Depois de uma rena errada, o trenó perde o embalo e recupera nesse tempo.
export const TRANCO = 0.35;
export const RECUPERA_DO_TRANCO = 1.5;
export const RECARGA_DO_PRESENTE = 0.3;
// O presente só sai quando a queda vai terminar perto de uma chaminé, e um de cada vez:
// assim quem aperta sem parar não esvazia o saco no céu vazio, e quem solta cedo demais vê o
// botão balançar e aprende a esperar. A folga é maior que a da chaminé, então errar ainda dá.
export const PERTO_DA_CHAMINE = 12;
export const MOEDAS_POR_PRESENTE = 10;
export const PONTOS_POR_PRESENTE = 10;
export const PONTOS_POR_RENA = 5;
// Quantos jeitos diferentes de rena existem (pelagem, cachecol, gorro): só o desenho usa.
export const JEITOS_DE_RENA = 8;

// Os tipos de conta. Cada noite mistura alguns, para a conta não ficar sempre igual.
export type Tipo =
  | "ate10"
  | "passa10"
  | "dobro"
  | "dezenas"
  | "dezenaEUnidade"
  | "semReserva"
  | "comReserva"
  | "tres"
  | "cinco";

export const TIPOS: Tipo[] = [
  "ate10",
  "passa10",
  "dobro",
  "dezenas",
  "dezenaEUnidade",
  "semReserva",
  "comReserva",
  "tres",
  "cinco",
];

export type ConfigFase = {
  tipos: Tipo[];
  // Renas para completar o time e começar a entrega.
  renas: number;
  meta: number;
  // Duração da entrega, em segundos.
  noite: number;
  // Espaço entre uma casa e a próxima.
  vao: [number, number];
};

const fase = (tipos: Tipo[], renas: number, meta: number, noite: number, vao: [number, number]): ConfigFase => ({
  tipos,
  renas,
  meta,
  noite,
  vao,
});

export const FASES: ConfigFase[] = [
  fase(["ate10"], 4, 4, 45, [12, 26]),
  fase(["ate10", "dobro"], 4, 5, 45, [12, 26]),
  fase(["ate10", "passa10"], 6, 6, 40, [12, 26]),
  fase(["passa10", "dobro"], 6, 6, 40, [10, 26]),
  fase(["passa10", "dezenas"], 8, 9, 42, [10, 24]),
  fase(["dezenas", "dezenaEUnidade", "ate10"], 8, 9, 42, [10, 24]),
  fase(["passa10", "dezenaEUnidade", "dobro"], 8, 12, 44, [8, 22]),
  fase(["semReserva", "passa10"], 8, 12, 44, [8, 22]),
  fase(["tres", "passa10", "dezenas"], 8, 12, 45, [8, 22]),
  fase(["semReserva", "dezenas", "dobro"], 8, 13, 45, [8, 20]),
  fase(["comReserva", "dezenaEUnidade"], 8, 14, 46, [8, 20]),
  fase(["cinco", "semReserva", "tres"], 8, 14, 46, [8, 20]),
  fase(["comReserva", "tres", "dobro"], 8, 15, 48, [6, 18]),
  fase(["comReserva", "cinco", "tres", "passa10"], 8, 15, 48, [6, 18]),
  // A Noite de Natal mistura tudo.
  fase(TIPOS, 8, 16, 52, [6, 18]),
];

export const ULTIMA_FASE = FASES.length;
export const configDaFase = (numero: number) => FASES[Math.min(numero, ULTIMA_FASE) - 1];
export const MAX_RENAS = Math.max(...FASES.map((config) => config.renas));

export type Oficina = {
  treno: TrenoId;
  trenos: TrenoId[];
  niveis: Record<MelhoriaId, number>;
  cor: string;
};

export type Rena = { jeito: number };
export type Conta = { tipo: Tipo; parcelas: number[]; resultado: number };
export type Solta = Rena & { valor: number; y: number };
export type Grupo = { id: number; x: number; membros: Solta[] };
export type Casa = {
  id: number;
  x: number;
  largura: number;
  // Topo das paredes: o telhado sobe a partir dele.
  parede: number;
  chamine: number;
  topoDaChamine: number;
  jeito: number;
  servida: boolean;
};
export type Presente = { id: number; x: number; y: number; vx: number; vy: number; jeito: number };
export type Modo = "renas" | "entrega";

export type Noite = {
  config: ConfigFase;
  modo: Modo;
  // Segundos da entrega: a parte das renas não tem relógio.
  tempo: number;
  // A ponta do time.
  x: number;
  y: number;
  // A velocidade que o trenó tem agora, já com o tranco.
  v: number;
  // A velocidade que ele busca, sem o tranco.
  embalo: number;
  tranco: number;
  renas: Rena[];
  conta: Conta;
  // As contas que já saíram nesta noite, para não repetir.
  usadas: string[];
  grupo: Grupo | null;
  espera: number;
  casas: Casa[];
  proximaCasa: number;
  presentes: Presente[];
  saco: number;
  entregues: number;
  acertos: number;
  erros: number;
  recarga: number;
  // Largura da tela, em unidades da cena: as coisas nascem logo depois da borda direita.
  largura: number;
  acabou: boolean;
  contador: number;
};

export type Estado = {
  fase: number;
  vidas: number;
  pontos: number;
  moedas: number;
  oficina: Oficina;
  noite: Noite;
};

export type Comando = { altura: number | null; soltar: boolean };

export type Evento =
  | { tipo: "grupo"; grupo: Grupo }
  | { tipo: "pegou"; grupo: Grupo; rena: Solta }
  | { tipo: "errou"; grupo: Grupo; rena: Solta; conta: Conta; fugiu: Rena | null }
  | { tipo: "passou"; grupo: Grupo }
  | { tipo: "completo" }
  | { tipo: "soltou"; presente: Presente }
  | { tipo: "entregou"; presente: Presente; casa: Casa; meta: boolean }
  | { tipo: "caiu"; presente: Presente }
  | { tipo: "amanheceu" };

export const novaOficina = (): Oficina => ({
  treno: "madeira",
  trenos: ["madeira"],
  niveis: { saco: 0, renas: 0 },
  cor: TRENOS.madeira.cor,
});

export const capacidade = (oficina: Oficina) => PRESENTES_NO_SACO[oficina.niveis.saco];
export const tamanhoDaRena = (oficina: Oficina) => TAMANHO_DA_RENA[oficina.niveis.renas];
// Renas maiores pedem mais espaço, mas menos que o tamanho: o time precisa caber na tela.
export const espacoDaFila = (oficina: Oficina) => ESPACO_DA_FILA + (tamanhoDaRena(oficina) - 1) * 3;
// As renas vão em pares, uma ao lado da outra.
export const filasDoTime = (noite: Noite) => Math.ceil(noite.renas.length / 2);

export function velocidadeAlvo(noite: Noite, oficina: Oficina) {
  const renas = noite.renas.length;
  if (noite.modo === "renas") return VELOCIDADE_CHAMANDO + ACELERA_POR_RENA * renas;
  return TRENOS[oficina.treno].base + FORCA_DA_RENA[oficina.niveis.renas] * renas;
}

// A frente do trenó, atrás das filas do time.
export const frenteDoTreno = (noite: Noite, oficina: Oficina) => noite.x - filasDoTime(noite) * espacoDaFila(oficina);

// De onde o presente sai: o saco, atrás do Papai Noel.
export const bocaDoSaco = (noite: Noite, oficina: Oficina) => ({
  x: frenteDoTreno(noite, oficina) - COMPRIMENTO_DO_TRENO * 0.7,
  y: noite.y + 1,
});

export const camera = (noite: Noite) => noite.x - ANCORA;

// Contas
const entre = (min: number, max: number, rng: Rng) => sortear(min, max, rng);

function parcelasDe(tipo: Tipo, rng: Rng): number[] {
  switch (tipo) {
    case "ate10": {
      // A partir de 4, para sobrar número errado abaixo do certo.
      const a = entre(1, 8, rng);
      const b = entre(Math.max(1, 4 - a), 10 - a, rng);
      return [a, b];
    }
    case "passa10": {
      const a = entre(2, 9, rng);
      return [a, entre(11 - a, 9, rng)];
    }
    case "dobro": {
      const a = entre(3, 12, rng);
      return [a, a];
    }
    case "dezenas": {
      const a = entre(1, 7, rng);
      return [a * 10, entre(Math.max(1, 4 - a), 9 - a, rng) * 10];
    }
    case "dezenaEUnidade":
      return [entre(2, 9, rng) * 10, entre(1, 9, rng)];
    case "semReserva": {
      const ua = entre(0, 8, rng);
      const ta = entre(1, 7, rng);
      return [ta * 10 + ua, entre(1, 8 - ta, rng) * 10 + entre(ua === 0 ? 1 : 0, 9 - ua, rng)];
    }
    case "comReserva": {
      const ua = entre(2, 9, rng);
      const ta = entre(1, 6, rng);
      return [ta * 10 + ua, entre(1, 7 - ta, rng) * 10 + entre(10 - ua, 9, rng)];
    }
    case "tres": {
      const a = entre(1, 9, rng);
      const b = entre(1, 9, rng);
      return [a, b, entre(Math.max(1, 6 - a - b), Math.min(9, 20 - a - b), rng)];
    }
    case "cinco": {
      const a = entre(2, 12, rng);
      return [a * 5, entre(2, 19 - a, rng) * 5];
    }
  }
}

// O mesmo par em outra ordem é a mesma conta.
const chave = (parcelas: number[]) => [...parcelas].sort((a, b) => a - b).join("+");

export function novaConta(tipos: Tipo[], usadas: string[], anterior: Tipo | null, rng: Rng): Conta {
  // Com mais de um tipo, o próximo é outro, para a conta mudar de cara a cada rena.
  const opcoes = tipos.length > 1 ? tipos.filter((tipo) => tipo !== anterior) : tipos;
  const tipo = opcoes[sortear(0, opcoes.length - 1, rng)];
  let parcelas = parcelasDe(tipo, rng);
  for (let tentativa = 0; tentativa < 40 && usadas.includes(chave(parcelas)); tentativa++) parcelas = parcelasDe(tipo, rng);
  return { tipo, parcelas, resultado: parcelas.reduce((soma, n) => soma + n, 0) };
}

// Quanto os números errados se afastam do certo. Nas contas de dois dígitos, um deles erra a
// dezena, que é o engano de quem esquece o "vai um".
function desvios(tipo: Tipo) {
  if (tipo === "dezenas") return [10, 20, 30];
  if (tipo === "cinco") return [5, 10, 15];
  if (tipo === "dezenaEUnidade" || tipo === "semReserva" || tipo === "comReserva") return [1, 2, 10];
  return [1, 2, 3];
}

// Três renas: a do resultado e duas erradas perto dele. O formato (as duas acima, as duas
// abaixo ou uma de cada lado) é sorteado por igual, para o tamanho do número não entregar a
// resposta.
export function numerosDoGrupo(conta: Conta, rng: Rng): number[] {
  const certo = conta.resultado;
  const distancias = desvios(conta.tipo);
  const formatos = [0, 1, 2].filter((abaixo) => distancias.filter((d) => d < certo).length >= abaixo);
  const abaixo = formatos[sortear(0, formatos.length - 1, rng)];
  const deBaixo = embaralhar(distancias.filter((d) => d < certo), rng).slice(0, abaixo);
  const deCima = embaralhar(distancias, rng).slice(0, 2 - abaixo);
  return [certo, ...deBaixo.map((d) => certo - d), ...deCima.map((d) => certo + d)];
}

let contadorGlobal = 0;

function novoGrupo(noite: Noite, rng: Rng): Grupo {
  const numeros = numerosDoGrupo(noite.conta, rng);
  const faixas = embaralhar(FAIXAS, rng);
  return {
    id: ++noite.contador,
    x: camera(noite) + noite.largura + 6,
    membros: numeros.map((valor, i) => ({ valor, y: faixas[i], jeito: sortear(0, JEITOS_DE_RENA - 1, rng) })),
  };
}

function novaCasa(noite: Noite, x: number, rng: Rng): Casa {
  const largura = sortear(20, 28, rng);
  const altura = sortear(11, 20, rng);
  const parede = CHAO - altura;
  const lado = rng() < 0.5 ? -1 : 1;
  const chamine = x + largura / 2 + lado * largura * sortear(18, 28, rng) * 0.01;
  return {
    id: ++noite.contador,
    x,
    largura,
    parede,
    chamine,
    // A chaminé passa um pouco do telhado.
    topoDaChamine: parede - sortear(9, 12, rng),
    jeito: sortear(0, 5, rng),
    servida: false,
  };
}

export function novaNoite(numero: number, oficina: Oficina, largura: number, rng: Rng = Math.random): Noite {
  const config = configDaFase(numero);
  const conta = novaConta(config.tipos, [], null, rng);
  const noite: Noite = {
    config,
    modo: "renas",
    tempo: 0,
    x: 0,
    y: FAIXAS[1],
    v: 0,
    embalo: 0,
    tranco: 1,
    renas: [],
    conta,
    usadas: [chave(conta.parcelas)],
    grupo: null,
    espera: 1.2,
    casas: [],
    proximaCasa: 30,
    presentes: [],
    saco: capacidade(oficina),
    entregues: 0,
    acertos: 0,
    erros: 0,
    recarga: 0,
    largura,
    acabou: false,
    contador: ++contadorGlobal * 100000,
  };
  noite.embalo = noite.v = velocidadeAlvo(noite, oficina);
  return noite;
}

// Dinheiro para quem continua de uma fase adiantada: mais ou menos o que teria juntado até lá.
export function verbaDaFase(numero: number) {
  let soma = 0;
  for (let f = 1; f < Math.min(numero, ULTIMA_FASE + 1); f++) soma += configDaFase(f).meta * MOEDAS_POR_PRESENTE * 1.3;
  return Math.round(soma / 10) * 10;
}

export function novoJogo(numero: number, largura = 90, rng: Rng = Math.random): Estado {
  const oficina = novaOficina();
  return {
    fase: numero,
    vidas: VIDAS_INICIAIS,
    pontos: 0,
    moedas: verbaDaFase(numero),
    oficina,
    noite: novaNoite(numero, oficina, largura, rng),
  };
}

export function prepararNoite(estado: Estado, largura = estado.noite.largura, rng: Rng = Math.random) {
  estado.noite = novaNoite(estado.fase, estado.oficina, largura, rng);
}

// A rena que a ponta do time encosta, se alguma.
function renaNaPonta(noite: Noite, grupo: Grupo) {
  return grupo.membros.find((rena) => Math.abs(rena.y - noite.y) < ALCANCE_DA_RENA) ?? null;
}

function resolverGrupo(estado: Estado, grupo: Grupo, rng: Rng): Evento[] {
  const { noite } = estado;
  const rena = renaNaPonta(noite, grupo);
  noite.grupo = null;
  if (!rena) {
    noite.espera = 0.5;
    return [{ tipo: "passou", grupo }];
  }
  if (rena.valor !== noite.conta.resultado) {
    noite.erros++;
    noite.tranco = TRANCO;
    // A mesma conta volta no próximo grupo, com outros números errados.
    noite.espera = 0.9;
    // Passadas as primeiras noites, o susto espanta a última rena do time. Sem isso, pegar
    // qualquer uma também completava o time, só que mais devagar.
    const fugiu = estado.fase > ULTIMA_FASE_MANSA ? (noite.renas.pop() ?? null) : null;
    return [{ tipo: "errou", grupo, rena, conta: noite.conta, fugiu }];
  }
  noite.acertos++;
  noite.renas.push({ jeito: rena.jeito });
  estado.pontos += PONTOS_POR_RENA;
  const eventos: Evento[] = [{ tipo: "pegou", grupo, rena }];
  if (noite.renas.length >= noite.config.renas) {
    noite.modo = "entrega";
    noite.tempo = 0;
    eventos.push({ tipo: "completo" });
    return eventos;
  }
  noite.conta = novaConta(noite.config.tipos, noite.usadas, noite.conta.tipo, rng);
  noite.usadas.push(chave(noite.conta.parcelas));
  // Um respiro para ler a conta nova antes de o próximo grupo aparecer.
  noite.espera = 1;
  return eventos;
}

function moverPresentes(estado: Estado, dt: number, eventos: Evento[]) {
  const { noite } = estado;
  noite.presentes = noite.presentes.filter((presente) => {
    const antes = presente.y;
    presente.vy += GRAVIDADE * dt;
    presente.x += presente.vx * dt;
    presente.y += presente.vy * dt;
    for (const casa of noite.casas) {
      if (antes > casa.topoDaChamine || presente.y < casa.topoDaChamine) continue;
      if (Math.abs(presente.x - casa.chamine) > LARGURA_DA_CHAMINE / 2 + FOLGA_DA_CHAMINE || casa.servida) continue;
      casa.servida = true;
      noite.entregues++;
      estado.moedas += MOEDAS_POR_PRESENTE;
      estado.pontos += PONTOS_POR_PRESENTE;
      eventos.push({ tipo: "entregou", presente, casa, meta: noite.entregues === noite.config.meta });
      return false;
    }
    const embaixo = noite.casas.find((casa) => presente.x >= casa.x && presente.x <= casa.x + casa.largura);
    if (presente.y >= (embaixo ? embaixo.parede : CHAO)) {
      eventos.push({ tipo: "caiu", presente });
      return false;
    }
    return true;
  });
}

function construir(noite: Noite, rng: Rng) {
  const horizonte = camera(noite) + noite.largura + 40;
  while (noite.proximaCasa < horizonte) {
    const casa = novaCasa(noite, noite.proximaCasa, rng);
    noite.casas.push(casa);
    noite.proximaCasa = casa.x + casa.largura + sortear(noite.config.vao[0], noite.config.vao[1], rng);
  }
  // As que ficaram para trás saem da lista: o desenho apaga as que sumiram dela.
  noite.casas = noite.casas.filter((casa) => casa.x + casa.largura > camera(noite) - 20);
}

// Onde um presente solto agora encontra a altura da chaminé da casa.
export function ondeCai(noite: Noite, oficina: Oficina, casa: Casa) {
  const { x, y } = bocaDoSaco(noite, oficina);
  return x + noite.v * Math.sqrt((2 * Math.max(0, casa.topoDaChamine - y)) / GRAVIDADE);
}

export const chamineChegando = (noite: Noite, oficina: Oficina) =>
  noite.casas.some((casa) => !casa.servida && Math.abs(ondeCai(noite, oficina, casa) - casa.chamine) <= PERTO_DA_CHAMINE);

// Presentes só na entrega, com o time completo.
export function soltarPresente(estado: Estado, rng: Rng = Math.random): Presente | null {
  const { noite, oficina } = estado;
  if (noite.acabou || noite.modo !== "entrega" || noite.saco <= 0) return null;
  if (noite.recarga > 0 || noite.presentes.length > 0 || !chamineChegando(noite, oficina)) return null;
  const { x, y } = bocaDoSaco(noite, oficina);
  const presente = { id: ++noite.contador, x, y, vx: noite.v, vy: 0, jeito: sortear(0, 3, rng) };
  noite.saco--;
  noite.recarga = RECARGA_DO_PRESENTE;
  noite.presentes.push(presente);
  return presente;
}

export function passo(estado: Estado, comando: Comando, dt: number, rng: Rng = Math.random): Evento[] {
  const { noite, oficina } = estado;
  if (noite.acabou) return [];
  const eventos: Evento[] = [];
  const entregando = noite.modo === "entrega";

  if (entregando) noite.tempo += dt;
  noite.recarga = Math.max(0, noite.recarga - dt);
  noite.tranco = Math.min(1, noite.tranco + dt / RECUPERA_DO_TRANCO);

  if (comando.altura !== null) {
    const alvo = Math.min(PISO, Math.max(TETO, comando.altura));
    const sobe = SUBIDA * dt;
    noite.y += Math.max(-sobe, Math.min(sobe, alvo - noite.y));
  }

  // O embalo chega aos poucos na velocidade nova, para o trenó não dar trancos.
  noite.embalo += (velocidadeAlvo(noite, oficina) - noite.embalo) * Math.min(1, dt * 1.2);
  noite.v = noite.embalo * noite.tranco;
  noite.x += noite.v * dt;

  if (!entregando) {
    if (noite.grupo) {
      const grupo = noite.grupo;
      // As renas voam até o trenó, mais rápido quanto mais renas ele já tem.
      const chegada = APROXIMACAO + ACELERA_POR_RENA * noite.renas.length;
      grupo.x -= Math.max(0, chegada - noite.v) * dt;
      if (grupo.x <= noite.x) eventos.push(...resolverGrupo(estado, grupo, rng));
    } else {
      noite.espera -= dt;
      if (noite.espera <= 0) {
        noite.grupo = novoGrupo(noite, rng);
        eventos.push({ tipo: "grupo", grupo: noite.grupo });
      }
    }
  }

  construir(noite, rng);

  if (comando.soltar) {
    const presente = soltarPresente(estado, rng);
    if (presente) eventos.push({ tipo: "soltou", presente });
  }
  moverPresentes(estado, dt, eventos);

  const semPresentes = noite.saco === 0 && noite.presentes.length === 0;
  if (noite.modo === "entrega" && (noite.tempo >= noite.config.noite || semPresentes)) {
    noite.acabou = true;
    eventos.push({ tipo: "amanheceu" });
  }
  return eventos;
}

export type Resultado = {
  passou: boolean;
  perdeuVida: boolean;
  zerou: boolean;
  entregues: number;
  meta: number;
  // Toda rena que entrou foi a certa.
  perfeita: boolean;
};

export function encerrar(estado: Estado): Resultado {
  const { noite } = estado;
  const passou = noite.entregues >= noite.config.meta;
  const perdeuVida = !passou && estado.fase > ULTIMA_FASE_MANSA;
  const zerou = passou && estado.fase >= ULTIMA_FASE;
  if (perdeuVida) estado.vidas--;
  // Quem zerou fica na última fase: o progresso nunca oferece uma fase que não existe.
  if (passou && !zerou) estado.fase++;
  return {
    passou,
    perdeuVida,
    zerou,
    entregues: noite.entregues,
    meta: noite.config.meta,
    perfeita: noite.erros === 0 && noite.acertos > 0,
  };
}

// Oficina
export type Compra = { tipo: "treno"; id: TrenoId } | { tipo: "melhoria"; id: MelhoriaId };

export function precoDe(oficina: Oficina, compra: Compra): number | null {
  if (compra.tipo === "treno") return oficina.trenos.includes(compra.id) ? null : TRENOS[compra.id].preco;
  return MELHORIAS[compra.id].precos[oficina.niveis[compra.id]] ?? null;
}

export function comprar(estado: Estado, compra: Compra): "comprou" | "falta" | "nada" {
  const preco = precoDe(estado.oficina, compra);
  if (preco === null) return "nada";
  if (preco > estado.moedas) return "falta";
  estado.moedas -= preco;
  if (compra.tipo === "treno") {
    estado.oficina.trenos.push(compra.id);
    usarTreno(estado, compra.id);
    // O trenó novo chega com a cor dele, e a criança pinta depois se quiser.
    estado.oficina.cor = TRENOS[compra.id].cor;
  } else {
    estado.oficina.niveis[compra.id]++;
  }
  return "comprou";
}

export function usarTreno(estado: Estado, id: TrenoId) {
  if (!estado.oficina.trenos.includes(id)) return;
  estado.oficina.treno = id;
}

export function pintar(estado: Estado, cor: string) {
  estado.oficina.cor = cor;
}
