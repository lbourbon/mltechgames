import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  abre,
  atravessar,
  configDaFase,
  gerarFase,
  maiorAgora,
  novaFase,
  novoJogo,
  passar,
  ULTIMA_FASE_FACIL,
  VIDAS_INICIAIS,
  type Estado,
  type Mapa,
  type Porteira,
} from "../../src/jogos/boiada/logica";

// Sequência fixa: as simulações dão sempre o mesmo resultado. Nunca use um rng constante:
// passar sorteia a fase seguinte, e o gerador repetiria o mesmo mapa rejeitado para sempre.
function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const p = (conta: Porteira["conta"], valor: number): Porteira => ({ conta, valor });

function jogo(mapa: Partial<Mapa> = {}, extra: Partial<Estado> = {}): Estado {
  const completo: Mapa = {
    boiada: 50,
    abertas: [p("+", 20), p("×", 3)],
    reserva: [],
    trechos: 2,
    meta: 200,
    melhor: 210,
    ...mapa,
  };
  return { ...completo, fase: 1, vidas: VIDAS_INICIAIS, pontos: 0, mapa: completo, ...extra };
}

const abertasAgora = ({ boiada, abertas }: Estado) =>
  abertas.flatMap((porteira, i) => (abre(boiada, porteira) ? [i] : []));

// Passa por uma estrada inteira e diz se a carroça saiu do barro.
function vence(estado: Estado, escolher: (estado: Estado) => number, rng: Rng) {
  for (;;) {
    const jogada = passar(estado, escolher(estado), rng);
    if (jogada.resultado === "fase") return true;
    if (jogada.resultado === "faltou" || jogada.resultado === "fim") return false;
    expect(jogada.resultado).toBe("passou");
    estado = jogada.estado;
  }
}

// O que a criança pode descobrir jogando: soma primeiro, multiplica depois, o resto só se precisar.
function somaAntes(estado: Estado) {
  const maiorDe = (conta: Porteira["conta"]) =>
    abertasAgora(estado)
      .filter((i) => estado.abertas[i].conta === conta)
      .sort((a, b) => estado.abertas[b].valor - estado.abertas[a].valor)[0];
  return maiorDe("+") ?? maiorDe("×") ?? maiorAgora(estado);
}

function taxaDeVitoria(fase: number, escolher: (estado: Estado, rng: Rng) => number) {
  const rng = semente(fase);
  let vitorias = 0;
  for (let i = 0; i < 400; i++) if (vence(novaFase(fase, 3, 0, rng), (e) => escolher(e, rng), rng)) vitorias++;
  return vitorias / 400;
}

const aoAcaso = (estado: Estado, rng: Rng) => {
  const lista = abertasAgora(estado);
  return lista[Math.floor(rng() * lista.length)];
};

test("cada porteira faz a sua conta", () => {
  expect(atravessar(10, p("+", 20))).toBe(30);
  expect(atravessar(10, p("−", 8))).toBe(2);
  expect(atravessar(10, p("×", 3))).toBe(30);
  expect(atravessar(10, p("÷", 2))).toBe(5);
});

test("divisão só abre com resultado exato, e a boiada nunca some", () => {
  expect(abre(10, p("÷", 2))).toBe(true);
  expect(abre(9, p("÷", 2))).toBe(false);
  expect(abre(9, p("−", 8))).toBe(true);
  expect(abre(8, p("−", 8))).toBe(false);
});

test("a porteira usada sai e a da reserva entra no mesmo lugar", () => {
  const inicio = jogo({ abertas: [p("+", 20), p("×", 3)], reserva: [p("+", 5), p("−", 8)], trechos: 3 });
  const { estado, resultado } = passar(inicio, 0);
  expect(resultado).toBe("passou");
  expect(estado.boiada).toBe(70);
  expect(estado.abertas).toEqual([p("+", 5), p("×", 3)]);
  expect(estado.reserva).toEqual([p("−", 8)]);
  expect(estado.trechos).toBe(2);
});

test("somar antes de multiplicar rende mais que o contrário", () => {
  const somaPrimeiro = passar(passar(jogo(), 0).estado, 0, semente(1));
  const vezesPrimeiro = passar(passar(jogo(), 1).estado, 0, semente(1));
  expect(somaPrimeiro.resultado).toBe("fase");
  expect(vezesPrimeiro.resultado).toBe("faltou");
});

test("porteira fechada não gasta o trecho", () => {
  const inicio = jogo({ boiada: 9, abertas: [p("÷", 2), p("+", 5)] });
  const { estado, resultado } = passar(inicio, 0);
  expect(resultado).toBe("fechada");
  expect(estado).toBe(inicio);
});

test("chegar à meta sobe de fase, soma pontos e devolve uma vida", () => {
  const fim = jogo({ boiada: 195, abertas: [p("+", 5)], trechos: 1 }, { fase: 2, vidas: 2, pontos: 30 });
  const { estado, resultado } = passar(fim, 0, semente(1));
  expect(resultado).toBe("fase");
  expect(estado.fase).toBe(3);
  expect(estado.vidas).toBe(3);
  expect(estado.pontos).toBe(50);
});

test("a boiada no maior tamanho possível vale mais pontos", () => {
  const fim = jogo({ boiada: 205, abertas: [p("+", 5)], trechos: 1 });
  expect(passar(fim, 0, semente(1)).estado.pontos).toBe(15);
});

test("faltar boi perde uma vida e devolve a mesma estrada", () => {
  const mapa = { boiada: 20, abertas: [p("+", 5), p("×", 2)], reserva: [p("+", 10)], trechos: 2 };
  const { estado: meio } = passar(jogo(mapa, { pontos: 40 }), 0);
  const { estado, resultado } = passar(meio, 0);
  expect(resultado).toBe("faltou");
  expect(estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(estado.pontos).toBe(40);
  expect(estado.boiada).toBe(20);
  expect(estado.abertas).toEqual(mapa.abertas);
  expect(estado.reserva).toEqual(mapa.reserva);
  expect(estado.trechos).toBe(2);
});

test("faltar boi na última vida encerra o jogo", () => {
  const fim = jogo({ boiada: 10, abertas: [p("+", 5)], trechos: 1 }, { vidas: 1 });
  const { estado, resultado } = passar(fim, 0);
  expect(resultado).toBe("fim");
  expect(estado.vidas).toBe(0);
});

test("a estrada tem porteiras para todos os trechos, sem nenhuma repetida", () => {
  const rng = semente(4);
  for (let fase = 1; fase <= 12; fase++) {
    const { trechos, abertas, porteiras } = configDaFase(fase);
    expect(porteiras.length).toBeGreaterThan(trechos + abertas - 1);
    for (let i = 0; i < 60; i++) {
      const mapa = gerarFase(fase, rng);
      expect(mapa.abertas).toHaveLength(abertas);
      expect(mapa.reserva).toHaveLength(trechos - 1);
      const todas = [...mapa.abertas, ...mapa.reserva].map(({ conta, valor }) => conta + valor);
      expect(new Set(todas).size).toBe(todas.length);
    }
  }
});

// Anda por todos os caminhos, olhando cada tela que a criança pode ver.
function melhorRota(estado: Estado, rng: Rng): { boiada: number; rota: number[] } {
  expect(estado.abertas.some(({ conta }) => conta === "+" || conta === "×")).toBe(true);
  const rotas = abertasAgora(estado).map((i) => {
    if (estado.trechos === 1) return { boiada: atravessar(estado.boiada, estado.abertas[i]), rota: [i] };
    const { boiada, rota } = melhorRota(passar(estado, i, rng).estado, rng);
    return { boiada, rota: [i, ...rota] };
  });
  return rotas.reduce((a, b) => (b.boiada > a.boiada ? b : a));
}

test("toda fase pode ser vencida de verdade, e sempre há uma porteira para crescer", () => {
  const rng = semente(2);
  for (const fase of [1, 2, 3, 4, 5, 6, 9, 15]) {
    for (let i = 0; i < 80; i++) {
      const estado = novaFase(fase, 3, 0, rng);
      const { boiada, rota } = melhorRota(estado, rng);
      expect(boiada).toBe(estado.mapa.melhor);
      expect(boiada).toBeLessThanOrEqual(999);

      const fim = rota.reduce((atual, indice) => passar(atual.estado, indice, rng), { estado } as ReturnType<typeof passar>);
      expect(fim.resultado).toBe("fase");
    }
  }
});

test("depois de errar, a mesma estrada ainda pode ser vencida", () => {
  const rng = semente(6);
  for (let i = 0; i < 100; i++) {
    const estado = novaFase(5, 3, 0, rng);
    const pior = (atual: Estado) => abertasAgora(atual).at(-1)!;
    let atual = estado;
    let jogada = passar(atual, pior(atual), rng);
    while (jogada.resultado === "passou") {
      atual = jogada.estado;
      jogada = passar(atual, pior(atual), rng);
    }
    if (jogada.resultado !== "faltou") continue;
    expect(melhorRota(jogada.estado, rng).boiada).toBeGreaterThanOrEqual(estado.mapa.meta);
  }
});

test("a meta sempre pede que a boiada ao menos dobre", () => {
  const rng = semente(5);
  for (let fase = 1; fase <= 12; fase++) {
    for (let i = 0; i < 60; i++) {
      const { meta, boiada } = gerarFase(fase, rng);
      expect(meta).toBeGreaterThanOrEqual(boiada * 2);
    }
  }
});

test("novo jogo começa com as vidas cheias na fase pedida", () => {
  const estado = novoJogo(4);
  expect(estado.fase).toBe(4);
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
  expect(estado.pontos).toBe(0);
});

// Equilíbrio do jogo: com porteiras independentes, escolher a maior boiada do momento venceria
// sempre, porque uma boiada maior nunca termina menor. Só a porteira que fica no caminho faz a
// ordem pesar. Simule antes de mudar.
test("escolher a maior boiada do momento basta no começo e nunca depois", () => {
  for (let fase = 1; fase <= ULTIMA_FASE_FACIL; fase++) expect(taxaDeVitoria(fase, maiorAgora)).toBe(1);
  for (const fase of [ULTIMA_FASE_FACIL + 1, 5, 6, 9]) expect(taxaDeVitoria(fase, maiorAgora)).toBe(0);
});

test("nas fases altas quem aprendeu a somar antes vence bem mais que quem chuta", () => {
  for (const fase of [4, 5, 6, 9]) {
    expect(taxaDeVitoria(fase, somaAntes)).toBeGreaterThan(0.4);
    expect(taxaDeVitoria(fase, aoAcaso)).toBeLessThan(0.15);
  }
});

test("no começo até quem chuta vence de vez em quando", () => {
  for (let fase = 1; fase <= ULTIMA_FASE_FACIL; fase++) {
    expect(taxaDeVitoria(fase, aoAcaso)).toBeGreaterThan(0.2);
  }
});
