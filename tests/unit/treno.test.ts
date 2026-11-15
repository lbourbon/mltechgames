import { describe, expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import { MELHORIAS_IDS, MODELOS, TRENOS } from "../../src/jogos/treno/oficina";
import {
  bocaDoSaco,
  capacidade,
  comprar,
  encerrar,
  FAIXAS,
  FASES,
  GRAVIDADE,
  novaConta,
  novoJogo,
  numerosDoGrupo,
  ondeCai,
  passo,
  PERTO_DA_CHAMINE,
  pintar,
  precoDe,
  prepararNoite,
  soltarPresente,
  TIPOS,
  ULTIMA_FASE,
  ULTIMA_FASE_MANSA,
  usarTreno,
  verbaDaFase,
  VIDAS_INICIAIS,
  type Casa,
  type Compra,
  type Estado,
  type Grupo,
  type Solta,
} from "../../src/jogos/treno/logica";

const QUADRO = 1 / 30;
// A largura de um celular em pé, em unidades da cena.
const LARGURA = 88;
const SEMENTES = Array.from({ length: 24 }, (_, i) => i + 1);
// Quem não completa o time nesse tempo ficou preso na parte das renas.
const LIMITE_DAS_RENAS = 180;

function semente(valor: number): Rng {
  let s = valor * 2654435761;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Escolha = (grupo: Grupo, estado: Estado, rng: Rng) => Solta | null;

const ACERTA: Escolha = (grupo, { noite }) => grupo.membros.find((rena) => rena.valor === noite.conta.resultado)!;
const CHUTA: Escolha = (grupo, _, rng) => grupo.membros[Math.floor(rng() * 3)];
const QUASE: Escolha = (grupo, estado, rng) => (rng() < 0.85 ? ACERTA : CHUTA)(grupo, estado, rng);
const ordenadas = (grupo: Grupo) => [...grupo.membros].sort((a, b) => a.valor - b.valor);
const MAIOR: Escolha = (grupo) => ordenadas(grupo)[2];
const MENOR: Escolha = (grupo) => ordenadas(grupo)[0];
const MEIO: Escolha = (grupo) => ordenadas(grupo)[1];

// Entre duas faixas de renas: o trenó passa sem encostar em nenhuma.
const ENTRE_FAIXAS = (FAIXAS[0] + FAIXAS[1]) / 2;

// Piloto de teste: vai até a rena escolhida e, na entrega, solta o presente quando a conta da
// queda cai na chaminé. Com erro, uma parte das chaminés recebe o presente fora do lugar, como
// uma criança que ainda pega o jeito. Devolve false se ficou preso chamando as renas.
function pilotar(estado: Estado, escolha: Escolha, rng: Rng, erro = 0) {
  const { noite } = estado;
  const decisoes = new Map<number, number>();
  const alvos = new Map<number, Solta | null>();
  let chamando = 0;
  while (!noite.acabou) {
    if (noite.modo === "renas" && (chamando += QUADRO) > LIMITE_DAS_RENAS) return false;
    let altura = ENTRE_FAIXAS;
    const grupo = noite.grupo;
    if (grupo) {
      if (!alvos.has(grupo.id)) alvos.set(grupo.id, escolha(grupo, estado, rng));
      altura = alvos.get(grupo.id)?.y ?? ENTRE_FAIXAS;
    }
    const boca = bocaDoSaco(noite, estado.oficina);
    const proxima = noite.casas.find((casa) => !casa.servida && casa.chamine > boca.x);
    let soltar = false;
    if (proxima && noite.modo === "entrega") {
      if (!decisoes.has(proxima.id)) decisoes.set(proxima.id, rng() < erro ? 9 : 0);
      soltar = caiNa(proxima, boca, noite.v, decisoes.get(proxima.id)!);
    }
    passo(estado, { altura, soltar }, QUADRO, rng);
  }
  return true;
}

function caiNa(casa: Casa, boca: { x: number; y: number }, v: number, desvio: number) {
  const queda = Math.sqrt((2 * (casa.topoDaChamine - boca.y)) / GRAVIDADE);
  const cai = boca.x + v * queda + desvio;
  return cai >= casa.chamine - 0.5 && cai <= casa.chamine + 1.5;
}

// Compra o mais barato que dá, como quem passa na oficina toda noite.
function fazerCompras(estado: Estado) {
  for (;;) {
    const opcoes: Compra[] = [
      ...MODELOS.map((id) => ({ tipo: "treno" as const, id })),
      ...MELHORIAS_IDS.map((id) => ({ tipo: "melhoria" as const, id })),
    ];
    const baratas = opcoes
      .map((compra) => ({ compra, preco: precoDe(estado.oficina, compra) }))
      .filter(({ preco }) => preco !== null && preco <= estado.moedas)
      .sort((a, b) => a.preco! - b.preco!);
    if (!baratas.length) return;
    comprar(estado, baratas[0].compra);
  }
}

// Uma partida inteira, da fase 1, até zerar ou perder os corações.
function campanha(s: number, escolha: Escolha, erro = 0) {
  const rng = semente(s);
  const estado = novoJogo(1, LARGURA, rng);
  const tropecos: number[] = [];
  for (let noites = 0; noites < 60; noites++) {
    if (!pilotar(estado, escolha, rng, erro)) return { estado, zerou: false, tropecos };
    const fase = estado.fase;
    const resultado = encerrar(estado);
    if (!resultado.passou) tropecos.push(fase);
    if (resultado.zerou || estado.vidas <= 0) return { estado, zerou: resultado.zerou, tropecos };
    fazerCompras(estado);
    prepararNoite(estado, LARGURA, rng);
  }
  return { estado, zerou: false, tropecos };
}

// Uma noite com a oficina de quem jogou certo até ali.
function noiteNaFase(fase: number, s: number, escolha: Escolha, erro = 0) {
  const rng = semente(s);
  const estado = novoJogo(fase, LARGURA, rng);
  fazerCompras(estado);
  prepararNoite(estado, LARGURA, rng);
  const completou = pilotar(estado, escolha, rng, erro);
  return { estado, completou };
}

describe("contas", () => {
  test("todo grupo tem uma rena com o resultado e duas erradas, todas positivas", () => {
    const rng = semente(3);
    for (const tipo of TIPOS) {
      for (let i = 0; i < 300; i++) {
        const conta = novaConta([tipo], [], null, rng);
        expect(conta.parcelas.every((n) => n > 0)).toBe(true);
        expect(conta.resultado).toBe(conta.parcelas.reduce((a, b) => a + b, 0));
        expect(conta.resultado).toBeLessThan(100);
        const numeros = numerosDoGrupo(conta, rng);
        expect(new Set(numeros).size).toBe(3);
        numeros.forEach((n) => expect(n).toBeGreaterThan(0));
        expect(numeros.filter((n) => n === conta.resultado)).toHaveLength(1);
      }
    }
  });

  test("escolher pelo tamanho do número fica perto do acaso", () => {
    const rng = semente(7);
    for (const tipo of TIPOS) {
      const vitorias = { maior: 0, menor: 0, meio: 0 };
      const vezes = 3000;
      for (let i = 0; i < vezes; i++) {
        const conta = novaConta([tipo], [], null, rng);
        const [menor, meio, maior] = numerosDoGrupo(conta, rng).sort((a, b) => a - b);
        if (maior === conta.resultado) vitorias.maior++;
        if (menor === conta.resultado) vitorias.menor++;
        if (meio === conta.resultado) vitorias.meio++;
      }
      for (const taxa of Object.values(vitorias)) expect(taxa / vezes, tipo).toBeLessThan(0.4);
    }
  });

  test("a conta seguinte muda de tipo e não repete uma que já saiu", () => {
    const rng = semente(2);
    const usadas: string[] = [];
    let anterior = null;
    for (let i = 0; i < 8; i++) {
      const conta = novaConta(["passa10", "dobro"], usadas, anterior, rng);
      if (anterior) expect(conta.tipo).not.toBe(anterior);
      const chave = [...conta.parcelas].sort((a, b) => a - b).join("+");
      expect(usadas).not.toContain(chave);
      usadas.push(chave);
      anterior = conta.tipo;
    }
  });
});

describe("noite", () => {
  test("cada rena certa entra no time, e com o time completo começa a entrega", () => {
    const rng = semente(2);
    const estado = novoJogo(1, LARGURA, rng);
    const { noite } = estado;
    let completou = false;
    while (noite.modo === "renas") {
      const grupo = noite.grupo;
      const altura = grupo ? ACERTA(grupo, estado, rng)!.y : ENTRE_FAIXAS;
      completou ||= passo(estado, { altura, soltar: false }, QUADRO, rng).some((evento) => evento.tipo === "completo");
    }
    expect(completou).toBe(true);
    expect(noite.renas).toHaveLength(noite.config.renas);
    expect(noite.tempo).toBe(0);
    expect(noite.erros).toBe(0);
  });

  test("o trenó começa devagar e acelera com as renas", () => {
    const rng = semente(4);
    const estado = novoJogo(5, LARGURA, rng);
    const inicio = estado.noite.v;
    pilotar(estado, ACERTA, rng);
    expect(estado.noite.v).toBeGreaterThan(inicio * 2);
  });

  test("a rena errada não entra e, passadas as primeiras noites, espanta a última", () => {
    const errada: Escolha = (grupo, e) => grupo.membros.find((rena) => rena.valor !== e.noite.conta.resultado)!;
    const rng = semente(4);
    const estado = novoJogo(ULTIMA_FASE_MANSA + 1, LARGURA, rng);
    const { noite } = estado;
    noite.renas = [{ jeito: 0 }, { jeito: 1 }];
    const conta = noite.conta;
    while (noite.erros === 0) {
      const grupo = noite.grupo;
      passo(estado, { altura: grupo ? errada(grupo, estado, rng)!.y : ENTRE_FAIXAS, soltar: false }, QUADRO, rng);
    }
    expect(noite.renas).toHaveLength(1);
    // A mesma conta volta, para a criança tentar de novo.
    expect(noite.conta).toBe(conta);
  });

  test("sem chaminé por perto ou chamando as renas, o presente não sai", () => {
    const estado = novoJogo(1, LARGURA, semente(1));
    passo(estado, { altura: null, soltar: false }, QUADRO);
    const casa = estado.noite.casas[0];
    casa.chamine = ondeCai(estado.noite, estado.oficina, casa);
    expect(soltarPresente(estado)).toBeNull();
    estado.noite.modo = "entrega";
    estado.noite.casas = [];
    expect(soltarPresente(estado)).toBeNull();
    expect(estado.noite.saco).toBe(capacidade(estado.oficina));
  });

  test("na entrega, um presente de cada vez, até o saco acabar, saindo da boca do saco", () => {
    const estado = novoJogo(1, LARGURA, semente(1));
    estado.noite.modo = "entrega";
    passo(estado, { altura: null, soltar: false }, QUADRO);
    const casa = estado.noite.casas[0];
    casa.chamine = ondeCai(estado.noite, estado.oficina, casa);
    const primeiro = soltarPresente(estado)!;
    expect(primeiro.x).toBeCloseTo(bocaDoSaco(estado.noite, estado.oficina).x);
    estado.noite.recarga = 0;
    expect(soltarPresente(estado)).toBeNull();
    let soltos = 1;
    for (let i = 0; i < 40; i++) {
      estado.noite.presentes = [];
      estado.noite.recarga = 0;
      if (soltarPresente(estado)) soltos++;
    }
    expect(soltos).toBe(capacidade(estado.oficina));
  });

  test("soltar longe da chaminé não gasta presente", () => {
    const estado = novoJogo(1, LARGURA, semente(1));
    estado.noite.modo = "entrega";
    passo(estado, { altura: null, soltar: false }, QUADRO);
    const casa = estado.noite.casas[0];
    casa.chamine = ondeCai(estado.noite, estado.oficina, casa) + PERTO_DA_CHAMINE + 3;
    estado.noite.casas = [casa];
    expect(soltarPresente(estado)).toBeNull();
    casa.chamine -= 6;
    expect(soltarPresente(estado)).not.toBeNull();
  });

  test("cada casa recebe um presente só e paga moedas", () => {
    const { estado } = noiteNaFase(1, 5, ACERTA);
    const { noite } = estado;
    expect(noite.entregues).toBeGreaterThan(0);
    expect(estado.moedas).toBe(noite.entregues * 10);
  });
});

describe("equilíbrio", () => {
  test("quem faz as contas e acerta só parte das chaminés zera o jogo", () => {
    for (const s of SEMENTES.slice(0, 12)) {
      const { zerou, tropecos, estado } = campanha(s, ACERTA, 0.2);
      expect(zerou, `semente ${s}: tropeçou em ${tropecos} e parou na fase ${estado.fase}`).toBe(true);
      expect(tropecos.length).toBeLessThanOrEqual(2);
    }
  });

  test("quem faz as contas passa toda fase, mesmo errando algumas contas e chaminés", () => {
    for (let fase = 1; fase <= ULTIMA_FASE; fase++) {
      for (const escolha of [ACERTA, QUASE]) {
        const passaram = SEMENTES.filter((s) => {
          const { estado, completou } = noiteNaFase(fase, s, escolha, 0.2);
          return completou && estado.noite.entregues >= estado.noite.config.meta;
        });
        expect(passaram.length / SEMENTES.length, `fase ${fase}`).toBeGreaterThanOrEqual(0.9);
      }
    }
  });

  test("chutar ou escolher pelo tamanho não completa o time depois das primeiras noites", () => {
    for (let fase = ULTIMA_FASE_MANSA + 1; fase <= ULTIMA_FASE; fase++) {
      for (const escolha of [CHUTA, MAIOR, MENOR, MEIO]) {
        const completaram = SEMENTES.filter((s) => noiteNaFase(fase, s, escolha).completou);
        expect(completaram.length / SEMENTES.length, `fase ${fase}`).toBeLessThanOrEqual(0.2);
      }
    }
  });

  test("sem melhorias, a última noite fica difícil: a oficina importa", () => {
    const passaram = SEMENTES.filter((s) => {
      const rng = semente(s);
      const estado = novoJogo(ULTIMA_FASE, LARGURA, rng);
      pilotar(estado, ACERTA, rng, 0.2);
      return estado.noite.entregues >= estado.noite.config.meta;
    });
    expect(passaram.length / SEMENTES.length).toBeLessThanOrEqual(0.5);
  });
});

describe("progresso", () => {
  test("perder nas primeiras noites não custa coração", () => {
    const estado = novoJogo(1, LARGURA, semente(1));
    expect(encerrar(estado).perdeuVida).toBe(false);
    expect(estado.vidas).toBe(VIDAS_INICIAIS);
    estado.fase = ULTIMA_FASE_MANSA + 1;
    prepararNoite(estado);
    expect(encerrar(estado).perdeuVida).toBe(true);
    expect(estado.vidas).toBe(VIDAS_INICIAIS - 1);
  });

  test("a última noite zera o jogo e a fase não passa da última", () => {
    const estado = novoJogo(ULTIMA_FASE, LARGURA, semente(1));
    estado.noite.entregues = estado.noite.config.meta;
    const resultado = encerrar(estado);
    expect(resultado.zerou).toBe(true);
    expect(estado.fase).toBe(ULTIMA_FASE);
  });

  test("quem continua de uma fase adiantada chega com moedas para a oficina", () => {
    expect(verbaDaFase(1)).toBe(0);
    expect(verbaDaFase(6)).toBeGreaterThan(TRENOS.classico.preco);
  });

  test("toda fase tem time, meta e tipos de conta", () => {
    for (const config of FASES) {
      expect(config.renas).toBeGreaterThan(0);
      expect(config.meta).toBeGreaterThan(0);
      expect(config.tipos.length).toBeGreaterThan(0);
    }
  });
});

describe("oficina", () => {
  test("compra, troca de trenó, pinta e não compra duas vezes", () => {
    const estado = novoJogo(1, LARGURA, semente(1));
    expect(comprar(estado, { tipo: "treno", id: "classico" })).toBe("falta");
    estado.moedas = 1000;
    expect(comprar(estado, { tipo: "treno", id: "classico" })).toBe("comprou");
    expect(estado.oficina.treno).toBe("classico");
    expect(estado.moedas).toBe(1000 - TRENOS.classico.preco);
    expect(comprar(estado, { tipo: "treno", id: "classico" })).toBe("nada");
    usarTreno(estado, "madeira");
    expect(estado.oficina.treno).toBe("madeira");
    usarTreno(estado, "foguete");
    expect(estado.oficina.treno).toBe("madeira");
    pintar(estado, "#18b67e");
    expect(estado.oficina.cor).toBe("#18b67e");
    expect(comprar(estado, { tipo: "melhoria", id: "saco" })).toBe("comprou");
    prepararNoite(estado);
    expect(estado.noite.saco).toBe(capacidade(estado.oficina));
    expect(capacidade(estado.oficina)).toBeGreaterThan(10);
  });
});
