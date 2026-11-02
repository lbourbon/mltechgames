import { expect, test } from "vitest";
import { ADIVINHAS, ITEM, ITENS, NECESSIDADES } from "../../src/jogos/garcom/cardapio";
import {
  colocar,
  configDaFase,
  conferir,
  enfeites,
  MAX_BANDEJA,
  novidades,
  novoJogo,
  servir,
  tirar,
  usarDica,
  VIDAS_INICIAIS,
  type Estado,
  type Pedido,
} from "../../src/jogos/garcom/logica";
import type { Rng } from "../../src/jogos/kit/sorteio";

// Sequência fixa: as simulações dão sempre o mesmo resultado.
function semente(valor: number): Rng {
  return () => {
    valor = (valor + 0x6d2b79f5) | 0;
    let t = Math.imul(valor ^ (valor >>> 15), 1 | valor);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A primeira resposta aceita que está na prateleira, na quantidade e na ordem do pedido.
const resposta = ({ pedido, prateleira }: Estado) =>
  pedido.linhas.flatMap(({ aceita, quantos }) =>
    Array<string>(quantos).fill(aceita.find((id) => prateleira.includes(id))!),
  );

const montar = (estado: Estado, itens: string[]) => itens.reduce(colocar, { ...estado, bandeja: [] });

const atender = (estado: Estado, rng: Rng) => servir(montar(estado, resposta(estado)), rng);

// Joga certo até a fase pedida, devolvendo cada pedido que apareceu.
function percorrer(ultimaFase: number, seed: number) {
  const rng = semente(seed);
  const vistos: Estado[] = [];
  let estado = novoJogo(1, rng);
  while (estado.fase <= ultimaFase) {
    vistos.push(estado);
    estado = atender(estado, rng).estado;
  }
  return vistos;
}

function faseCom(tipo: Pedido["tipo"], fase: number, rng: Rng, condicao = (_: Estado) => true) {
  for (let i = 0; i < 400; i++) {
    let estado = novoJogo(fase, rng);
    while (estado.fase === fase) {
      if (estado.pedido.tipo === tipo && condicao(estado)) return estado;
      estado = atender(estado, rng).estado;
    }
  }
  throw new Error(`nenhum pedido ${tipo} na fase ${fase}`);
}

test("o cardápio não repete itens, e as charadas só citam o que existe", () => {
  expect(new Set(ITENS.map((item) => item.id)).size).toBe(ITENS.length);
  [...NECESSIDADES, ...ADIVINHAS].forEach(({ aceita }) => aceita.forEach((id) => expect(ITEM[id]).toBeDefined()));
});

test("todo item tem como ser desenhado e o artigo combina com a palavra", () => {
  ITENS.forEach((item) => {
    expect(item.emoji || (item.forma && item.cor)).toBeTruthy();
    if (item.artigo !== "some") expect(item.artigo).toBe(/^[aeiou]/.test(item.en) ? "an" : "a");
    if (item.artigo === "some") expect(item.plural).toBeUndefined();
  });
});

test("cada fase autoral traz palavras novas", () => {
  for (let fase = 1; fase <= 16; fase++) expect(novidades(fase).length).toBeGreaterThan(0);
  expect(novidades(5).map((item) => item.cor)).toEqual(["red", "blue", "yellow", "green"]);
});

test("toda fase tem solução: a resposta está na prateleira e cabe na bandeja", () => {
  for (let seed = 1; seed <= 25; seed++) {
    percorrer(30, seed).forEach((estado) => {
      const { pedido, prateleira, fase } = estado;
      const itens = resposta(estado);
      expect(new Set(prateleira).size).toBe(prateleira.length);
      expect(prateleira).toHaveLength(configDaFase(fase).prateleira);
      expect(itens.every(Boolean)).toBe(true);
      expect(itens.length).toBeLessThanOrEqual(MAX_BANDEJA);
      pedido.armadilhas.forEach((id) => expect(prateleira).toContain(id));
      prateleira.forEach((id) => expect(ITEM[id].fase).toBeLessThanOrEqual(fase));
    });
  }
});

test("a prateleira nunca oferece uma segunda resposta certa escondida", () => {
  percorrer(14, 7).forEach(({ pedido, prateleira }) => {
    pedido.armadilhas.forEach((id) => expect(pedido.linhas.flatMap((l) => l.aceita)).not.toContain(id));
    const certos = prateleira.filter((id) => pedido.linhas.some((l) => l.aceita.includes(id)));
    expect(certos).toHaveLength(pedido.linhas.length);
  });
});

test("a gramática das frases sai certa em todas as fases", () => {
  for (let seed = 1; seed <= 25; seed++) {
    percorrer(20, seed).forEach(({ pedido: { frase } }) => {
      expect(frase).not.toMatch(/\ba [aeiou]/i);
      expect(frase).not.toMatch(/\ban [^aeiou\s]/i);
      (frase.match(/\b(two|three) [^,.!?]*/gi) ?? []).forEach((trecho) => {
        expect(trecho.split(" and ")[0]).toMatch(/s$/);
      });
      expect(frase).not.toMatch(/\b(undefined|null)\b/);
      expect(frase).toMatch(/^[A-Z]/);
      expect(frase).toMatch(/[.!?]$/);
    });
  }
});

test("o pedido cresce: das palavras soltas às frases que pedem interpretação", () => {
  const tipos = percorrer(12, 3).map(({ pedido, fase }) => ({ fase, tipo: pedido.tipo }));
  const estreia = (tipo: Pedido["tipo"]) => tipos.find((outro) => outro.tipo === tipo)?.fase;
  expect(estreia("palavra")).toBe(1);
  expect(estreia("pedido")).toBe(2);
  expect(estreia("numero")).toBe(4);
  expect(estreia("cor")).toBe(5);
  expect(estreia("dois")).toBe(6);
  expect(estreia("nao")).toBe(7);
  expect(estreia("ordem")).toBe(8);
  expect(estreia("muda")).toBe(9);
  expect(estreia("precisa")).toBe(10);
  expect(estreia("adivinha")).toBe(11);
});

test("o chefão fecha toda fase, e seu pedido cresce", () => {
  const rng = semente(5);
  [1, 4, 8].forEach((fase, i) => {
    const chefao = faseCom("chefao", fase, rng);
    expect(chefao.numero).toBe(configDaFase(fase).pedidos - 1);
    expect(chefao.pedido.linhas).toHaveLength([2, 3, 4][i]);
  });
});

test("nas fases de NO, tocar na primeira palavra citada não resolve", () => {
  const rng = semente(11);
  const estado = faseCom("nao", 7, rng, ({ pedido }) => pedido.frase.startsWith("No "));
  const citada = estado.pedido.armadilhas[0];
  expect(estado.prateleira).toContain(citada);
  const { resultado } = servir(colocar(estado, citada), rng);
  expect(resultado).toBe("errou");
});

test("quem muda de ideia só quer o último item citado", () => {
  const rng = semente(12);
  const estado = faseCom("muda", 9, rng);
  const [desistiu] = estado.pedido.armadilhas;
  const [{ aceita: [quer] }] = estado.pedido.linhas;
  expect(estado.pedido.frase.toLowerCase().indexOf(ITEM[desistiu].en)).toBeLessThan(
    estado.pedido.frase.toLowerCase().lastIndexOf(ITEM[quer].en),
  );
  expect(servir(colocar(estado, desistiu), rng).resultado).toBe("errou");
  expect(servir(colocar(estado, quer), rng).resultado).toMatch(/certo|fase/);
});

test("na ordem trocada perde o coração e a bandeja esvazia", () => {
  const rng = semente(13);
  const estado = faseCom("ordem", 8, rng);
  const [primeiro, depois] = resposta(estado);
  const { estado: depoisDoErro, resultado } = servir(montar(estado, [depois, primeiro]), rng);
  expect(resultado).toBe("ordem");
  expect(depoisDoErro.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(depoisDoErro.bandeja).toEqual([]);
  expect(servir(montar(estado, [primeiro, depois]), rng).resultado).toMatch(/certo|fase/);
});

test("qualquer resposta aceita resolve uma necessidade", () => {
  const pedido: Pedido = {
    tipo: "precisa",
    frase: "I'm thirsty!",
    linhas: [{ aceita: ["water", "juice", "milk"], quantos: 1 }],
    emOrdem: false,
    armadilhas: [],
  };
  ["water", "juice", "milk"].forEach((id) => {
    expect(conferir(pedido, [id])).toEqual({ sobram: [], completo: true, emOrdem: true });
  });
  expect(conferir(pedido, ["water", "milk"]).sobram).toEqual([1]);
});

test("item errado custa um coração, some da bandeja e o certo fica", () => {
  const rng = semente(14);
  const estado = faseCom("dois", 6, rng);
  const errado = estado.prateleira.find((id) => !resposta(estado).includes(id))!;
  const certo = resposta(estado)[0];
  const { estado: novo, resultado, sobraram } = servir(montar(estado, [certo, errado]), rng);
  expect(resultado).toBe("errou");
  expect(sobraram).toEqual([errado]);
  expect(novo.bandeja).toEqual([certo]);
  expect(novo.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(novo.pedido.frase).toBe(estado.pedido.frase);
  expect(novo.sequencia).toBe(0);
});

test("faltar item é de graça e não muda nada", () => {
  const rng = semente(15);
  const estado = faseCom("dois", 6, rng);
  const incompleta = colocar(estado, resposta(estado)[0]);
  const { estado: novo, resultado } = servir(incompleta, rng);
  expect(resultado).toBe("faltou");
  expect(novo).toEqual(incompleta);
});

test("item a mais também conta como erro", () => {
  const rng = semente(16);
  const estado = faseCom("numero", 4, rng);
  const itens = resposta(estado);
  const { resultado, estado: novo } = servir(montar(estado, [...itens, itens[0]]), rng);
  expect(resultado).toBe("errou");
  expect(novo.bandeja).toEqual(itens);
});

test("os corações acabam no terceiro erro, sem trocar de pedido", () => {
  const rng = semente(17);
  let estado = novoJogo(1, rng);
  const errado = estado.prateleira.find((id) => !resposta(estado).includes(id))!;
  const frase = estado.pedido.frase;
  estado = servir(colocar(estado, errado), rng).estado;
  estado = servir(colocar(estado, errado), rng).estado;
  expect(estado.pedido.frase).toBe(frase);
  expect(servir(colocar(estado, errado), rng).resultado).toBe("fim");
});

test("a dica aparece sozinha no segundo erro", () => {
  const rng = semente(18);
  const estado = faseCom("numero", 5, rng);
  const errado = estado.prateleira.find((id) => id !== resposta(estado)[0])!;
  const primeiro = servir(colocar(estado, errado), rng).estado;
  expect(primeiro.dica).toBe(false);
  expect(servir(colocar(primeiro, errado), rng).estado.dica).toBe(true);
});

test("na fase 1, que não tem painel de novidades, a dica vem no primeiro erro", () => {
  const rng = semente(29);
  const estado = novoJogo(1, rng);
  const errado = estado.prateleira.find((id) => id !== resposta(estado)[0])!;
  expect(servir(colocar(estado, errado), rng).estado.dica).toBe(true);
});

test("a palavra errada volta logo nos pedidos seguintes", () => {
  const rng = semente(19);
  const estado = faseCom("palavra", 1, rng, ({ numero }) => numero === 0);
  const pedida = resposta(estado)[0];
  const errado = estado.prateleira.find((id) => id !== pedida)!;
  const depois = servir(colocar(estado, errado), rng).estado;
  expect(depois.reforco).toContain(pedida);

  // Depois de servir certo, sai do reforço. Errar outra vez traz a palavra de volta.
  const servido = servir(montar(depois, resposta(depois)), rng).estado;
  expect(servido.reforco).not.toContain(pedida);

  const naFase3 = { ...novoJogo(3, rng), reforco: ["cake"] };
  const seguinte = atender(naFase3, rng).estado;
  expect(seguinte.pedido.linhas[0].aceita).toEqual(["cake"]);
});

test("as palavras novas saem antes das antigas", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rng = semente(seed);
    [2, 3, 7].forEach((fase) => {
      const { pedido } = novoJogo(fase, rng);
      const ids = pedido.linhas.flatMap((l) => l.aceita);
      expect(ids.some((id) => ITEM[id].fase === fase)).toBe(true);
    });
  }
});

test("a fase 3 não fica só no prato: os pedidos passam por coisas", () => {
  const coisas = percorrer(3, 21).filter(({ fase }) => fase === 3);
  const pedidas = coisas.flatMap(({ pedido }) => pedido.linhas.flatMap((l) => l.aceita));
  expect(pedidas.filter((id) => ITEM[id].fase === 3).length).toBeGreaterThanOrEqual(4);
});

test("sequência perfeita rende mais, e a dica tira só o bônus", () => {
  const rng = semente(24);
  const estado = novoJogo(2, rng);
  const perfeito = atender(estado, rng).estado;
  const ajudado = atender(usarDica(estado), rng).estado;
  expect(perfeito.pontos).toBeGreaterThan(ajudado.pontos);
  expect(ajudado.pontos).toBeGreaterThan(0);
  expect(perfeito.sequencia).toBe(1);
  expect(ajudado.sequencia).toBe(0);
  expect(ajudado.vidas).toBe(VIDAS_INICIAIS);
});

test("completar a fase enche os corações", () => {
  const rng = semente(25);
  let estado: Estado = { ...novoJogo(1, rng), vidas: 1 };
  while (estado.fase === 1) estado = atender(estado, rng).estado;
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
  expect(estado.numero).toBe(0);
});

test("bandeja tem limite e devolve o item tocado", () => {
  const rng = semente(26);
  let estado = novoJogo(1, rng);
  for (let i = 0; i < MAX_BANDEJA + 2; i++) estado = colocar(estado, "apple");
  expect(estado.bandeja).toHaveLength(MAX_BANDEJA);
  const misturada = montar(estado, ["apple", "cake", "milk"]);
  expect(tirar(misturada, 1).bandeja).toEqual(["apple", "milk"]);
});

test("a decoração vem da fase, sem precisar de dado novo", () => {
  expect(enfeites(1)).toEqual([]);
  expect(enfeites(3)).toHaveLength(2);
  expect(enfeites(500).length).toBeLessThanOrEqual(12);
});

test("fases sem fim continuam jogáveis", () => {
  expect(percorrer(40, 28).at(-1)!.fase).toBe(40);
});
