import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  bater,
  cartasUsadas,
  concluir,
  darDica,
  etapaDaFase,
  gerarFase,
  LADO,
  menorCaminho,
  novaFase,
  novoJogo,
  pontosDaFase,
  rodar,
  cabeNaRota,
  SEMPRE,
  VIDAS_INICIAIS,
  type Carta,
  type Mapa,
  type Rota,
} from "../../src/jogos/submarino/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Submarino em (0,0) olhando para o leste.
const mapa = (extra: Partial<Mapa> = {}): Mapa => ({
  lado: LADO,
  inicio: { x: 0, y: 0 },
  direcao: 1,
  tesouros: [{ x: 2, y: 0 }],
  pedras: [],
  ...extra,
});

const rota = (extra: Partial<Rota> = {}): Rota => ({ principal: [], laco: [], truque: [], vezes: 2, ...extra });

test("anda, vira e pega o último tesouro, o que encerra a rota", () => {
  const alvo = mapa({ tesouros: [{ x: 1, y: 1 }] });
  const { passos, resultado } = rodar(alvo, rota({ principal: ["frente", "direita", "frente", "frente"] }));
  expect(resultado).toBe("venceu");
  expect(passos).toHaveLength(3);
  expect(passos.at(-1)).toMatchObject({ x: 1, y: 1, direcao: 2, pegou: 0 });
});

test("bater na pedra ou na parede para o submarino no lugar", () => {
  const pedra = rodar(mapa({ pedras: [{ x: 1, y: 0 }] }), rota({ principal: ["frente"] }));
  expect(pedra.resultado).toBe("bateu");
  expect(pedra.passos.at(-1)).toMatchObject({ x: 0, y: 0, indice: 0 });
  expect(rodar(mapa(), rota({ principal: ["esquerda", "frente"] })).resultado).toBe("bateu");
});

test("acabar a rota sem pegar tudo não é batida", () => {
  expect(rodar(mapa(), rota({ principal: ["frente"] })).resultado).toBe("faltou");
  expect(rodar(mapa(), rota()).resultado).toBe("faltou");
});

test("a repetição toca a fileira o número de vezes escolhido", () => {
  const alvo = mapa({ tesouros: [{ x: 6, y: 0 }] });
  const fileira: Carta[] = ["frente", "frente"];
  expect(rodar(alvo, rota({ principal: ["laco"], laco: fileira, vezes: 2 })).resultado).toBe("faltou");
  expect(rodar(alvo, rota({ principal: ["laco"], laco: fileira, vezes: 3 })).resultado).toBe("venceu");
});

test("o truque toca a mesma fileira de cada lugar onde foi usado", () => {
  const alvo = mapa({ tesouros: [{ x: 4, y: 0 }] });
  const { resultado, passos } = rodar(alvo, rota({ principal: ["truque", "truque"], truque: ["frente", "frente"] }));
  expect(resultado).toBe("venceu");
  expect(passos.map((passo) => passo.trilho)).toEqual(["truque", "truque", "truque", "truque"]);
});

test("o truque também funciona dentro da repetição", () => {
  const alvo = mapa({ tesouros: [{ x: 6, y: 0 }] });
  const dupla = rota({ principal: ["laco"], laco: ["truque"], truque: ["frente", "frente"], vezes: 3 });
  expect(rodar(alvo, dupla).resultado).toBe("venceu");
});

test("cada passo conta a volta e as cartas que levaram até ele", () => {
  const alvo = mapa({ tesouros: [{ x: 6, y: 6 }] });
  const dentro = rota({ principal: ["direita", "laco"], laco: ["truque"], truque: ["frente"], vezes: 2 });
  const { passos } = rodar(alvo, dentro);
  expect(passos.map(({ volta }) => volta)).toEqual([0, 1, 2]);
  expect(passos[0].chamadas).toEqual([]);
  expect(passos[2].chamadas).toEqual([
    { trilho: "principal", indice: 1 },
    { trilho: "laco", indice: 0 },
  ]);
});

test("a contagem de voltas zera ao sair da repetição", () => {
  const alvo = mapa({ tesouros: [{ x: 6, y: 6 }] });
  const { passos } = rodar(alvo, rota({ principal: ["laco", "direita"], laco: ["frente"], vezes: 2 }));
  expect(passos.map(({ volta }) => volta)).toEqual([1, 2, 0]);
});

test("o sensor só vira com pedra ou parede bem à frente", () => {
  const sensor = rota({ principal: ["seDireita", "frente"] });
  const livre = rodar(mapa({ tesouros: [{ x: 1, y: 0 }] }), sensor);
  expect(livre.resultado).toBe("venceu");
  expect(livre.passos[0].disparou).toBe(false);

  const comPedra = rodar(mapa({ pedras: [{ x: 1, y: 0 }], tesouros: [{ x: 0, y: 1 }] }), sensor);
  expect(comPedra.resultado).toBe("venceu");
  expect(comPedra.passos[0].disparou).toBe(true);

  const naParede = rodar(mapa({ direcao: 0, tesouros: [{ x: 1, y: 0 }] }), sensor);
  expect(naParede.resultado).toBe("venceu");
});

test("repetir sempre para ao achar tudo ou ao bater", () => {
  const fileira: Carta[] = ["frente"];
  expect(rodar(mapa(), rota({ principal: ["laco"], laco: fileira, vezes: SEMPRE })).resultado).toBe("venceu");
  const longe = mapa({ tesouros: [{ x: 3, y: 3 }] });
  expect(rodar(longe, rota({ principal: ["laco"], laco: fileira, vezes: SEMPRE })).resultado).toBe("bateu");
});

test("repetir sempre percebe que está andando em círculos", () => {
  const longe = mapa({ tesouros: [{ x: 5, y: 5 }] });
  const cruzando = rota({ principal: ["laco"], laco: ["frente", "direita"], vezes: SEMPRE });
  const { resultado, passos } = rodar(longe, cruzando);
  expect(resultado).toBe("circulos");
  expect(passos.length).toBeLessThan(20);
  expect(rodar(longe, rota({ principal: ["laco"], laco: ["direita"], vezes: SEMPRE })).resultado).toBe("circulos");
  expect(rodar(longe, rota({ principal: ["laco"], laco: ["seDireita"], vezes: SEMPRE })).resultado).toBe("circulos");
  expect(rodar(longe, rota({ principal: ["laco"], vezes: SEMPRE })).resultado).toBe("circulos");
});

test("repetir um número fixo de vezes termina mesmo voltando ao mesmo lugar", () => {
  const longe = mapa({ tesouros: [{ x: 5, y: 5 }] });
  const { passos, resultado } = rodar(longe, rota({ principal: ["laco"], laco: ["direita"], vezes: 6 }));
  expect(resultado).toBe("faltou");
  expect(passos).toHaveLength(6);
});

test("nenhuma fileira chama a si mesma", () => {
  expect(cabeNaRota(rota(), "principal", "laco")).toBe(true);
  expect(cabeNaRota(rota(), "principal", "truque")).toBe(true);
  expect(cabeNaRota(rota(), "laco", "truque")).toBe(true);
  expect(cabeNaRota(rota(), "laco", "laco")).toBe(false);
  expect(cabeNaRota(rota(), "truque", "truque")).toBe(false);
  expect(cabeNaRota(rota(), "truque", "laco")).toBe(false);
  expect(cabeNaRota(rota(), "truque", "seDireita")).toBe(true);
});

test("a rota aceita um 🔁 só, mas quantas ⭐ quiser", () => {
  const comBloco = rota({ principal: ["laco", "truque"] });
  expect(cabeNaRota(comBloco, "principal", "laco")).toBe(false);
  expect(cabeNaRota(comBloco, "principal", "truque")).toBe(true);
});

test("menorCaminho conta as cartas e contorna as pedras", () => {
  expect(menorCaminho(mapa())).toBe(2);
  expect(menorCaminho(mapa({ tesouros: [{ x: 0, y: 1 }] }))).toBe(2);
  expect(menorCaminho(mapa({ pedras: [{ x: 1, y: 0 }] }))).toBe(7);
  const fechado = mapa({ pedras: [{ x: 1, y: 0 }, { x: 0, y: 1 }] });
  expect(menorCaminho(fechado)).toBe(Infinity);
});

test("cada etapa traz sua carta, nessa ordem", () => {
  const cartas = (fase: number) => gerarFase(fase, semente(fase)).cartas;
  expect(cartas(1)).toEqual(["frente", "esquerda", "direita"]);
  expect(cartas(4)).toContain("laco");
  expect(cartas(7)).toContain("truque");
  expect(cartas(10)).toContain("seDireita");
  expect(cartas(10)).toContain("seEsquerda");
});

test("toda fase tem solução, dentro das vagas, e um mapa coerente", () => {
  const rng = semente(1);
  for (let fase = 1; fase <= 30; fase++) {
    for (let i = 0; i < 60; i++) {
      const { mapa, solucao, vagas } = gerarFase(fase, rng);
      expect(rodar(mapa, solucao).resultado).toBe("venceu");
      expect(solucao.principal.length).toBeLessThanOrEqual(vagas.principal);
      expect(solucao.laco.length).toBeLessThanOrEqual(vagas.laco);
      expect(solucao.truque.length).toBeLessThanOrEqual(vagas.truque);

      const chaves = [mapa.inicio, ...mapa.tesouros, ...mapa.pedras].map(({ x, y }) => `${x},${y}`);
      expect(new Set(chaves).size).toBe(chaves.length);
      for (const { x, y } of [mapa.inicio, ...mapa.tesouros, ...mapa.pedras]) {
        expect(Math.min(x, y)).toBeGreaterThanOrEqual(0);
        expect(Math.max(x, y)).toBeLessThan(LADO);
      }
    }
  }
});

test("a primeira fase é uma reta, olhando para o leste, com folga", () => {
  const rng = semente(2);
  for (let i = 0; i < 100; i++) {
    const { mapa, solucao, vagas } = gerarFase(1, rng);
    expect(mapa.direcao).toBe(1);
    expect(mapa.tesouros).toHaveLength(1);
    expect(mapa.tesouros[0].y).toBe(mapa.inicio.y);
    expect(new Set(solucao.principal)).toEqual(new Set(["frente"]));
    expect(vagas.principal).toBe(solucao.principal.length + 2);
  }
});

// Equilíbrio do jogo: a carta nova tem de ser necessária, não um enfeite.
test("sem a carta nova a rota não cabe nas vagas", () => {
  const rng = semente(3);
  for (const fase of [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 30]) {
    for (let i = 0; i < 80; i++) {
      const { mapa, vagas } = gerarFase(fase, rng);
      expect(menorCaminho(mapa)).toBeGreaterThan(vagas.principal + vagas.laco + vagas.truque);
    }
  }
});

function* sequencias(cartas: Carta[], ate: number): Generator<Carta[]> {
  yield [];
  if (ate > 0) for (const carta of cartas) for (const resto of sequencias(cartas, ate - 1)) yield [carta, ...resto];
}

// Testa tudo que cabe nas vagas sem usar o sensor.
function venceSemSensor(mapa: Mapa, vagas: { principal: number; laco: number }, vezes: number[]) {
  const movimentos: Carta[] = ["frente", "esquerda", "direita"];
  for (const principal of sequencias([...movimentos, "laco"], vagas.principal)) {
    for (const laco of sequencias(movimentos, vagas.laco)) {
      for (const quantas of vezes) {
        if (rodar(mapa, rota({ principal, laco, vezes: quantas })).resultado === "venceu") return true;
      }
    }
  }
  return false;
}

test("o sensor quase sempre é necessário, mesmo com repetição", () => {
  const rng = semente(4);
  let semSensor = 0;
  for (let i = 0; i < 60; i++) {
    const { mapa, vagas, vezes } = gerarFase(10 + (i % 3), rng);
    if (venceSemSensor(mapa, vagas, vezes)) semSensor++;
  }
  expect(semSensor / 60).toBeLessThan(0.1);
});

test("a estreia de uma carta já vem com a rota começada", () => {
  const repetir = gerarFase(4, semente(5));
  expect(repetir.pronto.rota.principal).toEqual(["laco"]);
  expect(repetir.pronto.rota.laco).toEqual(repetir.solucao.laco.slice(0, 1));
  expect(repetir.pronto.rota.vezes).toBe(repetir.solucao.vezes);
  expect(repetir.pronto.trilho).toBe("laco");

  const truque = gerarFase(7, semente(6));
  expect(truque.pronto.rota.truque).toEqual(truque.solucao.truque);
  expect(truque.pronto.trilho).toBe("principal");

  const sensor = gerarFase(10, semente(7));
  expect(sensor.pronto.rota.vezes).toBe(SEMPRE);
  expect(cartasUsadas(sensor.pronto.rota)).toBe(2);

  for (const fase of [1, 2, 5, 8, 11]) {
    expect(cartasUsadas(gerarFase(fase, semente(fase)).pronto.rota)).toBe(0);
  }
});

test("só depois da fase 12 as etapas se misturam", () => {
  const etapas = Array.from({ length: 12 }, (_, i) => etapaDaFase(i + 1));
  expect(etapas).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4]);
  const rng = semente(8);
  const depois = new Set(Array.from({ length: 200 }, () => etapaDaFase(13, rng)));
  expect(depois).toEqual(new Set([2, 3, 4]));
});

test("sobrar vagas vale pontos e dicas custam pontos, sem nunca zerar", () => {
  const estado = novoJogo(2, semente(9));
  const justa = estado.solucao;
  const sobra = estado.vagas.principal - justa.principal.length;
  expect(pontosDaFase(estado, justa)).toBe(20 + sobra * 5);
  expect(pontosDaFase({ ...estado, dicas: 1 }, justa)).toBe(20 + (sobra - 1) * 5);
  expect(pontosDaFase({ ...estado, dicas: 50 }, justa)).toBe(10);
});

test("concluir sobe de fase, soma os pontos e devolve uma vida", () => {
  const estado = { ...novaFase(2, 1, 30, semente(10)) };
  const proximo = concluir(estado, estado.solucao, semente(11));
  expect(proximo.fase).toBe(3);
  expect(proximo.vidas).toBe(2);
  expect(proximo.pontos).toBe(30 + pontosDaFase(estado, estado.solucao));
  expect(proximo.dicas).toBe(0);
  expect(concluir(novoJogo(1, semente(12)), rota(), semente(13)).vidas).toBe(VIDAS_INICIAIS);
});

test("bater tira uma vida e mantém o mapa", () => {
  const estado = novoJogo(1, semente(14));
  const depois = bater(estado);
  expect(depois.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(depois.mapa).toBe(estado.mapa);
});

test("dicas repetidas sempre chegam a uma rota que vence", () => {
  const rng = semente(15);
  for (const fase of [2, 5, 8, 11, 14]) {
    for (let i = 0; i < 40; i++) {
      const { mapa, solucao } = gerarFase(fase, rng);
      let atual = rota({ principal: ["esquerda", "esquerda"], laco: ["direita"], vezes: 5 });
      for (let dica = 0; dica < 30; dica++) atual = darDica(atual, solucao);
      expect(rodar(mapa, atual).resultado).toBe("venceu");
    }
  }
});

test("a dica mantém o que já está certo e revela uma carta por vez", () => {
  const solucao = rota({ principal: ["frente", "direita", "frente"] });
  const dica = darDica(rota({ principal: ["frente", "esquerda", "esquerda", "esquerda"] }), solucao);
  expect(dica.principal).toEqual(["frente", "direita"]);
});
