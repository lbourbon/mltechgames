import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import { CARGAS, doEstado, ESTADOS, paraACapital, paraOEstado, SIGLAS, type Sigla } from "../../src/jogos/caminhao/estados";
import { CONTORNOS } from "../../src/jogos/caminhao/contornos";
import {
  andar,
  bonusDaFase,
  configDaFase,
  daParaChegar,
  distancia,
  gerarViagem,
  menorRota,
  novaFase,
  pedirDica,
  rotaEmOrdem,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  vizinhos,
  type Estado,
  type Viagem,
} from "../../src/jogos/caminhao/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 15];

// Leva queijo de Minas para o Rio Grande do Sul: MG, SP, PR, SC, RS.
const VIAGEM: Viagem = {
  inicio: "MG",
  pedidos: [{ emoji: "🧀", nome: "queijo", de: "MG", para: "RS" }],
  menor: 4,
  tanque: 5,
};

const jogo = (extra: Partial<Estado> = {}): Estado => ({
  fase: 3,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  viagem: VIAGEM,
  posicao: "MG",
  combustivel: 5,
  situacao: ["levando"],
  visitados: ["MG"],
  dica: false,
  limpa: true,
  ...extra,
});

test("fronteiras são de mão dupla e cobrem os 27 estados", () => {
  expect(SIGLAS).toHaveLength(27);
  for (const sigla of SIGLAS) {
    expect(ESTADOS[sigla].vizinhos.length).toBeGreaterThan(0);
    for (const vizinho of ESTADOS[sigla].vizinhos) expect(ESTADOS[vizinho].vizinhos).toContain(sigla);
    expect(CONTORNOS[sigla]).toMatch(/^M/);
  }
  // Fronteiras que confundem: o DF encosta em Minas, e o Paraná não encosta no Rio Grande do Sul.
  expect(vizinhos("DF", "MG")).toBe(true);
  expect(vizinhos("PR", "RS")).toBe(false);
  expect(vizinhos("AP", "AM")).toBe(false);
});

test("o mapa é todo conectado", () => {
  for (const sigla of SIGLAS) expect(distancia("RS", sigla)).toBeLessThan(Infinity);
  // RS, SC, PR, MS, MT, AM, RR.
  expect(distancia("RS", "RR")).toBe(6);
});

test("nomes com o artigo certo", () => {
  expect(doEstado("PA")).toBe("do Pará");
  expect(doEstado("BA")).toBe("da Bahia");
  expect(doEstado("MG")).toBe("de Minas Gerais");
  expect(paraOEstado("RS")).toBe("para o Rio Grande do Sul");
  expect(paraOEstado("PB")).toBe("para a Paraíba");
  expect(paraOEstado("GO")).toBe("para Goiás");
  expect(paraACapital("BA")).toBe("para Salvador");
  expect(paraACapital("RJ")).toBe("para o Rio de Janeiro");
});

test("cada carga sai de um estado diferente", () => {
  expect(new Set(CARGAS.map((c) => c.de)).size).toBe(CARGAS.length);
});

test("a menor rota leva em conta pegar antes de entregar", () => {
  expect(menorRota(VIAGEM.pedidos, "MG", ["levando"])).toBe(4);
  expect(menorRota(VIAGEM.pedidos, "SP", ["esperando"])).toBe(1 + 4);
  // Pegar os dois antes de entregar pode ser mais curto que um de cada vez.
  const pedidos = [
    { emoji: "🍊", nome: "laranja", de: "SP" as Sigla, para: "BA" as Sigla },
    { emoji: "🧀", nome: "queijo", de: "MG" as Sigla, para: "SE" as Sigla },
  ];
  // SP, MG (pega o queijo), BA (entrega a laranja), SE (entrega o queijo).
  expect(menorRota(pedidos, "SP", ["levando", "esperando"])).toBe(3);
  // SP, MG, BA (laranja), depois volta a MG pelo queijo e segue BA, SE.
  expect(rotaEmOrdem({ inicio: "SP", pedidos })).toBe(2 + 1 + 2);
});

test.each(FASES_TESTADAS)("fase %i gera uma viagem que cabe no tanque", (fase) => {
  const config = configDaFase(fase);
  for (let rodada = 0; rodada < 40; rodada++) {
    const viagem = gerarViagem(fase, semente(fase * 1000 + rodada));
    expect(viagem.pedidos).toHaveLength(config.pedidos);
    const lugares = viagem.pedidos.flatMap((p) => [p.de, p.para]);
    expect(new Set(lugares).size).toBe(lugares.length);
    expect(viagem.menor).toBeGreaterThanOrEqual(config.menor[0]);
    expect(viagem.menor).toBeLessThanOrEqual(config.menor[1]);
    expect(viagem.tanque).toBe(viagem.menor + config.folga);
    if (config.comecaNaOrigem) expect(viagem.inicio).toBe(viagem.pedidos[0].de);
    else expect(lugares).not.toContain(viagem.inicio);
    if (config.planejar) expect(rotaEmOrdem(viagem)).toBeGreaterThan(viagem.tanque);
    const estado = novaFase(fase, 3, 0, semente(rodada));
    expect(daParaChegar(estado)).toBe(true);
  }
});

test("só anda para vizinhos, e cada estado gasta um tanque", () => {
  expect(andar(jogo(), "RS").resultado).toBe("longe");
  expect(andar(jogo(), "MG").resultado).toBe("parado");
  const jogada = andar(jogo(), "SP");
  expect(jogada.resultado).toBe("andou");
  expect(jogada.estado.combustivel).toBe(4);
  expect(jogada.estado.visitados).toEqual(["MG", "SP"]);
});

test("chegar no destino entrega, e entregar tudo passa de fase", () => {
  let estado = jogo({ vidas: 2 });
  for (const sigla of ["SP", "PR", "SC"] as Sigla[]) estado = andar(estado, sigla).estado;
  const fim = andar(estado, "RS", semente(1));
  expect(fim.resultado).toBe("fase");
  expect(fim.entregou).toEqual([0]);
  expect(fim.estado.fase).toBe(4);
  expect(fim.estado.vidas).toBe(3);
  expect(fim.estado.pontos).toBe(bonusDaFase(3, true));
});

test("passar pela origem pega a carga", () => {
  const estado = jogo({ posicao: "SP", situacao: ["esperando"], combustivel: 6, visitados: ["SP"] });
  const jogada = andar(estado, "MG");
  expect(jogada.resultado).toBe("pegou");
  expect(jogada.pegou).toEqual([0]);
  expect(jogada.estado.situacao).toEqual(["levando"]);
});

test("quando o tanque não dá mais para terminar, a viagem recomeça com um coração a menos", () => {
  // Com 5 de tanque e 4 de caminho, ir para a Bahia já não deixa chegar.
  const jogada = andar(jogo(), "BA");
  expect(jogada.resultado).toBe("seco");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(jogada.estado.posicao).toBe("MG");
  expect(jogada.estado.combustivel).toBe(5);
  expect(jogada.estado.visitados).toEqual(["MG"]);
  expect(jogada.estado.limpa).toBe(false);

  expect(andar(jogo({ vidas: 1 }), "BA").resultado).toBe("fim");
  // Um desvio que ainda cabe no tanque é de graça.
  expect(andar(jogo(), "RJ").resultado).toBe("andou");
});

test("nas fases mansas ficar sem combustível só recomeça", () => {
  const jogada = andar(jogo({ fase: ULTIMA_FASE_MANSA }), "BA");
  expect(jogada.resultado).toBe("seco");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS);
});

test("a dica custa só o bônus", () => {
  const estado = pedirDica(jogo());
  expect(estado.dica).toBe(true);
  expect(estado.limpa).toBe(false);
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
});

// Anda sempre para um vizinho qualquer, sem saber onde ficam os estados.
function partidaPerdida(fase: number, fases: number, rng: Rng) {
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
  let vencidas = 0;
  for (let passo = 0; passo < 5000 && vencidas < fases; passo++) {
    const opcoes = ESTADOS[estado.posicao].vizinhos;
    const { estado: depois, resultado } = andar(estado, opcoes[Math.floor(rng() * opcoes.length)], rng);
    if (resultado === "fim") return vencidas;
    if (resultado === "fase") vencidas++;
    estado = depois;
  }
  return vencidas;
}

// Sabe o mapa e sempre dá o passo que mais aproxima do fim.
function partidaSabida(fase: number, fases: number, rng: Rng) {
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
  for (let vencidas = 0; vencidas < fases; ) {
    const melhor = ESTADOS[estado.posicao].vizinhos
      .map((v) => {
        const prova = andar(estado, v, rng);
        const resta = prova.resultado === "fase" ? -1 : menorRota(prova.estado.viagem.pedidos, v, prova.estado.situacao);
        return { v, resta };
      })
      .sort((a, b) => a.resta - b.resta)[0];
    const jogada = andar(estado, melhor.v, rng);
    if (jogada.resultado === "seco" || jogada.resultado === "fim") return false;
    if (jogada.resultado === "fase") vencidas++;
    estado = jogada.estado;
  }
  return true;
}

test("quem sabe o mapa vence sem perder corações", () => {
  for (let rodada = 0; rodada < 10; rodada++) expect(partidaSabida(1, 10, semente(rodada))).toBe(true);
});

test("andar a esmo não leva longe", () => {
  const rodadas = 200;
  let passou = 0;
  for (let rodada = 0; rodada < rodadas; rodada++) {
    if (partidaPerdida(ULTIMA_FASE_MANSA + 1, 2, semente(700 + rodada)) >= 2) passou++;
  }
  expect(passou / rodadas).toBeLessThan(0.05);
});

test("os contornos da página são os mesmos estados", () => {
  const pagina = readFileSync("src/pages/jogos/caminhao.astro", "utf8");
  expect(pagina).toContain("CONTORNOS");
});
