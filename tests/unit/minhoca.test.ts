import { expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import {
  casas,
  chegouNoAlvo,
  configDaFase,
  letraCerta,
  novaFase,
  novoJogo,
  palavraAtual,
  passo,
  pontoDoCorpo,
  RAIO_DA_CABECA,
  RAIO_DA_LETRA,
  redimensionar,
  seguirAdiante,
  ULTIMA_FASE_MANSA,
  VIDAS_INICIAIS,
  type Estado,
  type Evento,
  type Letra,
  type Ponto,
} from "../../src/jogos/minhoca/logica";
import { C_SS, CURTAS, G_J, S_Z, TODAS, X_CH, type Palavra } from "../../src/jogos/minhoca/palavras";

const CAMPO = { largura: 340, altura: 340 };
const QUADRO = 1 / 60;
const FASES = Array.from({ length: 16 }, (_, i) => i + 1);
const SEMENTES = Array.from({ length: 40 }, (_, i) => i + 1);

// Gerador simples e reproduzível, para os testes não dependerem do acaso.
function semente(valor: number): Rng {
  let s = valor * 2654435761;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const jogo = (fase = 1, s = 1) => novoJogo(fase, CAMPO, semente(s));

function ate(estado: Estado, alvo: Ponto, rng: Rng, quadros = 3000) {
  for (let i = 0; i < quadros; i++) {
    const evento = passo(estado, alvo, QUADRO, rng);
    if (evento) return evento;
  }
  return null;
}

function encostar(estado: Estado, letra: Letra, rng = semente(9)) {
  estado.minhoca.x = letra.x;
  estado.minhoca.y = letra.y;
  return passo(estado, { x: letra.x, y: letra.y }, 0, rng);
}

const certa = (estado: Estado) => estado.letras.find(({ texto }) => texto === letraCerta(estado))!;
const errada = (estado: Estado) => estado.letras.find(({ texto }) => texto !== letraCerta(estado))!;

function comerTudo(estado: Estado) {
  let evento: Evento | null = null;
  while (evento?.tipo !== "palavra") evento = encostar(estado, certa(estado));
  return evento;
}

test("toda palavra tem desenho próprio, escrita única e sem acento decomposto", () => {
  expect(new Set(TODAS.map(({ desenho }) => desenho)).size).toBe(TODAS.length);
  expect(new Set(TODAS.map(({ texto }) => texto)).size).toBe(TODAS.length);
  TODAS.forEach(({ texto, pedacos, iscas }) => {
    expect(texto).toMatch(/^[A-ZÃÇ]+$/);
    expect(texto).toBe(texto.normalize("NFC"));
    expect(pedacos.join("")).toBe(texto);
    expect(iscas).toHaveLength(pedacos.length);
  });
});

test("a marcação da armadilha vira uma casa só, com a isca ao lado", () => {
  const chave = X_CH.find(({ texto }) => texto === "CHAVE")!;
  expect(chave.pedacos).toEqual(["CH", "A", "V", "E"]);
  expect(chave.iscas).toEqual(["X", null, null, null]);
});

// Nenhuma das duas respostas pode ser sempre a certa, senão bastaria decorar uma letra.
test.each([
  ["S ou Z", S_Z, "S", "Z"],
  ["X ou CH", X_CH, "X", "CH"],
  ["Ç ou SS", C_SS, "Ç", "SS"],
  ["G ou J", G_J, "G", "J"],
])("%s tem palavras dos dois lados", (_, grupo, um, outro) => {
  const contar = (certo: string) =>
    grupo.filter(({ pedacos, iscas }) => pedacos.some((pedaco, i) => pedaco === certo && iscas[i])).length;
  expect(contar(um)).toBeGreaterThanOrEqual(4);
  expect(contar(outro)).toBeGreaterThanOrEqual(4);
});

test("toda armadilha põe certo e isca lado a lado, nunca a mesma letra", () => {
  TODAS.forEach(({ pedacos, iscas }) => {
    iscas.forEach((isca, i) => {
      if (isca) expect(isca).not.toBe(pedacos[i]);
    });
  });
});

test.each(FASES)("fase %i sorteia palavras diferentes, na quantidade certa", (fase) => {
  for (const s of SEMENTES) {
    const { palavras } = jogo(fase, s);
    expect(palavras).toHaveLength(configDaFase(fase).quantas);
    expect(new Set(palavras).size).toBe(palavras.length);
  }
});

test.each(FASES)("fase %i sempre tem a letra certa e a isca no jardim, sem letra repetida", (fase) => {
  for (const s of SEMENTES) {
    const rng = semente(s);
    let estado = novoJogo(fase, CAMPO, rng);
    const { opcoes } = configDaFase(fase);
    for (let i = 0; i < 80 && estado.fase === fase; i++) {
      const textos = estado.letras.map(({ texto }) => texto);
      expect(textos).toContain(letraCerta(estado));
      const isca = palavraAtual(estado).iscas[estado.comidas];
      if (isca) expect(textos).toContain(isca);
      expect(textos).toHaveLength(opcoes);
      expect(new Set(textos).size).toBe(opcoes);

      const evento = encostar(estado, certa(estado), rng);
      if (evento?.tipo === "palavra") estado = seguirAdiante(estado, rng).estado;
    }
  }
});

test.each(FASES)("fase %i planta as letras dentro do jardim e sem encostar umas nas outras", (fase) => {
  for (const s of SEMENTES) {
    const { letras, minhoca } = jogo(fase, s);
    letras.forEach((letra, i) => {
      expect(letra.x).toBeGreaterThanOrEqual(RAIO_DA_LETRA);
      expect(letra.y).toBeGreaterThanOrEqual(RAIO_DA_LETRA);
      expect(letra.x).toBeLessThanOrEqual(CAMPO.largura - RAIO_DA_LETRA);
      expect(letra.y).toBeLessThanOrEqual(CAMPO.altura - RAIO_DA_LETRA);
      expect(Math.hypot(letra.x - minhoca.x, letra.y - minhoca.y)).toBeGreaterThan(80);
      letras.slice(i + 1).forEach((outra) => {
        expect(Math.hypot(letra.x - outra.x, letra.y - outra.y)).toBeGreaterThan(2 * RAIO_DA_LETRA);
      });
    });
  }
});

test("a dificuldade só sobe: a velocidade nunca cai e a mansidão acaba", () => {
  FASES.slice(1).forEach((fase) => {
    expect(configDaFase(fase).velocidade).toBeGreaterThanOrEqual(configDaFase(fase - 1).velocidade);
    expect(configDaFase(fase).opcoes).toBeGreaterThanOrEqual(configDaFase(fase - 1).opcoes);
  });
  expect(configDaFase(ULTIMA_FASE_MANSA).mansa).toBe(true);
  expect(configDaFase(ULTIMA_FASE_MANSA + 1).mansa).toBe(false);
  expect(configDaFase(FASES.at(-1)!).velocidade).toBeGreaterThanOrEqual(2 * configDaFase(1).velocidade);
});

test("a guia mostra a palavra toda, depois só o início, depois nada", () => {
  const estado = jogo(1);
  expect(casas(estado).every(({ tipo }) => tipo === "guia")).toBe(true);
  expect(casas(jogo(2)).map(({ tipo }) => tipo).slice(0, 2)).toEqual(["guia", "vazia"]);
  expect(casas(jogo(4)).every(({ tipo, texto }) => tipo === "vazia" && texto === "")).toBe(true);
});

test("comer a letra certa enche a casa, rende pontos e a próxima já está no jardim", () => {
  const estado = jogo(4);
  const primeira = letraCerta(estado);
  const evento = encostar(estado, certa(estado));
  expect(evento?.tipo).toBe("comeu");
  expect(estado.comidas).toBe(1);
  expect(estado.pontos).toBe(2);
  expect(casas(estado)[0]).toEqual({ texto: primeira, tipo: "comida" });
  expect(estado.letras.map(({ texto }) => texto)).toContain(letraCerta(estado));
});

test("palavra sem erro rende bônus e não volta no reforço", () => {
  const estado = jogo(4);
  const evento = comerTudo(estado);
  expect(evento).toMatchObject({ tipo: "palavra", perfeita: true });
  expect(estado.pontos).toBe(palavraAtual(estado).pedacos.length * 2 + 5);
  expect(estado.reforco).toEqual([]);
});

test("nas fases mansas a letra errada só é cuspida, e não tira coração", () => {
  const estado = jogo(ULTIMA_FASE_MANSA);
  const letra = errada(estado);
  const evento = encostar(estado, letra);
  expect(evento).toMatchObject({ tipo: "errou", perdeu: false, certa: letraCerta(estado) });
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
  const cuspida = estado.letras.find(({ id }) => id === letra.id)!;
  expect(Math.hypot(cuspida.x - estado.minhoca.x, cuspida.y - estado.minhoca.y)).toBeGreaterThan(60);
});

test("depois da mansidão a letra errada custa um coração e mostra a resposta na casa", () => {
  const estado = jogo(ULTIMA_FASE_MANSA + 1);
  const evento = encostar(estado, errada(estado));
  expect(evento).toMatchObject({ tipo: "errou", perdeu: true });
  expect(estado.vidas).toBe(VIDAS_INICIAIS - 1);
  expect(casas(estado)[0]).toEqual({ texto: letraCerta(estado), tipo: "guia" });
});

test("o aviso diz quando o erro foi em uma armadilha", () => {
  const estado = novaFase(6, 3, 0, CAMPO, [], semente(3));
  estado.palavras = [S_Z.find(({ texto }) => texto === "CASA")!];
  estado.comidas = 2;
  estado.letras = [
    { id: 1, texto: "S", x: 40, y: 40 },
    { id: 2, texto: "Z", x: 300, y: 300 },
    { id: 3, texto: "B", x: 40, y: 300 },
  ];
  expect(encostar(estado, estado.letras[1])).toMatchObject({ tipo: "errou", armadilha: true, certa: "S" });
});

test("passar por cima de uma letra errada a caminho de outro lugar é de graça", () => {
  const estado = jogo(ULTIMA_FASE_MANSA + 1);
  const letra = errada(estado);
  estado.minhoca.x = letra.x;
  estado.minhoca.y = letra.y;
  const longe = { x: letra.x > 170 ? 30 : 310, y: letra.y };
  expect(passo(estado, longe, 0, semente(1))).toBeNull();
  expect(passo(estado, null, 0, semente(1))).toBeNull();
  expect(estado.vidas).toBe(VIDAS_INICIAIS);
});

test("o dedo em cima da letra certa nunca conta como mirar na vizinha", () => {
  for (const s of SEMENTES) {
    const { letras } = jogo(ULTIMA_FASE_MANSA + 1, s);
    letras.forEach((letra, i) => {
      letras.slice(i + 1).forEach((outra) => {
        expect(Math.hypot(letra.x - outra.x, letra.y - outra.y)).toBeGreaterThan(RAIO_DA_LETRA * 3);
      });
    });
  }
});

test("letra errada não rende pontos e a palavra volta na fase seguinte", () => {
  const rng = semente(4);
  const estado = novoJogo(ULTIMA_FASE_MANSA, CAMPO, rng);
  const palavra = palavraAtual(estado);
  encostar(estado, errada(estado));
  const pontos = estado.pontos;
  encostar(estado, certa(estado));
  expect(estado.pontos).toBe(pontos);
  expect(comerTudo(estado)).toMatchObject({ tipo: "palavra", perfeita: false });
  expect(estado.reforco).toEqual([palavra]);

  estado.feitas = estado.palavras.length - 1;
  const { estado: proxima, passou } = seguirAdiante(estado, rng);
  expect(passou).toBe(true);
  expect(proxima.palavras).toContain(palavra);
  expect(proxima.reforco).toEqual([]);
});

test("o reforço não ocupa a fase inteira e guarda o resto para depois", () => {
  const reforco: Palavra[] = CURTAS.slice(0, 3);
  const estado = novaFase(6, 3, 0, CAMPO, reforco, semente(2));
  expect(estado.palavras).toHaveLength(configDaFase(6).quantas);
  expect(estado.palavras.filter((palavra) => reforco.includes(palavra))).toHaveLength(1);
  expect(estado.reforco).toEqual(reforco.slice(1));
});

test("a palavra errada volta uma vez só, mesmo que a criança erre de novo", () => {
  const rng = semente(6);
  const palavra = CURTAS[0];
  const estado = novaFase(ULTIMA_FASE_MANSA, 3, 0, CAMPO, [palavra], rng);
  while (palavraAtual(estado) !== palavra) {
    comerTudo(estado);
    seguirAdiante(estado, rng);
  }
  encostar(estado, errada(estado));
  expect(comerTudo(estado)).toMatchObject({ tipo: "palavra", perfeita: false });
  expect(estado.reforco).toEqual([]);
});

function palavrasDe(primeira: number, ultima: number, vistas: Palavra[] = []) {
  const rng = semente(primeira * 100 + ultima);
  let estado = novoJogo(primeira, CAMPO, rng, vistas);
  const lista: Palavra[] = [];
  for (let fase = primeira; fase <= ultima; fase++) {
    lista.push(...estado.palavras);
    estado.feitas = estado.palavras.length - 1;
    estado = seguirAdiante(estado, rng).estado;
  }
  return { lista, vistas: estado.vistas };
}

test("uma partida inteira não repete nenhuma palavra", () => {
  const { lista } = palavrasDe(1, 16);
  expect(new Set(lista).size).toBe(lista.length);
});

test("recomeçar a mesma fase só repete depois de acabarem as inéditas", () => {
  const primeira = palavrasDe(4, 4);
  const segunda = palavrasDe(4, 4, primeira.vistas);
  expect(new Set([...primeira.lista, ...segunda.lista]).size).toBe(8);

  const terceira = palavrasDe(4, 4, segunda.vistas);
  const repetidas = terceira.lista.filter((palavra) => primeira.lista.includes(palavra) || segunda.lista.includes(palavra));
  expect(repetidas.length).toBe(2);
  repetidas.forEach((palavra) => expect(primeira.lista).toContain(palavra));
});

test("a última palavra passa de fase, soma o bônus e devolve uma vida", () => {
  const rng = semente(5);
  const estado = novoJogo(3, CAMPO, rng);
  estado.vidas = 1;
  estado.feitas = estado.palavras.length - 1;
  const pontos = estado.pontos;
  const { estado: proxima, bonus, passou } = seguirAdiante(estado, rng);
  expect(passou).toBe(true);
  expect(bonus).toBe(30);
  expect(proxima).toMatchObject({ fase: 4, vidas: 2, pontos: pontos + 30, feitas: 0, comidas: 0 });
});

test("a vida devolvida nunca passa do máximo", () => {
  const estado = jogo(1);
  estado.feitas = estado.palavras.length - 1;
  expect(seguirAdiante(estado, semente(1)).estado.vidas).toBe(VIDAS_INICIAIS);
});

test("sem ninguém guiando, a mansa descansa", () => {
  const estado = jogo(1);
  const { x, y } = estado.minhoca;
  for (let i = 0; i < 100; i++) passo(estado, null, QUADRO, semente(1));
  expect(estado.minhoca).toMatchObject({ x, y });
});

test("solta, a outra nunca sai do jardim nem perde coração, por mais que ande", () => {
  for (const s of SEMENTES) {
    const rng = semente(s);
    const estado = novoJogo(ULTIMA_FASE_MANSA + 1, CAMPO, rng);
    estado.minhoca.angulo = rng() * 7;
    for (let i = 0; i < 3000; i++) {
      passo(estado, null, QUADRO, rng);
      const { x, y } = estado.minhoca;
      expect(x).toBeGreaterThanOrEqual(RAIO_DA_CABECA);
      expect(y).toBeGreaterThanOrEqual(RAIO_DA_CABECA);
      expect(x).toBeLessThanOrEqual(CAMPO.largura - RAIO_DA_CABECA);
      expect(y).toBeLessThanOrEqual(CAMPO.altura - RAIO_DA_CABECA);
    }
    expect(estado.vidas).toBe(VIDAS_INICIAIS);
  }
});

test("a curva sempre alcança a letra, mesmo colada ao lado da cabeça", () => {
  for (const s of SEMENTES) {
    const rng = semente(s);
    const estado = jogo(1, s);
    const letra = certa(estado);
    const angulo = rng() * Math.PI * 2;
    estado.minhoca.x = letra.x + Math.cos(angulo) * 90;
    estado.minhoca.y = letra.y + Math.sin(angulo) * 90;
    estado.minhoca.angulo = rng() * Math.PI * 2;
    estado.minhoca.rastro.unshift({ x: estado.minhoca.x, y: estado.minhoca.y });
    estado.letras = [letra];
    expect(ate(estado, letra, rng)?.tipo).toBe("comeu");
  }
});

test("o corpo segue o caminho da cabeça, gomo por gomo", () => {
  const estado = jogo(1);
  const alvo = { x: 300, y: 300 };
  const caminho: Ponto[] = [];
  estado.letras = [];
  for (let i = 0; i < 120; i++) {
    passo({ ...estado, letras: [{ id: 0, texto: letraCerta(estado), x: -999, y: -999 }] }, alvo, QUADRO, semente(1));
    caminho.push({ x: estado.minhoca.x, y: estado.minhoca.y });
  }
  const atras = pontoDoCorpo(estado.minhoca, 32);
  const maisPerto = Math.min(...caminho.map((ponto) => Math.hypot(ponto.x - atras.x, ponto.y - atras.y)));
  expect(maisPerto).toBeLessThan(2);
  expect(chegouNoAlvo({ ...estado.minhoca, ...alvo }, alvo)).toBe(true);
});

// Prepara um corpo comprido com a cabeça em cima dele, como se ela tivesse dado a volta.
function enroscada(fase: number) {
  const estado = jogo(fase);
  estado.palavras = [TODAS.find(({ texto }) => texto === "BICICLETA")!];
  estado.comidas = 6;
  estado.letras = [{ id: 1, texto: letraCerta(estado), x: 20, y: 20 }];
  const { minhoca } = estado;
  const raio = 40;
  minhoca.rastro = Array.from({ length: 100 }, (_, i) => {
    const angulo = (i * 4) / raio;
    return { x: 170 + Math.cos(angulo) * raio, y: 170 + Math.sin(angulo) * raio };
  });
  minhoca.x = minhoca.rastro[0].x;
  minhoca.y = minhoca.rastro[0].y;
  minhoca.angulo = Math.PI / 2;
  return estado;
}

test("guiada, ela morde o próprio corpo e perde um coração, uma vez só", () => {
  const estado = enroscada(ULTIMA_FASE_MANSA + 1);
  const dentro = { x: 170, y: 170 };
  const eventos = Array.from({ length: 8 }, () => passo(estado, dentro, QUADRO, semente(1)));
  expect(eventos.filter((evento) => evento?.tipo === "mordeu")).toHaveLength(1);
  expect(estado.vidas).toBe(VIDAS_INICIAIS - 1);
});

test("nas fases mansas e com o dedo solto, passar por cima do corpo é de graça", () => {
  const mansa = enroscada(ULTIMA_FASE_MANSA);
  expect(passo(mansa, { x: 170, y: 170 }, QUADRO, semente(1))).toBeNull();
  const solta = enroscada(ULTIMA_FASE_MANSA + 1);
  expect(passo(solta, null, QUADRO, semente(1))).toBeNull();
});

test("mudar o tamanho da tela leva tudo junto", () => {
  const estado = jogo(1);
  const letra = { ...estado.letras[0] };
  const { x } = estado.minhoca;
  redimensionar(estado, { largura: 680, altura: 170 });
  expect(estado.minhoca.x).toBe(x * 2);
  expect(estado.letras[0].x).toBe(letra.x * 2);
  expect(estado.letras[0].y).toBe(letra.y / 2);
  expect(estado.campo).toEqual({ largura: 680, altura: 170 });
});

// Joga uma fase inteira de verdade, com a cabeça andando até a letra escolhida.
function jogar(fase: number, s: number, escolher: (estado: Estado) => Letra) {
  const rng = semente(s);
  let estado = novaFase(fase, VIDAS_INICIAIS, 0, CAMPO, [], rng);
  for (let i = 0; i < 60_000; i++) {
    const evento = passo(estado, escolher(estado), QUADRO, rng);
    if (estado.vidas <= 0) return false;
    if (evento?.tipo === "palavra") {
      const { estado: proximo, passou } = seguirAdiante(estado, rng);
      if (passou) return true;
      estado = proximo;
    }
  }
  return false;
}

const taxa = (fase: number, escolher: (estado: Estado) => Letra) =>
  SEMENTES.filter((s) => jogar(fase, s, escolher)).length / SEMENTES.length;

// Quem só vai na letra mais perto, sem pensar na palavra.
const maisPerto = ({ letras, minhoca }: Estado) =>
  [...letras].sort((a, b) => Math.hypot(a.x - minhoca.x, a.y - minhoca.y) - Math.hypot(b.x - minhoca.x, b.y - minhoca.y))[0];

test.each(FASES)("fase %i: quem sabe escrever vence, mesmo sem desviar de nada", (fase) => {
  expect(taxa(fase, certa)).toBeGreaterThanOrEqual(0.95);
});

test.each(FASES.filter((fase) => fase > ULTIMA_FASE_MANSA))("fase %i: ir na letra mais perto não vence", (fase) => {
  expect(taxa(fase, maisPerto)).toBeLessThanOrEqual(0.2);
});
