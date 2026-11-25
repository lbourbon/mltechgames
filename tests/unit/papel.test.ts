import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  abrir,
  abrirPapel,
  casaDe,
  configDaFase,
  cortar,
  cortesDoMolde,
  dica,
  dobrar,
  dobrasDo,
  espelhos,
  gerarMolde,
  inteiro,
  naDobradura,
  novaFase,
  novoJogo,
  podeDobrar,
  restantes,
  simetriaDe,
  tesouradas,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  type Dobra,
  type Estado,
  type Grupo,
} from "../../src/jogos/papel/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 14];
const i6 = (x: number, y: number) => y * 6 + x;

// Dobra o que der, na ordem pedida, e corta o que couber: é como a criança faz.
function fazer(estado: Estado, dobras: Dobra[], cortes: number[]) {
  for (const dobra of dobras) estado = dobrar(estado, dobra);
  for (const corte of cortes) estado = cortar(estado, corte);
  return estado;
}

// Quem enxerga os espelhos do molde: dobra neles e corta uma casa de cada grupo.
function porSimetria(estado: Estado) {
  const { furos, lado } = estado.molde;
  const dobras = dobrasDo(simetriaDe(furos, lado));
  return fazer(estado, dobras, cortesDoMolde(furos, dobras, lado));
}

test("um corte no papel dobrado fura todos os espelhos da casa", () => {
  expect(abrir(["V"], [i6(0, 0)], 6)).toEqual([i6(0, 0), i6(5, 0)]);
  expect(abrir(["V", "H"], [i6(1, 1)], 6)).toEqual([i6(1, 1), i6(4, 1), i6(1, 4), i6(4, 4)]);
  expect(abrir(["D"], [i6(0, 2)], 6)).toEqual([i6(2, 0), i6(0, 2)]);
  // Na diagonal, a casa é espelho dela mesma.
  expect(abrir(["D"], [i6(3, 3)], 6)).toEqual([i6(3, 3)]);
  expect(espelhos(["V", "H", "D"], { x: 0, y: 1 }, 6)).toHaveLength(8);
});

test("a diagonal só dobra papel quadrado, e depois dela nada mais dobra", () => {
  expect(podeDobrar([], "D")).toBe(true);
  expect(podeDobrar(["V"], "D")).toBe(false);
  expect(podeDobrar(["V", "H"], "D")).toBe(true);
  expect(podeDobrar(["D"], "V")).toBe(false);
  expect(podeDobrar(["V"], "V")).toBe(false);
});

test("a dobradura de cada grupo de dobras cobre exatamente um furo de cada grupo de espelhos", () => {
  const lado = 8;
  for (const grupo of ["", "V", "H", "VH", "D", "VHD"] as Grupo[]) {
    const dobras = dobrasDo(grupo);
    const vistas = new Set<number>();
    for (let i = 0; i < lado * lado; i++) {
      const grupoDaCasa = espelhos(dobras, casaDe(i, lado), lado);
      const dentro = grupoDaCasa.filter((j) => naDobradura(dobras, casaDe(j, lado), lado));
      expect(dentro).toHaveLength(1);
      vistas.add(dentro[0]);
    }
    expect(vistas.size).toBe(Array.from({ length: lado * lado }).filter((_, i) => naDobradura(dobras, casaDe(i, lado), lado)).length);
  }
});

test("papel que caiu em pedaços não é inteiro", () => {
  expect(inteiro([], 4)).toBe(true);
  // A coluna do meio inteira furada divide o papel em dois.
  expect(inteiro([1, 5, 9, 13], 4)).toBe(false);
});

test.each(FASES_TESTADAS)("fase %i: o molde só aceita as dobras do grupo, e dobrar menos estoura a tesoura", (fase) => {
  const rng = semente(fase);
  const { grupos, lado, folga } = configDaFase(fase);
  for (let i = 0; i < 60; i++) {
    const molde = gerarMolde(fase, rng);
    expect(grupos).toContain(molde.grupo);
    expect(molde.lado).toBe(lado);
    expect(simetriaDe(molde.furos, lado)).toBe(molde.grupo);
    expect(inteiro(molde.furos, lado)).toBe(true);
    const certas = tesouradas(molde.furos, dobrasDo(molde.grupo), lado);
    expect(certas + folga).toBe(molde.limite);
    // Sem dobra nenhuma, não dá para recortar furo por furo.
    expect(tesouradas(molde.furos, [], lado)).toBeGreaterThan(molde.limite);
    for (const dobra of ["V", "H"] as Dobra[]) {
      const parte = dobrasDo(molde.grupo).filter((outra) => outra === dobra);
      if (molde.grupo.length > 1 && parte.length) expect(tesouradas(molde.furos, parte, lado)).toBeGreaterThan(molde.limite);
    }
  }
});

test("quem dobra nos espelhos do molde vence todas as fases sem perder coração", () => {
  let estado = novoJogo(1, semente(3));
  const rng = semente(4);
  while (estado.fase <= 10) {
    estado = porSimetria(estado);
    const { resultado, estado: depois } = abrirPapel(estado, rng);
    expect(["igual", "fase"]).toContain(resultado);
    estado = depois;
  }
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
});

test("sem dobrar, a tesoura acaba antes do molde em todas as fases", () => {
  for (const fase of FASES_TESTADAS) {
    const rng = semente(fase * 11);
    for (let i = 0; i < 30; i++) {
      const estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
      const cortado = fazer(estado, [], estado.molde.furos);
      expect(restantes(cortado)).toBe(0);
      expect(abrirPapel(cortado, rng).resultado).not.toMatch(/igual|fase/);
    }
  }
});

test("dobrar em todos os espelhos que der só funciona quando o molde tem os três", () => {
  for (const fase of FASES_TESTADAS) {
    const rng = semente(fase * 13);
    for (let i = 0; i < 30; i++) {
      const estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
      const { furos, lado, grupo } = estado.molde;
      const tudo: Dobra[] = ["V", "H", "D"];
      const cortes = furos.filter((furo) => naDobradura(tudo, casaDe(furo, lado), lado));
      const certo = ["igual", "fase"].includes(abrirPapel(fazer(estado, tudo, cortes), rng).resultado);
      expect(certo).toBe(grupo === "VHD");
    }
  }
});

test("a dica leva ao molde mesmo partindo de um papel estragado", () => {
  const rng = semente(21);
  for (const fase of FASES_TESTADAS) {
    let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    // Dobra errada e um corte qualquer.
    estado = fazer(estado, estado.molde.grupo === "V" ? ["H"] : ["V"], [0]);
    for (let passo = 0; passo < 30; passo++) estado = dica(estado);
    expect(estado.limpa).toBe(false);
    expect(["igual", "fase"]).toContain(abrirPapel(estado, rng).resultado);
  }
});

test("papel diferente do molde só custa coração depois das fases mansas, e a partida acaba sem corações", () => {
  const rng = semente(5);
  // Um furo só nunca é o molde, que sempre tem vários.
  const errar = (estado: Estado) => abrirPapel(fazer(estado, [], [0]), rng);
  const tentativa = errar(novaFase(ULTIMA_FASE_MANSA, VIDAS_INICIAIS, 0, rng));
  expect(tentativa.resultado).toBe("diferente");
  expect(tentativa.estado.vidas).toBe(VIDAS_INICIAIS);
  expect(tentativa.estado.cortes).toEqual([]);

  let estado = novaFase(ULTIMA_FASE_MANSA + 1, 1, 0, rng);
  const fim = errar(estado);
  expect(fim.resultado).toBe("fim");
  estado = novaFase(ULTIMA_FASE_MANSA + 1, 2, 0, rng);
  expect(errar(estado).estado.vidas).toBe(1);
});

test("a fase troca depois de todos os papéis, devolve um coração e paga o bônus de quem não errou", () => {
  const rng = semente(8);
  let estado = novaFase(3, 2, 0, rng);
  const papeis = configDaFase(3).papeis;
  for (let i = 0; i < papeis - 1; i++) {
    const jogada = abrirPapel(porSimetria(estado), rng);
    expect(jogada.resultado).toBe("igual");
    expect(jogada.estado.feitos).toBe(i + 1);
    estado = jogada.estado;
  }
  const antes = estado.pontos;
  const ultima = abrirPapel(porSimetria(estado), rng);
  expect(ultima.resultado).toBe("fase");
  expect(ultima.estado.fase).toBe(4);
  expect(ultima.estado.vidas).toBe(3);
  expect(ultima.estado.pontos).toBeGreaterThan(antes + 3 * 10);
});

test("depois do primeiro corte o papel não dobra mais, e a tesoura para no limite", () => {
  const rng = semente(9);
  let estado = novaFase(1, VIDAS_INICIAIS, 0, rng);
  estado = cortar(estado, 0);
  expect(dobrar(estado, "V")).toBe(estado);
  for (let i = 1; i < 36; i++) estado = cortar(estado, i);
  expect(estado.cortes).toHaveLength(estado.molde.limite);
  // Fora da dobradura a tesoura não alcança.
  const dobrado = dobrar(novaFase(1, VIDAS_INICIAIS, 0, rng), "V");
  expect(cortar(dobrado, i6(5, 0))).toBe(dobrado);
});

test("gerar os moldes é rápido", () => {
  const rng = semente(17);
  const inicio = performance.now();
  for (let i = 0; i < 200; i++) gerarMolde(8, rng);
  expect((performance.now() - inicio) / 200).toBeLessThan(20);
});
