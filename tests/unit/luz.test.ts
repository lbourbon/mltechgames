import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import { sortear } from "../../src/jogos/kit/sorteio";
import {
  bracosDe,
  completa,
  configDaFase,
  dica,
  energia,
  gerarFase,
  girado,
  girar,
  novaFase,
  novoJogo,
  toquesRestantes,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  voltaDe,
  type Estado,
  type Mapa,
  type Peca,
} from "../../src/jogos/luz/logica";

function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FASES_TESTADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 14];
const N = 1;
const L = 2;
const S = 4;
const O = 8;

const fio = (bracos: number): Peca => ({ tipo: "fio", bracos, carga: 0 });
const usina: Peca = { tipo: "usina", bracos: 0, carga: 0 };
const casa: Peca = { tipo: "casa", bracos: 0, carga: 0 };
const fabrica: Peca = { tipo: "fabrica", bracos: 0, carga: 0 };
const vazio: Peca = { tipo: "vazio", bracos: 0, carga: 0 };
const bateria = (carga: number): Peca => ({ tipo: "bateria", bracos: 0, carga });

function mapa(colunas: number, pecas: Peca[], inicio = pecas.map(() => 0), extra: Partial<Mapa> = {}): Mapa {
  return {
    colunas,
    linhas: pecas.length / colunas,
    pecas,
    inicio,
    ordem: pecas.flatMap((peca, i) => (peca.tipo === "fio" ? [i] : [])),
    menor: 1,
    toques: null,
    ...extra,
  };
}

const jogo = (m: Mapa, extra: Partial<Estado> = {}): Estado => ({
  fase: 3,
  vidas: VIDAS_INICIAIS,
  pontos: 0,
  mapa: m,
  giros: m.inicio,
  gastos: 0,
  limpa: true,
  ...extra,
});

const pecasQueGiram = ({ pecas }: Mapa) =>
  pecas.flatMap((peca, i) => (peca.tipo === "fio" && voltaDe(peca.bracos) > 1 ? [i] : []));

test("girar anda em sentido horário", () => {
  expect(girado(N, 1)).toBe(L);
  expect(girado(O, 1)).toBe(N);
  expect(girado(N | L, 3)).toBe(O | N);
  expect(girado(N | S, 1)).toBe(L | O);
});

test("a volta de cada peça depende do desenho", () => {
  expect(voltaDe(N | S)).toBe(2);
  expect(voltaDe(N | L)).toBe(4);
  expect(voltaDe(N | L | S)).toBe(4);
  expect(voltaDe(15)).toBe(1);
});

test("a corrente anda por fios que se encostam e acende a casa", () => {
  const m = mapa(3, [usina, fio(L | O), casa]);
  expect(energia(m, [0, 0, 0])).toMatchObject({ acesas: 1, casas: 1, passos: [0, 1, -1] });
  // Girado, o fio aponta para cima e para baixo: não toca em nada.
  expect(energia(m, [0, 1, 0])).toMatchObject({ acesas: 0, passos: [0, -1, -1] });
});

test("a corrente não passa por dentro de uma casa", () => {
  const m = mapa(4, [usina, fio(L | O), casa, fio(O)]);
  const { passos, acesas } = energia(m, [0, 0, 0, 0]);
  expect(passos[3]).toBe(-1);
  expect(acesas).toBe(1);
});

test("casa colada na usina não acende sozinha", () => {
  expect(energia(mapa(2, [usina, casa]), [0, 0]).acesas).toBe(0);
});

test("a fábrica só acende com dois fios", () => {
  const umFio = mapa(3, [usina, fio(L | O), fabrica]);
  expect(energia(umFio, [0, 0, 0]).acesas).toBe(0);

  // O fio de cima desce e dá a volta por baixo até chegar na fábrica pelo outro lado.
  const doisFios = mapa(3, [usina, fio(L | O | S), fabrica, vazio, fio(N | L), fio(N | O)]);
  const { entradas, acesas } = energia(doisFios, doisFios.inicio);
  expect(entradas[2]).toBe(2);
  expect(acesas).toBe(1);
});

test("bateria acende até a sua carga e sobrecarrega acima dela", () => {
  const pecas: Peca[] = [
    usina, vazio, vazio,
    vazio, casa, vazio,
    casa, fio(N | O | L), bateria(1),
  ];
  const m = mapa(3, pecas);
  const { sobrecarga, acesas } = energia(m, pecas.map(() => 0));
  expect(sobrecarga).toEqual([8]);
  expect(acesas).toBe(0);

  const folgada = mapa(3, pecas.map((peca) => (peca.tipo === "bateria" ? bateria(2) : peca)));
  expect(energia(folgada, pecas.map(() => 0))).toMatchObject({ sobrecarga: [], acesas: 2 });
});

test("bateria encostada na rede da usina não sobrecarrega", () => {
  const m = mapa(4, [usina, fio(L | O), fio(O | L | S), bateria(0), vazio, vazio, casa, vazio]);
  const { sobrecarga, acesas } = energia(m, m.pecas.map(() => 0));
  expect(sobrecarga).toEqual([]);
  expect(acesas).toBe(1);
});

test.each(FASES_TESTADAS)("fase %i nasce embaralhada, e os fios no lugar certo acendem tudo", (fase) => {
  const rng = semente(fase);
  for (let i = 0; i < 60; i++) {
    const m = gerarFase(fase, rng);
    const certos = m.pecas.map(() => 0);
    const { fabricas, baterias } = configDaFase(fase);
    const casas = m.pecas.filter((p) => p.tipo === "casa" || p.tipo === "fabrica").length;
    expect(completa(m, certos)).toBe(true);
    expect(energia(m, certos).sobrecarga).toEqual([]);
    expect(completa(m, m.inicio)).toBe(false);
    expect(casas).toBeGreaterThanOrEqual(configDaFase(fase).casas[0]);
    expect(casas).toBeLessThanOrEqual(configDaFase(fase).casas[1]);
    expect(m.pecas.filter((p) => p.tipo === "fabrica")).toHaveLength(fabricas);
    expect(m.pecas.filter((p) => p.tipo === "bateria")).toHaveLength(baterias);
    expect(m.pecas.filter((p) => p.tipo === "usina")).toHaveLength(1);
    expect(m.toques === null).toBe(fase <= ULTIMA_FASE_MANSA);
    if (m.toques !== null) expect(m.toques).toBeGreaterThanOrEqual(m.menor + 4);
  }
});

test("nas fases sem ramos não há peça de três pontas", () => {
  const rng = semente(3);
  for (let i = 0; i < 40; i++) {
    for (const peca of gerarFase(ULTIMA_FASE_MANSA, rng).pecas) {
      if (peca.tipo === "fio") expect(peca.bracos.toString(2).replaceAll("0", "").length).toBe(2);
    }
  }
});

test("gerar as fases mais difíceis é rápido", () => {
  const rng = semente(9);
  const inicio = performance.now();
  for (let i = 0; i < 100; i++) gerarFase(9, rng);
  expect((performance.now() - inicio) / 100).toBeLessThan(20);
});

test("casa, usina, terreno vazio e cruz não giram nem gastam toque", () => {
  const m = mapa(5, [usina, fio(15), casa, vazio, fio(L | O)], undefined, { toques: 5 });
  for (const indice of [0, 1, 2, 3]) {
    const jogada = girar(jogo(m), indice);
    expect(jogada.resultado).toBe("parada");
    expect(jogada.estado.gastos).toBe(0);
  }
});

test("cada giro gasta um toque, e dar a volta na peça conta", () => {
  const m = mapa(4, [usina, fio(L | O), casa, fio(N | L)], [0, 1, 0, 0], { toques: 8, menor: 1 });
  const jogada = girar(jogo(m), 3);
  expect(jogada.resultado).toBe("girou");
  expect(jogada.estado.gastos).toBe(1);
  expect(toquesRestantes(jogada.estado)).toBe(7);
  expect(toquesRestantes(jogo(mapa(2, [usina, casa])))).toBeNull();
});

test("ligar a última casa passa de fase, com bônus sem toque a mais", () => {
  const rng = semente(1);
  const m = mapa(3, [usina, fio(L | O), casa], [0, 1, 0], { toques: 8, menor: 1 });
  const jogada = girar(jogo(m, { vidas: 2 }), 1, rng);
  expect(jogada.resultado).toBe("fase");
  expect(jogada.estado.fase).toBe(4);
  expect(jogada.estado.pontos).toBe(3 * 15);
  expect(jogada.estado.vidas).toBe(3);
  expect(jogada.estado.gastos).toBe(0);
});

test("toque a mais tira o bônus, e não o avanço", () => {
  const rng = semente(1);
  const m = mapa(4, [usina, fio(L | O), casa, fio(N | L)], [0, 1, 0, 0], { toques: 8, menor: 1 });
  const desperdicio = girar(jogo(m), 3, rng).estado;
  expect(girar(desperdicio, 1, rng).estado.pontos).toBe(3 * 10);
});

test("acabar os toques apaga a vila: custa um coração e a mesma vila volta do começo", () => {
  const m = mapa(4, [usina, fio(L | O), casa, fio(N | L)], [0, 1, 0, 0], { toques: 2, menor: 1 });
  const primeiro = girar(jogo(m), 3).estado;
  const jogada = girar(primeiro, 3);
  expect(jogada.resultado).toBe("apagou");
  expect(jogada.estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(jogada.estado.giros).toEqual(m.inicio);
  expect(jogada.estado.gastos).toBe(0);
  expect(jogada.estado.mapa).toBe(m);
  expect(jogada.estado.limpa).toBe(false);
});

test("o último toque que liga tudo vale, mesmo sendo o último do limite", () => {
  const m = mapa(3, [usina, fio(L | O), casa], [0, 1, 0], { toques: 1, menor: 1 });
  expect(girar(jogo(m), 1, semente(1)).resultado).toBe("fase");
});

test("sem corações, o apagão termina a partida", () => {
  const m = mapa(4, [usina, fio(L | O), casa, fio(N | L)], [0, 1, 0, 0], { toques: 1, menor: 1 });
  const jogada = girar(jogo(m, { vidas: 1 }), 3);
  expect(jogada.resultado).toBe("fim");
  expect(jogada.estado.vidas).toBe(0);
});

test("nas fases mansas não há limite de toques", () => {
  const rng = semente(2);
  let estado = novoJogo(1, rng);
  const [peca] = pecasQueGiram(estado.mapa);
  for (let i = 0; i < 40; i++) {
    const jogada = girar(estado, peca, rng);
    if (jogada.resultado === "fase") return;
    expect(jogada.resultado).toBe("girou");
    estado = jogada.estado;
  }
});

test.each(FASES_TESTADAS)("na fase %i, quem pensa antes de tocar passa sem desperdício", (fase) => {
  const rng = semente(fase * 7);
  for (let i = 0; i < 30; i++) {
    let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    const { mapa: m } = estado;
    let toques = 0;
    let venceu = false;
    for (const indice of m.ordem) {
      const volta = voltaDe(m.pecas[indice].bracos);
      for (let giro = estado.giros[indice] % volta; giro % volta !== 0 && !venceu; giro++) {
        const jogada = girar(estado, indice, rng);
        toques++;
        venceu = jogada.resultado === "fase";
        estado = jogada.estado;
      }
    }
    expect(venceu).toBe(true);
    expect(toques).toBeLessThanOrEqual(m.menor);
    expect(estado.pontos).toBe(fase * 15);
  }
});

test.each(FASES_TESTADAS)("na fase %i, dicas sempre acendem a vila", (fase) => {
  const rng = semente(fase * 13);
  for (let i = 0; i < 30; i++) {
    let estado = novaFase(fase, VIDAS_INICIAIS, 0, rng);
    let passos = 0;
    for (;;) {
      const jogada = dica(estado, rng);
      if (jogada.resultado === "fase") {
        expect(jogada.estado.pontos).toBe(fase * 10);
        break;
      }
      expect(bracosDe(estado.mapa, jogada.estado.giros, jogada.indice!)).toBe(estado.mapa.pecas[jogada.indice!].bracos);
      expect(jogada.estado.gastos).toBe(0);
      estado = jogada.estado;
      expect(++passos).toBeLessThanOrEqual(estado.mapa.pecas.length);
    }
  }
});

test("a partir das fases com limite, tocar a esmo não acende a vila", () => {
  const rng = semente(5);
  const taxa = (fase: number) => {
    let venceu = 0;
    const partidas = 200;
    for (let i = 0; i < partidas; i++) {
      let estado = novaFase(fase, 1, 0, rng);
      const pecas = pecasQueGiram(estado.mapa);
      for (;;) {
        const jogada = girar(estado, pecas[sortear(0, pecas.length - 1, rng)], rng);
        if (jogada.resultado === "fase") venceu++;
        if (jogada.resultado !== "girou") break;
        estado = jogada.estado;
      }
    }
    return venceu / partidas;
  };
  expect(taxa(3)).toBeLessThan(0.15);
  expect(taxa(5)).toBeLessThan(0.05);
  expect(taxa(8)).toBeLessThan(0.02);
});

// O que a criança faz sem pensar à frente: gira cada peça até ela encostar na rede viva.
test("girar até encostar, sem olhar para onde vai, não basta nas fases altas", () => {
  const rng = semente(21);
  const vence = (fase: number) => {
    let venceu = 0;
    const partidas = 150;
    for (let i = 0; i < partidas; i++) {
      let estado = novaFase(fase, 1, 0, rng);
      const { mapa: m } = estado;
      const pecas = pecasQueGiram(m);
      let acabou = false;
      for (let volta = 0; volta < 6 && !acabou; volta++) {
        for (const indice of pecas) {
          const antes = energia(m, estado.giros).passos[indice] >= 0;
          if (antes || acabou) continue;
          for (let giro = 0; giro < 3 && !acabou; giro++) {
            const jogada = girar(estado, indice, rng);
            if (jogada.resultado === "fase") venceu++;
            acabou = jogada.resultado !== "girou";
            estado = jogada.estado;
            if (energia(m, estado.giros).passos[indice] >= 0) break;
          }
        }
      }
    }
    return venceu / partidas;
  };
  expect(vence(8)).toBeLessThan(0.1);
});
