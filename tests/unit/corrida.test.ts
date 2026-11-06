import { describe, expect, test } from "vitest";
import type { Rng } from "../../src/jogos/kit/sorteio";
import { CARROS, EQUIPAMENTOS, type ModeloId } from "../../src/jogos/corrida/carros";
import { ATALHOS, formatar, gerarPar, QUANTOS_NIVEIS, raioDaPeca, total } from "../../src/jogos/corrida/dinheiro";
import {
  comprar,
  configDaFase,
  encerrar,
  FASES,
  gerarPares,
  LADO_DO_MONTE,
  limiteDoMuro,
  ligarTurbo,
  novoJogo,
  PARES_POR_VOLTA,
  passo,
  pintar,
  PODIO,
  posicaoDoRival,
  RAIO_DO_CARRO,
  RAIO_DO_OBSTACULO,
  ULTIMA_FASE,
  ULTIMA_FASE_MANSA,
  usarCarro,
  verbaDaFase,
  VIDAS_INICIAIS,
  type Comando,
  type Estado,
  type Evento,
} from "../../src/jogos/corrida/logica";
import {
  ALTURA,
  LARGURA,
  MEIA_PISTA,
  LONGE_NA_VOLTA,
  maisProximo,
  montarPista,
  pontoNaPista,
  QUANTAS_PISTAS,
} from "../../src/jogos/corrida/pistas";

const QUADRO = 1 / 60;
const SEMENTES = Array.from({ length: 30 }, (_, i) => i + 1);
const CORRIDAS = FASES.map((config, i) => ({ fase: i + 1, config })).filter(({ config }) => config.tipo === "corrida");
const PISTAS = Array.from({ length: QUANTAS_PISTAS }, (_, i) => [i, false] as const).flatMap(([i]) => [
  [i, false] as const,
  [i, true] as const,
]);

// Gerador simples e reproduzível, para os testes não dependerem do acaso.
function semente(valor: number): Rng {
  let s = valor * 2654435761;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function jogo(fase: number, modelo: ModeloId = "bolinha", s = 1) {
  const estado = novoJogo(fase, semente(s));
  if (!estado.garagem.carros.includes(modelo)) estado.garagem.carros.push(modelo);
  usarCarro(estado, modelo);
  return estado;
}

// Motorista de teste: mira um ponto da pista um pouco à frente, na faixa dos rivais, e gira o
// volante na direção dele. O distraído solta as setas uma parte do tempo, como uma criança que
// ainda aprende.
function motorista(distraido = 0, lado = 0) {
  let tempo = 0;
  return (estado: Estado): Comando => {
    tempo += QUADRO;
    if (distraido && Math.floor(tempo * 3) % 10 < distraido * 10) return null;
    const { pista, linha, jogador } = estado.corrida;
    const i = jogador.indice + 5 + jogador.vel * 0.06;
    const alvo = pontoNaPista(pista, i, linha[Math.round(i) % pista.n] + lado);
    const desvio = Math.atan2(alvo.y - jogador.y, alvo.x - jogador.x) - jogador.angulo;
    const giro = Math.atan2(Math.sin(desvio), Math.cos(desvio));
    return { acelera: 1, vira: Math.max(-1, Math.min(1, giro * 3)) };
  };
}

function correr(estado: Estado, dirigir: (estado: Estado) => Comando, segundos = 240) {
  const eventos: Evento[] = [];
  const rng = semente(7);
  for (let i = 0; i < segundos / QUADRO && !estado.corrida.terminou; i++) {
    eventos.push(...passo(estado, dirigir(estado), QUADRO, rng));
  }
  return eventos;
}

describe("pistas", () => {
  test.each(PISTAS)("pista %i (espelhada: %s) cabe na tela e não encosta em si mesma", (numero, espelhada) => {
    const pista = montarPista(numero, espelhada);
    const { pontos, n } = pista;
    pontos.forEach(({ x, y }) => {
      expect(x - MEIA_PISTA).toBeGreaterThan(0);
      expect(x + MEIA_PISTA).toBeLessThan(LARGURA);
      expect(y - MEIA_PISTA).toBeGreaterThan(0);
      expect(y + MEIA_PISTA).toBeLessThan(ALTURA);
    });
    // Trechos longe na volta precisam de grama entre eles.
    let menor = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const longeNaVolta = Math.min(j - i, n - (j - i)) * pista.passo;
        if (longeNaVolta < 4 * MEIA_PISTA) continue;
        menor = Math.min(menor, Math.hypot(pontos[i].x - pontos[j].x, pontos[i].y - pontos[j].y));
      }
    }
    expect(menor).toBeGreaterThan(2 * MEIA_PISTA + 16);
  });

  test.each(PISTAS)("pista %i (espelhada: %s): muro longe do asfalto, sem passagem para outro trecho", (numero, espelhada) => {
    const pista = montarPista(numero, espelhada);
    const { pontos, n } = pista;
    let menor = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.min(j - i, n - (j - i)) * pista.passo < LONGE_NA_VOLTA) continue;
        menor = Math.min(menor, Math.hypot(pontos[i].x - pontos[j].x, pontos[i].y - pontos[j].y));
      }
    }
    expect(menor).toBeGreaterThan(2 * pista.muro);
    expect(pista.muro).toBeGreaterThanOrEqual(MEIA_PISTA + 14);
    // O muro cabe na tela.
    pontos.forEach(({ x, y }) => {
      expect(Math.min(x, y, LARGURA - x, ALTURA - y)).toBeGreaterThan(pista.muro);
    });
  });

  test.each(PISTAS)("pista %i (espelhada: %s): montes em retas, dentro da tela e longe do resto da pista", (numero, espelhada) => {
    const pista = montarPista(numero, espelhada);
    expect(pista.montes).toHaveLength(PARES_POR_VOLTA);
    for (let nivel = 1; nivel <= QUANTOS_NIVEIS; nivel++) {
      for (const s of SEMENTES.slice(0, 5)) {
        for (const par of gerarPares(pista, nivel, semente(s))) {
          for (const peca of par.lados.flat()) {
            const raio = raioDaPeca(peca.valor) + 6;
            expect(peca.x - raio).toBeGreaterThan(0);
            expect(peca.x + raio).toBeLessThan(LARGURA);
            expect(peca.y - raio).toBeGreaterThan(0);
            expect(peca.y + raio).toBeLessThan(ALTURA);
            // Fica na beira da própria reta, sem cair em outro trecho da pista.
            expect(maisProximo(pista, peca).distancia).toBeGreaterThan(LADO_DO_MONTE - 1);
          }
        }
      }
    }
    for (const centro of pista.montes) {
      for (let d = -14; d <= 14; d++) expect(pista.curvas[(centro + d + pista.n) % pista.n]).toBeLessThan(0.001);
    }
  });
});

describe("dinheiro", () => {
  test("formata como no Brasil", () => {
    expect(formatar(5)).toBe("R$ 0,05");
    expect(formatar(125)).toBe("R$ 1,25");
    expect(formatar(123450)).toBe("R$ 1.234,50");
  });

  test.each(Array.from({ length: QUANTOS_NIVEIS }, (_, i) => i + 1))("nível %i: montes diferentes, e só contar acerta sempre", (nivel) => {
    const rng = semente(nivel);
    // A moeda que parece maior tem teste próprio: com notas, ela é a de maior valor.
    const acertos = { maisPecas: [0, 0], maiorPeca: [0, 0] };
    for (let i = 0; i < 600; i++) {
      const [a, b] = gerarPar(nivel, rng);
      expect(total(a)).not.toBe(total(b));
      const [rico, pobre] = total(a) > total(b) ? [a, b] : [b, a];
      for (const nome of Object.keys(acertos) as (keyof typeof acertos)[]) {
        const palpite = ATALHOS[nome](rico, pobre);
        if (palpite === 0) continue;
        acertos[nome][0] += palpite > 0 ? 1 : 0;
        acertos[nome][1]++;
      }
    }
    for (const nome of Object.keys(acertos) as (keyof typeof acertos)[]) {
      const [certos, palpites] = acertos[nome];
      // Com uma moeda só, a peça mais valiosa é a resposta: saber o valor das moedas é o desafio.
      if (palpites < 60 || (nivel === 1 && nome === "maiorPeca")) continue;
      // Nem o atalho nem o contrário dele vencem.
      expect(certos / palpites, `${nome} no nível ${nivel}`).toBeLessThan(0.7);
      expect(certos / palpites, `contrário de ${nome} no nível ${nivel}`).toBeGreaterThan(0.3);
    }
  });

  test("a moeda que parece maior engana já no começo", () => {
    const rng = semente(3);
    let enganou = 0;
    for (let i = 0; i < 400; i++) {
      const [a, b] = gerarPar(1, rng);
      const [rico, pobre] = total(a) > total(b) ? [a, b] : [b, a];
      if (ATALHOS.pareceMaior(rico, pobre) < 0) enganou++;
    }
    expect(enganou / 400).toBeGreaterThan(0.25);
  });
});

describe("dirigir", () => {
  test("o carro espera a largada, anda e conta as voltas", () => {
    const estado = jogo(1);
    const parado = { x: estado.corrida.jogador.x, y: estado.corrida.jogador.y };
    passo(estado, { acelera: 1, vira: 0 }, 1);
    expect(estado.corrida.jogador).toMatchObject(parado);
    const eventos = correr(estado, motorista());
    expect(eventos.filter(({ tipo }) => tipo === "volta")).toHaveLength(1);
    expect(eventos.at(-1)).toEqual({ tipo: "chegou", posicao: 1 });
  });

  test("um salto para o outro lado da pista não conta como volta", () => {
    const estado = jogo(1);
    correr(estado, motorista(), 4);
    const { jogador, pista } = estado.corrida;
    const antes = jogador.progresso;
    const longe = pontoNaPista(pista, jogador.indice + pista.n / 2);
    jogador.x = longe.x;
    jogador.y = longe.y;
    passo(estado, null, QUADRO);
    expect(jogador.progresso).toBeCloseTo(antes, 0);
  });

  test("o muro segura o carro na pista, mesmo virando sem parar", () => {
    const estado = jogo(1, "super");
    estado.corrida.largada = 0;
    let longe = 0;
    for (let i = 0; i < 20 / QUADRO; i++) {
      passo(estado, { acelera: 1, vira: i % 300 < 150 ? 1 : -0.4 }, QUADRO);
      longe = Math.max(longe, maisProximo(estado.corrida.pista, estado.corrida.jogador).distancia);
    }
    expect(longe).toBeLessThanOrEqual(limiteDoMuro(estado.corrida.pista) + 0.01);
  });

  test.each(SEMENTES.slice(0, 5))("quem ziguezagueia batendo no muro tem todas as voltas contadas (semente %i)", (s) => {
    const estado = jogo(3, "esportivo", s);
    const certo = motorista();
    let tempo = 0;
    const eventos = correr(estado, (atual) => {
      tempo += QUADRO;
      const comando = certo(atual)!;
      return { acelera: 1, vira: comando.vira + Math.sin(tempo * 2.5 + s) * 1.6 };
    });
    expect(eventos.filter(({ tipo }) => tipo === "volta")).toHaveLength(FASES[2].voltas - 1);
    expect(eventos.at(-1)?.tipo).toBe("chegou");
  });

  test("para cima anda para a frente e para baixo dá ré", () => {
    const estado = jogo(1);
    estado.corrida.largada = 0;
    const { jogador } = estado.corrida;
    const frente = { x: Math.cos(jogador.angulo), y: Math.sin(jogador.angulo) };
    const inicio = { x: jogador.x, y: jogador.y };
    for (let i = 0; i < 30; i++) passo(estado, { acelera: 1, vira: 0 }, QUADRO);
    const andou = (jogador.x - inicio.x) * frente.x + (jogador.y - inicio.y) * frente.y;
    expect(andou).toBeGreaterThan(3);
    for (let i = 0; i < 120; i++) passo(estado, { acelera: -1, vira: 0 }, QUADRO);
    expect(jogador.vel).toBeLessThan(0);
    const voltou = (jogador.x - inicio.x) * frente.x + (jogador.y - inicio.y) * frente.y;
    expect(voltou).toBeLessThan(andou);
  });

  test("sem setas o carro para, e pedir o contrário freia", () => {
    const estado = jogo(1);
    correr(estado, motorista(), 6);
    expect(estado.corrida.jogador.vel).toBeGreaterThan(60);
    for (let i = 0; i < 90; i++) passo(estado, null, QUADRO);
    expect(estado.corrida.jogador.vel).toBe(0);
  });

  test("quem anda pelo meio não pega dinheiro, e encostar num monte leva ele e some com o outro", () => {
    const estado = jogo(1);
    correr(estado, motorista());
    expect(estado.dinheiro).toBe(0);

    const outro = jogo(1);
    const ganhos: number[] = [];
    for (const lado of [-1, 1]) {
      const corrida = outro.corrida;
      const par = corrida.pares.find(({ ativo }) => ativo)!;
      const [esquerda, direita] = par.lados.map((pecas) => total(pecas.map(({ valor }) => valor)));
      const peca = par.lados[lado < 0 ? 0 : 1][0];
      corrida.largada = 0;
      corrida.jogador.x = peca.x;
      corrida.jogador.y = peca.y;
      corrida.jogador.indice = par.centro;
      const antes = outro.dinheiro;
      const eventos = passo(outro, null, QUADRO);
      const pegou = eventos.find((evento) => evento.tipo === "pegou");
      expect(pegou).toMatchObject({ valor: lado < 0 ? esquerda : direita, melhor: (lado < 0 ? esquerda : direita) > (lado < 0 ? direita : esquerda) });
      expect(par.ativo).toBe(false);
      ganhos.push(outro.dinheiro - antes);
    }
    expect(ganhos.every((ganho) => ganho > 0)).toBe(true);
  });

  test("bater tira velocidade, e o obstáculo volta na volta seguinte", () => {
    const estado = jogo(3);
    const { corrida } = estado;
    corrida.largada = 0;
    const obstaculo = corrida.obstaculos[0];
    corrida.jogador.vel = 80;
    corrida.jogador.x = obstaculo.x;
    corrida.jogador.y = obstaculo.y;
    corrida.jogador.indice = obstaculo.indice;
    corrida.jogador.progresso = obstaculo.indice;
    const eventos = passo(estado, null, QUADRO);
    expect(eventos.some(({ tipo }) => tipo === "bateu")).toBe(true);
    expect(corrida.jogador.vel).toBeLessThan(50);
    correr(estado, motorista(), 60);
    expect(corrida.terminou).toBe(true);
  });

  test("o turbo só existe com o equipamento e precisa recarregar", () => {
    const estado = jogo(1);
    estado.corrida.largada = 0;
    expect(ligarTurbo(estado)).toBe(false);
    estado.garagem.niveis.turbo = 1;
    expect(ligarTurbo(estado)).toBe(true);
    expect(ligarTurbo(estado)).toBe(false);
  });
});

describe("rivais", () => {
  test.each(SEMENTES.slice(0, 10))("desviam de todos os obstáculos (semente %i)", (s) => {
    for (const { fase, config } of CORRIDAS.filter(({ config }) => config.obstaculos > 0)) {
      const estado = jogo(fase, config.carro, s);
      const { corrida } = estado;
      corrida.largada = 0;
      let menor = Infinity;
      for (let i = 0; i < 60 * 60 && !corrida.rivais.every((rival) => rival.chegou); i++) {
        passo(estado, null, QUADRO);
        for (const rival of corrida.rivais) {
          const ponto = posicaoDoRival(corrida, rival);
          for (const obstaculo of corrida.obstaculos) {
            menor = Math.min(menor, Math.hypot(ponto.x - obstaculo.x, ponto.y - obstaculo.y));
          }
        }
      }
      expect(menor, `fase ${fase}`).toBeGreaterThan(RAIO_DO_CARRO + RAIO_DO_OBSTACULO);
    }
  });

  test.each(CORRIDAS)("fase $fase: o carro esperado vence, e com distração ainda passa", ({ fase, config }) => {
    for (const s of [1, 2, 3]) {
      const atento = jogo(fase, config.carro, s);
      correr(atento, motorista());
      expect(atento.corrida.posicao).toBe(1);
      const distraido = jogo(fase, config.carro, s);
      correr(distraido, motorista(0.2));
      expect(distraido.corrida.posicao).toBeLessThanOrEqual(PODIO);
    }
  });

  test.each(CORRIDAS.filter(({ fase }) => fase >= 8))("fase $fase: com o primeiro carro não dá, então a garagem importa", ({ fase }) => {
    const estado = jogo(fase, "bolinha");
    correr(estado, motorista());
    expect(estado.corrida.posicao).toBeGreaterThan(PODIO);
  });
});

describe("fases e garagem", () => {
  test("quem continua de uma fase chega com dinheiro para o carro dela", () => {
    for (let fase = 2; fase <= ULTIMA_FASE; fase++) {
      expect(verbaDaFase(fase)).toBeGreaterThanOrEqual(CARROS[configDaFase(fase).carro].preco);
    }
    expect(novoJogo(1).dinheiro).toBe(0);
  });

  test("os carros esperados ficam mais rápidos a cada corrida", () => {
    const velocidades = CORRIDAS.map(({ config }) => CARROS[config.carro].vmax);
    expect(velocidades).toEqual([...velocidades].sort((a, b) => a - b));
  });

  test("treino sempre passa; corrida só no pódio, e perder custa coração depois das primeiras fases", () => {
    const treino = jogo(1);
    treino.corrida.posicao = 1;
    expect(encerrar(treino)).toMatchObject({ passou: true, perdeuVida: false });
    expect(treino.fase).toBe(2);

    const mansa = jogo(ULTIMA_FASE_MANSA);
    mansa.corrida.posicao = 4;
    expect(encerrar(mansa)).toMatchObject({ passou: false, perdeuVida: false });
    expect(mansa.vidas).toBe(VIDAS_INICIAIS);

    const fase = CORRIDAS.find(({ fase }) => fase > ULTIMA_FASE_MANSA)!.fase;
    const brava = jogo(fase);
    brava.corrida.posicao = PODIO + 1;
    const antes = brava.dinheiro;
    expect(encerrar(brava)).toMatchObject({ passou: false, perdeuVida: true });
    expect(brava.vidas).toBe(VIDAS_INICIAIS - 1);
    expect(brava.fase).toBe(fase);
    expect(brava.dinheiro).toBeGreaterThan(antes);
  });

  test("o jogo acaba na última fase, que é uma corrida, e ela continua salva como a última", () => {
    expect(FASES[ULTIMA_FASE - 1].tipo).toBe("corrida");
    const antes = jogo(ULTIMA_FASE - 1);
    antes.corrida.posicao = 1;
    expect(encerrar(antes)).toMatchObject({ passou: true, zerou: false });
    expect(antes.fase).toBe(ULTIMA_FASE);

    const perdeu = jogo(ULTIMA_FASE);
    perdeu.corrida.posicao = PODIO + 1;
    expect(encerrar(perdeu)).toMatchObject({ passou: false, zerou: false });

    const final = jogo(ULTIMA_FASE);
    final.corrida.posicao = PODIO;
    expect(encerrar(final)).toMatchObject({ passou: true, zerou: true });
    expect(final.fase).toBe(ULTIMA_FASE);
    expect(configDaFase(ULTIMA_FASE + 3)).toBe(FASES[ULTIMA_FASE - 1]);
  });

  test("comprar só com dinheiro, e cada coisa uma vez", () => {
    const estado = jogo(1);
    estado.dinheiro = CARROS.jipe.preco - 5;
    expect(comprar(estado, { tipo: "carro", id: "jipe" })).toBe("falta");
    estado.dinheiro += 5;
    expect(comprar(estado, { tipo: "carro", id: "jipe" })).toBe("comprou");
    expect(estado.dinheiro).toBe(0);
    expect(estado.garagem.carro).toBe("jipe");
    expect(comprar(estado, { tipo: "carro", id: "jipe" })).toBe("nada");

    estado.dinheiro = 1_000_000;
    const niveis = EQUIPAMENTOS.ima.precos.length;
    for (let i = 0; i < niveis; i++) expect(comprar(estado, { tipo: "equipamento", id: "ima" })).toBe("comprou");
    expect(comprar(estado, { tipo: "equipamento", id: "ima" })).toBe("nada");
    expect(estado.garagem.niveis.ima).toBe(niveis);
  });

  test("cada carro guarda a própria pintura", () => {
    const estado = jogo(1, "jipe");
    pintar(estado, "#a45cff");
    usarCarro(estado, "bolinha");
    expect(estado.garagem.cor).toBe(CARROS.bolinha.cor);
    usarCarro(estado, "jipe");
    expect(estado.garagem.cor).toBe("#a45cff");
    pintar(estado, "#123456");
    expect(estado.garagem.cor).toBe("#a45cff");
  });
});
