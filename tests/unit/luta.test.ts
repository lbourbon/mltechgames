import { describe, expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import { ATRIBUTOS, EQUIPAMENTOS, PODER, type Atributos } from "../../src/jogos/luta/loja";
import {
  agir,
  avaliar,
  BASE,
  comecarLuta,
  comprarEquipamento,
  configDaFase,
  distribuicoes,
  encerrar,
  FASES,
  FORTE,
  gerarAdversarios,
  semEquipamentoVence,
  igualzinho,
  jogadaApressada,
  jogadaEsperta,
  lutar,
  melhorPoder,
  novoJogo,
  poderesDaFase,
  prepararFase,
  referenciaDaFase,
  refazerTreino,
  somar,
  treinar,
  treinosQueFaltam,
  ULTIMA_FASE,
  ULTIMA_FASE_MANSA,
  verbaDaFase,
  vestir,
  VIDAS_INICIAIS,
  vidaDe,
  type Adversario,
} from "../../src/jogos/luta/logica";

function semente(valor: number): Rng {
  let s = valor * 2654435761;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SEMENTES = Array.from({ length: 10 }, (_, i) => i + 1);
const FASES_NUMEROS = Array.from({ length: ULTIMA_FASE }, (_, i) => i + 1);

const adversario = (atributos: Atributos, padrao: Adversario["padrao"] = ["soco"]): Adversario => ({
  nome: "Teste",
  jeito: 0,
  estilo: "equilibrado",
  atributos,
  padrao,
  inicio: 0,
});

// O treino que vence com mais vida sobrando, olhando a ficha do adversário.
function melhorTreino(numero: number, adversarios: Adversario[], base: Atributos) {
  let melhor: { treino: Atributos; sobra: number } | null = null;
  for (const treino of distribuicoes(configDaFase(numero).treinos)) {
    const r = melhorPoder(somar(base, treino), adversarios, poderesDaFase(numero));
    if (r.fim === "venceu" && (!melhor || r.sobra > melhor.sobra)) melhor = { treino, sobra: r.sobra };
  }
  return melhor;
}

describe("a luta", () => {
  test("cada soco tira a força menos a técnica, e a velocidade é quantos socos saem", () => {
    const luta = comecarLuta({ forca: 5, velocidade: 3, tecnica: 1, resistencia: 2 }, [adversario({ forca: 1, velocidade: 1, tecnica: 2, resistencia: 5 })], null);
    const eventos = agir(luta, { tipo: "soco", alvo: 0 });
    expect(eventos[0]).toEqual({ tipo: "soco", alvo: 0, danos: [3, 3, 3] });
    expect(luta.rivais[0].vida).toBe(vidaDe(5) - 9);
  });

  test("com técnica maior ou igual à força, cada soco só tira 1", () => {
    const luta = comecarLuta({ forca: 3, velocidade: 2, tecnica: 4, resistencia: 2 }, [adversario({ forca: 4, velocidade: 5, tecnica: 3, resistencia: 2 })], null);
    const eventos = agir(luta, { tipo: "soco", alvo: 0 });
    expect(eventos.find((e) => e.tipo === "ataque")).toMatchObject({ danos: [1, 1, 1, 1, 1] });
    expect(luta.voce.vida).toBe(luta.voce.vidaMax - 5);
  });

  test("a defesa segura o golpe forte inteiro e metade do soco comum", () => {
    const forte = comecarLuta({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 5 }, [adversario({ forca: 4, velocidade: 2, tecnica: 9, resistencia: 2 }, ["forte"])], null);
    agir(forte, { tipo: "defesa" });
    expect(forte.voce.vida).toBe(forte.voce.vidaMax);
    const sem = comecarLuta({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 5 }, [adversario({ forca: 4, velocidade: 2, tecnica: 9, resistencia: 2 }, ["forte"])], null);
    agir(sem, { tipo: "soco", alvo: 0 });
    expect(sem.voce.vidaMax - sem.voce.vida).toBe(2 * FORTE * 3);
    const comum = comecarLuta({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 5 }, [adversario({ forca: 4, velocidade: 2, tecnica: 9, resistencia: 2 })], null);
    agir(comum, { tipo: "defesa" });
    expect(comum.voce.vidaMax - comum.voce.vida).toBe(2);
  });

  test("o poder enche com socos e defesas, e só sai cheio", () => {
    const luta = comecarLuta({ forca: 1, velocidade: 1, tecnica: 5, resistencia: 5 }, [adversario({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 9 })], "fogo");
    const vida = luta.rivais[0].vida;
    // Vazio, o pedido de poder vira soco, que tira 1.
    expect(agir(luta, { tipo: "poder", alvo: 0 })[0]).toMatchObject({ tipo: "soco", danos: [1] });
    agir(luta, { tipo: "defesa" });
    agir(luta, { tipo: "soco", alvo: 0 });
    expect(luta.voce.energia).toBe(3);
    const eventos = agir(luta, { tipo: "poder", alvo: 0 });
    expect(eventos[0]).toMatchObject({ tipo: "poder", poder: "fogo", alvos: [{ alvo: 0, danos: [2] }] });
    expect(luta.rivais[0].vida).toBe(vida - 1 - 1 - 2);
    expect(luta.voce.energia).toBe(0);
  });

  test("o gelo pula duas rodadas de todos os adversários", () => {
    const luta = comecarLuta({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 9 }, [
      adversario({ forca: 3, velocidade: 1, tecnica: 1, resistencia: 9 }),
      adversario({ forca: 3, velocidade: 1, tecnica: 1, resistencia: 9 }),
    ], "gelo");
    luta.voce.energia = 3;
    agir(luta, { tipo: "poder", alvo: 0 });
    agir(luta, { tipo: "defesa" });
    expect(luta.voce.vida).toBe(luta.voce.vidaMax);
    agir(luta, { tipo: "defesa" });
    expect(luta.voce.vida).toBeLessThan(luta.voce.vidaMax);
  });

  test("uma luta que não acaba nunca termina pelo juiz", () => {
    const luta = comecarLuta({ forca: 1, velocidade: 1, tecnica: 9, resistencia: 30 }, [adversario({ forca: 1, velocidade: 1, tecnica: 9, resistencia: 30 })], null);
    while (!luta.fim) agir(luta, { tipo: "soco", alvo: 0 });
    expect(luta.fim).toBe("juiz");
  });

  test("um soco num adversário caído vai para o próximo de pé", () => {
    const luta = comecarLuta({ forca: 30, velocidade: 1, tecnica: 9, resistencia: 2 }, [
      adversario({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 1 }),
      adversario({ forca: 1, velocidade: 1, tecnica: 1, resistencia: 5 }),
    ], null);
    expect(agir(luta, { tipo: "soco", alvo: 0 })).toContainEqual({ tipo: "nocaute", rival: 0 });
    expect(agir(luta, { tipo: "soco", alvo: 0 })[0]).toMatchObject({ tipo: "soco", alvo: 1 });
  });
});

describe("as fases", () => {
  test.each(FASES_NUMEROS)("fase %i: o adversário tem uma resposta, e treinar igualzinho não basta depois das mansas", (numero) => {
    for (const s of SEMENTES) {
      const adversarios = gerarAdversarios(numero, semente(s * 7 + numero));
      expect(adversarios).toHaveLength(configDaFase(numero).rivais);
      const avaliacao = avaliar(numero, adversarios);
      expect(avaliacao.vencem).toBeGreaterThan(0);
      expect(avaliacao.folga).toBeGreaterThanOrEqual(0.3);
      if (numero > ULTIMA_FASE_MANSA) expect(avaliacao.igualzinho).toBe(false);
      else expect(avaliacao.igualzinho).toBe(true);
    }
  });

  test("treinar sem olhar a ficha perde: sempre o mesmo atributo, ou um treino ao acaso", () => {
    let lutas = 0;
    let acaso = 0;
    const soUm = { forca: 0, velocidade: 0, tecnica: 0, resistencia: 0 };
    const rng = semente(99);
    for (let numero = ULTIMA_FASE_MANSA + 1; numero <= ULTIMA_FASE; numero++) {
      for (const s of SEMENTES) {
        const adversarios = gerarAdversarios(numero, semente(s * 13 + numero));
        const base = referenciaDaFase(numero);
        const { treinos } = configDaFase(numero);
        const poderes = poderesDaFase(numero);
        lutas++;
        for (const atributo of ATRIBUTOS) {
          if (melhorPoder(somar(base, { [atributo]: treinos }), adversarios, poderes).fim === "venceu") soUm[atributo]++;
        }
        const todas = distribuicoes(treinos);
        const sorteado = todas[Math.floor(rng() * todas.length)];
        if (melhorPoder(somar(base, sorteado), adversarios, poderes).fim === "venceu") acaso++;
      }
    }
    for (const atributo of ATRIBUTOS) expect(soUm[atributo] / lutas, atributo).toBeLessThan(0.4);
    expect(acaso / lutas).toBeLessThan(0.4);
  });

  test("com o melhor treino, quem só aperta soco perde algumas lutas: defender o golpe forte importa", () => {
    let perdeu = 0;
    let lutas = 0;
    for (let numero = 4; numero <= ULTIMA_FASE; numero++) {
      for (const s of SEMENTES) {
        const adversarios = gerarAdversarios(numero, semente(s * 17 + numero));
        const base = referenciaDaFase(numero);
        const melhor = melhorTreino(numero, adversarios, base)!;
        const atributos = somar(base, melhor.treino);
        const apressado = melhorPoder(atributos, adversarios, poderesDaFase(numero), jogadaApressada);
        lutas++;
        if (apressado.fim !== "venceu") perdeu++;
      }
    }
    expect(perdeu / lutas).toBeGreaterThan(0.2);
  });

  test("a final pede equipamentos: sem nenhum, nem o melhor treino vence", () => {
    for (const s of SEMENTES) {
      const adversarios = gerarAdversarios(ULTIMA_FASE, semente(s * 19));
      expect(semEquipamentoVence(ULTIMA_FASE, adversarios)).toBe(false);
      expect(melhorTreino(ULTIMA_FASE, adversarios, BASE)).toBeNull();
    }
  });

  test("cada poder chega numa fase e tem a sua", () => {
    expect(poderesDaFase(1)).toEqual([]);
    expect(poderesDaFase(ULTIMA_FASE)).toEqual(["fogo", "gelo", "raio"]);
    const estreias = Object.values(PODER).map((poder) => poder.fase);
    expect(new Set(estreias).size).toBe(estreias.length);
  });

  test("um adversário a mais só aparece depois que o golpe forte já foi apresentado", () => {
    FASES.forEach((config, i) => {
      if (config.rivais > 1) expect(FASES.slice(0, i).some((anterior) => anterior.forte)).toBe(true);
    });
  });
});

describe("a partida", () => {
  // Joga a partida inteira: compra equipamentos com parte do dinheiro, lê a ficha e treina.
  function jogarTudo(s: number, comprar: boolean) {
    const rng = semente(s);
    const estado = novoJogo(1, rng);
    while (estado.vidas > 0) {
      if (comprar) {
        // Gasta até sobrar 30%, no equipamento mais barato.
        for (;;) {
          const opcoes = ATRIBUTOS.map((atributo) => ({ atributo, preco: EQUIPAMENTOS[atributo].precos[estado.equipamentos[atributo]] }))
            .filter(({ preco }) => preco !== undefined && preco <= estado.moedas * 0.7)
            .sort((a, b) => a.preco - b.preco);
          if (!opcoes.length) break;
          comprarEquipamento(estado, opcoes[0].atributo);
        }
      }
      const base = somar(BASE, estado.equipamentos);
      const melhor = melhorTreino(estado.fase, estado.adversarios, base);
      refazerTreino(estado);
      const treino = melhor?.treino ?? igualzinho(configDaFase(estado.fase).treinos);
      for (const atributo of ATRIBUTOS) for (let i = 0; i < treino[atributo]; i++) treinar(estado, atributo);
      const poder = melhor ? melhorPoder(somar(base, treino), estado.adversarios, poderesDaFase(estado.fase)).poder : null;
      estado.poder = poder;
      const luta = lutar(estado);
      while (!luta.fim) agir(luta, jogadaEsperta(luta));
      const resultado = encerrar(estado);
      if (resultado.zerou) return { zerou: true, fase: estado.fase, vidas: estado.vidas };
      if (resultado.venceu) prepararFase(estado, rng);
    }
    return { zerou: false, fase: estado.fase, vidas: estado.vidas };
  }

  test("quem lê a ficha, treina certo e compra equipamentos zera o jogo sem perder coração", () => {
    for (const s of SEMENTES.slice(0, 5)) {
      const fim = jogarTudo(s, true);
      expect(fim.zerou).toBe(true);
      expect(fim.vidas).toBe(VIDAS_INICIAIS);
    }
  });

  test("os treinos acabam, e refazer devolve todos", () => {
    const estado = novoJogo(3, semente(5));
    const total = configDaFase(3).treinos;
    for (let i = 0; i < total; i++) expect(treinar(estado, "forca")).toBe(true);
    expect(treinar(estado, "forca")).toBe(false);
    expect(treinosQueFaltam(estado)).toBe(0);
    refazerTreino(estado);
    expect(treinosQueFaltam(estado)).toBe(total);
  });

  test("perder nas fases mansas não custa coração, e depois custa; o treino recomeça", () => {
    for (const [numero, perde] of [
      [1, false],
      [ULTIMA_FASE_MANSA + 1, true],
    ] as const) {
      const estado = novoJogo(numero, semente(8));
      treinar(estado, "forca");
      const luta = lutar(estado);
      luta.voce.vida = 0;
      luta.fim = "perdeu";
      const resultado = encerrar(estado);
      expect(resultado.perdeuVida).toBe(perde);
      expect(estado.vidas).toBe(VIDAS_INICIAIS - (perde ? 1 : 0));
      expect(estado.fase).toBe(numero);
      expect(treinosQueFaltam(estado)).toBe(configDaFase(numero).treinos);
    }
  });

  test("vencer dá prêmio e passa de fase; a terceira estrela é para quem vence de primeira", () => {
    const estado = novoJogo(2, semente(3));
    const luta = lutar(estado);
    luta.rivais.forEach((rival) => (rival.vida = 0));
    luta.fim = "venceu";
    const moedas = estado.moedas;
    const resultado = encerrar(estado);
    expect(resultado.perfeita).toBe(true);
    expect(estado.moedas).toBeGreaterThan(moedas);
    expect(estado.fase).toBe(3);
  });

  test("quem continua de uma fase adiantada chega com dinheiro para a loja", () => {
    expect(verbaDaFase(1)).toBe(0);
    expect(verbaDaFase(8)).toBeGreaterThan(verbaDaFase(4));
    expect(novoJogo(8, semente(2)).moedas).toBe(verbaDaFase(8));
  });

  test("equipamento sobe o atributo para sempre; vestiário só muda a roupa", () => {
    const estado = novoJogo(1, semente(4));
    estado.moedas = 1000;
    expect(comprarEquipamento(estado, "forca")).toBe("comprou");
    expect(estado.equipamentos.forca).toBe(1);
    while (comprarEquipamento(estado, "forca") === "comprou");
    expect(comprarEquipamento(estado, "forca")).toBe("nada");
    expect(estado.equipamentos.forca).toBe(EQUIPAMENTOS.forca.precos.length);
    const antes = estado.moedas;
    expect(vestir(estado, "luvas", "dourada", 120)).toBe("comprou");
    expect(estado.moedas).toBe(antes - 120);
    expect(vestir(estado, "luvas", "vermelha", 0)).toBe("vestiu");
    expect(vestir(estado, "luvas", "dourada", 120)).toBe("vestiu");
    expect(estado.moedas).toBe(antes - 120);
    estado.moedas = 0;
    expect(vestir(estado, "faixa", "preta", 200)).toBe("falta");
  });
});
