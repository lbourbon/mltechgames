import { expect, test } from "vitest";
import { sortear, type Rng } from "../../src/jogos/kit/sorteio";
import {
  cartaAtual,
  configDaFase,
  entregar,
  escolherNaCasa,
  novaFase,
  novoJogo,
  pedidoAtual,
  por,
  solucoes,
  somaDe,
  tirar,
  ULTIMA_FASE_MANSA,
  ULTIMA_FASE_NOVA,
  VIDAS_INICIAIS,
  type Cor,
  type Estado,
  type Jogada,
} from "../../src/jogos/fabrica/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES = Array.from({ length: ULTIMA_FASE_NOVA + 2 }, (_, i) => i + 1);

const montar = (estado: Estado, pacote: Cor[]) => pacote.reduce(por, estado);

// O valor de cada cor como a criança descobre: as que se veem direto, e as escondidas pelas pistas, em ordem.
function deduzir(estado: Estado) {
  const sabe = new Map<Cor, number>(
    estado.cores.filter((cor) => !estado.escondidas.includes(cor)).map((cor) => [cor, estado.valores[cor]]),
  );
  for (const { cores, total } of estado.pistas) {
    const faltam = cores.filter((cor) => !sabe.has(cor));
    const conhecido = cores.filter((cor) => sabe.has(cor)).reduce((soma, cor) => soma + sabe.get(cor)!, 0);
    expect(new Set(faltam).size).toBe(1);
    sabe.set(faltam[0], (total - conhecido) / faltam.length);
  }
  return sabe;
}

type Bot = (estado: Estado, tentadas: Set<string>, rng: Rng) => Cor[];

const pensando: Bot = (estado) => {
  const sabe = deduzir(estado);
  const valores = Object.fromEntries(sabe) as Record<Cor, number>;
  return solucoes([...sabe.keys()], valores, cartaAtual(estado).vagas, cartaAtual(estado).alvo)[0];
};

// Chuta pacotes ao acaso, mas nunca repete um que já errou no mesmo bilhete.
const chutando: Bot = (estado, tentadas, rng) => {
  for (;;) {
    const pacote = Array.from({ length: cartaAtual(estado).vagas }, () => estado.cores[sortear(0, estado.cores.length - 1, rng)]);
    const chave = [...pacote].sort().join();
    if (!tentadas.has(chave)) return pacote;
  }
};

// Usa só as cores que mostram o número, sem ler a pista.
const semPista: Bot = (estado, tentadas, rng) => {
  const conhecidas = estado.cores.filter((cor) => !estado.escondidas.includes(cor));
  const certa = solucoes(conhecidas, estado.valores, cartaAtual(estado).vagas, cartaAtual(estado).alvo)[0];
  return certa ?? chutando(estado, tentadas, rng);
};

// Joga a fábrica da noite inteira. Devolve o estado na entrega, ou null se os corações acabaram.
function jogarFabrica(estado: Estado, bot: Bot, rng: Rng): Estado | null {
  let tentadas = new Set<string>();
  for (;;) {
    const pacote = bot(estado, tentadas, rng);
    const jogada: Jogada = entregar(montar(estado, pacote), rng);
    if (jogada.resultado === "fim") return null;
    if (jogada.resultado === "errado") {
      tentadas.add([...pacote].sort().join());
      estado = { ...jogada.estado, pacote: jogada.estado.pacote.map(() => null) };
      continue;
    }
    tentadas = new Set();
    estado = jogada.estado;
    if (jogada.resultado === "saco-cheio") return estado;
  }
}

test("cada noite sorteia valores diferentes para cores diferentes", () => {
  const rng = semente(1);
  for (const fase of FASES) {
    const estado = novaFase(fase, 3, 0, rng);
    const config = configDaFase(fase);
    const valores = estado.cores.map((cor) => estado.valores[cor]);
    expect(new Set(valores).size).toBe(config.cores);
    valores.forEach((valor) => {
      expect(valor).toBeGreaterThanOrEqual(config.min);
      expect(valor).toBeLessThanOrEqual(config.max);
    });
    expect(estado.cartas).toHaveLength(config.cartas);
    expect(estado.escondidas).toHaveLength(config.escondidas);
  }
});

test("todo bilhete tem solução, e nas noites com mistério toda solução usa o misterioso", () => {
  const rng = semente(2);
  for (const fase of FASES) {
    for (let i = 0; i < 40; i++) {
      const estado = novaFase(fase, 3, 0, rng);
      const conhecidas = estado.cores.filter((cor) => !estado.escondidas.includes(cor));
      for (const { alvo, vagas } of estado.cartas) {
        expect(solucoes(estado.cores, estado.valores, vagas, alvo).length).toBeGreaterThan(0);
        if (estado.escondidas.length > 0) expect(solucoes(conhecidas, estado.valores, vagas, alvo)).toEqual([]);
      }
    }
  }
});

test("as pistas descobrem os misteriosos, um de cada vez", () => {
  const rng = semente(3);
  for (const fase of FASES) {
    for (let i = 0; i < 40; i++) {
      const estado = novaFase(fase, 3, 0, rng);
      expect(estado.pistas).toHaveLength(estado.escondidas.length);
      const sabe = deduzir(estado);
      estado.cores.forEach((cor) => expect(sabe.get(cor)).toBe(estado.valores[cor]));
    }
  }
});

test("bilhetes da mesma noite não repetem o número", () => {
  const rng = semente(4);
  for (const fase of FASES) {
    for (let i = 0; i < 40; i++) {
      const alvos = novaFase(fase, 3, 0, rng).cartas.map((carta) => carta.alvo);
      expect(new Set(alvos).size).toBe(alvos.length);
    }
  }
});

test("o presente vai para o primeiro lugar vazio, e tirar deixa os outros no lugar", () => {
  let estado = novoJogo(4, semente(5));
  const [a, b, c] = estado.cores;
  estado = por(por(por(estado, a), b), c);
  expect(estado.pacote).toEqual([a, b, c]);
  expect(por(estado, a)).toBe(estado);
  estado = tirar(estado, 1);
  expect(estado.pacote).toEqual([a, null, c]);
  expect(por(estado, c).pacote).toEqual([a, c, c]);
});

test("pacote incompleto não sai, e o errado diz se passou ou faltou", () => {
  let estado = novoJogo(3, semente(6));
  expect(entregar(por(estado, estado.cores[0])).resultado).toBe("incompleto");

  const { alvo, vagas } = cartaAtual(estado);
  const errado = (["passou", "faltou"] as const).map((lado) => {
    const tudo: Cor[][] = [];
    const juntar = (pacote: Cor[]) => (pacote.length === vagas ? tudo.push(pacote) : estado.cores.forEach((cor) => juntar([...pacote, cor])));
    juntar([]);
    return tudo.find((pacote) => (lado === "passou" ? somaDe(pacote, estado.valores) > alvo : somaDe(pacote, estado.valores) < alvo));
  });
  for (const [i, pacote] of errado.entries()) {
    if (!pacote) continue;
    const jogada = entregar(montar(estado, pacote));
    expect(jogada.resultado).toBe("errado");
    expect(jogada.problema).toBe(i === 0 ? "passou" : "faltou");
    expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
    // O pacote errado fica para consertar.
    expect(jogada.estado.pacote).toEqual(pacote);
    estado = { ...jogada.estado, pacote: jogada.estado.pacote.map(() => null), vidas: VIDAS_INICIAIS };
  }
});

test(`até a fase ${ULTIMA_FASE_MANSA}, o pacote errado não custa coração`, () => {
  for (let fase = 1; fase <= ULTIMA_FASE_MANSA; fase++) {
    const estado = novoJogo(fase, semente(fase));
    const { alvo } = cartaAtual(estado);
    const errado = solucoes(estado.cores, estado.valores, cartaAtual(estado).vagas, alvo + 1)[0]
      ?? Array.from({ length: cartaAtual(estado).vagas }, () => estado.cores[0]);
    const jogada = entregar(montar(estado, errado));
    if (jogada.resultado === "errado") expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
  }
});

test("quem descobre os valores enche o saco de toda noite sem errar e entrega tudo", () => {
  const rng = semente(7);
  for (let rodada = 0; rodada < 30; rodada++) {
    let estado = novoJogo(1, rng);
    for (const fase of FASES) {
      expect(estado.fase).toBe(fase);
      const naEntrega = jogarFabrica(estado, pensando, rng)!;
      expect(naEntrega.limpa).toBe(true);
      expect(naEntrega.modo).toBe("entrega");
      expect(naEntrega.pedidos).toHaveLength(configDaFase(fase).casas);
      estado = naEntrega;
      for (;;) {
        const sabe = deduzir(estado);
        const { numero } = pedidoAtual(estado);
        const cor = [...sabe.entries()].find(([, valor]) => valor === numero)![0];
        expect(estado.saco).toContain(cor);
        const jogada = escolherNaCasa(estado, cor, rng);
        estado = jogada.estado;
        if (jogada.resultado === "fase") break;
        expect(jogada.resultado).toBe("entregou");
      }
    }
    expect(estado.vidas).toBe(VIDAS_INICIAIS);
  }
});

test("chutar pacotes não enche o saco depois das noites mansas", () => {
  const rng = semente(8);
  for (let fase = ULTIMA_FASE_MANSA + 1; fase <= ULTIMA_FASE_NOVA; fase++) {
    let venceu = 0;
    for (let i = 0; i < 200; i++) if (jogarFabrica(novaFase(fase, VIDAS_INICIAIS, 0, rng), chutando, rng)) venceu++;
    expect(venceu / 200, `fase ${fase}`).toBeLessThan(0.1);
  }
});

test("quem ignora a pista não passa das noites com mistério", () => {
  const rng = semente(9);
  for (let fase = 1; fase <= ULTIMA_FASE_NOVA; fase++) {
    if (configDaFase(fase).escondidas === 0) continue;
    let venceu = 0;
    for (let i = 0; i < 200; i++) if (jogarFabrica(novaFase(fase, VIDAS_INICIAIS, 0, rng), semPista, rng)) venceu++;
    expect(venceu / 200, `fase ${fase}`).toBeLessThan(0.1);
  }
});

test("na entrega, a cor errada não custa coração e a casa espera", () => {
  const rng = semente(10);
  const estado = jogarFabrica(novoJogo(3, rng), pensando, rng)!;
  const { cor } = pedidoAtual(estado);
  const outra = estado.cores.find((c) => c !== cor)!;
  const jogada = escolherNaCasa(estado, outra, rng);
  expect(jogada.resultado).toBe("outra-casa");
  expect(jogada.estado.vidas).toBe(estado.vidas);
  expect(jogada.estado.casa).toBe(0);
  const depois = escolherNaCasa(jogada.estado, cor, rng);
  expect(depois.ganhou).toBeLessThan(escolherNaCasa(estado, cor, rng).ganhou!);
});

test("cada casa pede uma cor que está no saco", () => {
  const rng = semente(11);
  for (const fase of FASES) {
    const estado = jogarFabrica(novaFase(fase, 3, 0, rng), pensando, rng)!;
    const sobra = [...estado.saco];
    for (const cor of estado.pedidos) {
      const i = sobra.indexOf(cor);
      expect(i).toBeGreaterThanOrEqual(0);
      sobra.splice(i, 1);
    }
  }
});
