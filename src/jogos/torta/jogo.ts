import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade } from "../kit/telas";
import { esperar } from "../kit/tempo";
import { descrever, desenharSuspeito } from "./desenho";
import { bonusDaFase, novoJogo, restoDaPista, soltar, ULTIMA_FASE_MANSA, type Estado } from "./logica";
import { somFlagra, somLambuzou, somNaoFui, somPista, somSolto } from "./sons";

const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  2: {
    titulo: "Pista com NÃO",
    texto: "Cuidado com o não! Se a pista diz que quem comeu não usa chapéu, todo mundo de chapéu está livre.",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "Agora é sério!",
    texto: "Soltar alguém que as pistas ainda não livram custa um coração. Leia com calma: não tem relógio.",
  },
  4: {
    titulo: "Pista com E e MAS",
    texto: "Quem comeu usa chapéu e óculos? Então precisa ter os dois. Quem não tiver um deles está livre.",
  },
  5: {
    titulo: "Pista com OU",
    texto: "Quem comeu é um gato ou um coelho? Então quem não é nenhum dos dois está livre.",
  },
  6: {
    titulo: "Olho na fila!",
    texto: "Agora as pistas falam de quem estava ao lado e das pontas da fila. Quem sai da fila deixa a marca no lugar, para você não se perder.",
  },
  7: {
    titulo: "Várias pistas de uma vez",
    texto: "Agora as pistas chegam juntas. Basta uma delas não combinar para o suspeito estar livre.",
  },
};

const DESCULPAS = [
  "Tá bom, fui eu. Mas tava uma delícia!",
  "Eu só ia provar um pedacinho...",
  "Que torta? Ah, essa torta...",
  "Foi sem querer! Ela pulou na minha boca!",
  "Posso pelo menos lamber o prato?",
  "Eu achei que era para mim!",
];

const delegacia = porId("delegacia");
const fila = porId("fila");
const pistas = porId("pistas");
const fala = porId("fala");
const xerife = porId("xerife");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let botoes: HTMLButtonElement[] = [];
let soltosNaFase = 0;

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  delegacia.dataset.pronta = valor ? "" : "1";
}

function rotulo(i: number) {
  const { fila, culpado } = estado.caso;
  const solto = estado.soltos[i];
  return `${descrever(fila[i])}${solto ? ", liberado" : ""}${!solto && i === culpado && delegacia.dataset.flagra ? ", culpado" : ""}`;
}

function desenharFila() {
  botoes = estado.caso.fila.map((suspeito, i) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "suspeito";
    botao.innerHTML = `${desenharSuspeito(suspeito)}<span class="livre" aria-hidden="true">✓</span>`;
    botao.style.setProperty("--ordem", String(i));
    botao.addEventListener("click", () => tocar(i));
    return botao;
  });
  fila.style.setProperty("--quantos", String(botoes.length));
  fila.replaceChildren(...botoes);
  desenharSoltos();
}

function desenharSoltos() {
  botoes.forEach((botao, i) => {
    botao.classList.toggle("solto", estado.soltos[i]);
    botao.setAttribute("aria-label", rotulo(i));
  });
}

function desenharPistas(novas = false) {
  const { caso, etapa } = estado;
  pistas.replaceChildren(
    ...caso.etapas.slice(0, etapa + 1).flatMap((lista, e) =>
      lista.map((pista) => {
        const item = document.createElement("li");
        item.className = `pista${e === etapa ? " atual" : ""}${e === etapa && novas ? " nova" : ""}`;
        item.textContent = restoDaPista(pista);
        return item;
      }),
    ),
  );
}

async function recusar(i: number, jogada: ReturnType<typeof soltar>) {
  somNaoFui();
  tremer(botoes[i], 7);
  flutuar(centroDe(botoes[i]), "Não fui eu!");
  estado = jogada.estado;
  moldura.placa(estado);
  if (jogada.resultado === "cedo") {
    falar("Calma! A pista ainda não livra esse. Leia de novo.");
    return;
  }
  falar("As pistas ainda não livram esse aí!");
  if (jogada.resultado !== "fim") return;
  travar(true);
  await esperar(1100);
  moldura.fim(estado, "O culpado aproveitou a confusão e fugiu com o prato!");
}

function comemorarSolto(i: number) {
  somSolto(soltosNaFase++);
  pular(botoes[i], 1.12);
  estourar(centroDe(botoes[i]), ["#ffffff", "#ffc933"], 6, 40);
}

async function novaPista() {
  travar(true);
  await esperar(500);
  falar(estado.caso.etapas[estado.etapa].length > 1 ? "Chegaram novas pistas!" : "Nova pista!");
  somPista();
  pular(xerife, 1.08);
  desenharPistas(true);
  travar(false);
}

async function flagrar(anterior: Estado, depois: Estado) {
  travar(true);
  const culpado = anterior.caso.culpado;
  const botao = botoes[culpado];
  await esperar(450);
  delegacia.dataset.flagra = "1";
  somFlagra();
  falar("Te peguei!");
  pular(xerife, 1.12);
  await esperar(700);
  botao.classList.add("culpado");
  botao.setAttribute("aria-label", rotulo(culpado));
  somLambuzou();
  estourar(centroDe(botao), ["#d8402b", "#fff3d6", "#8a4b2a"], 12, 70);
  pular(botao, 1.25);
  await esperar(500);
  falar(DESCULPAS[Math.floor(Math.random() * DESCULPAS.length)]);
  somVitoria();
  confete();
  await esperar(1800);
  estado = depois;
  moldura.placa(estado);
  moldura.salvar(estado);
  // A jogada que fecha o caso já traz a fase seguinte: o bônus é a diferença de pontos.
  moldura.mostrar(telaDaFase(anterior.fase, depois.pontos - anterior.pontos));
}

function tocar(i: number) {
  if (travado) return;
  const anterior = estado;
  const jogada = soltar(estado, i);
  const { resultado } = jogada;
  if (resultado === "parado") return;
  if (resultado === "cedo" || resultado === "errou" || resultado === "fim") {
    recusar(i, jogada);
    return;
  }

  falar("");
  if (resultado === "fase") {
    estado = { ...anterior, soltos: anterior.soltos.map((solto, j) => solto || j === i) };
    desenharSoltos();
    comemorarSolto(i);
    flagrar(anterior, jogada.estado);
    return;
  }
  estado = jogada.estado;
  desenharSoltos();
  comemorarSolto(i);
  if (resultado === "etapa") novaPista();
}

function prepararCaso() {
  delete delegacia.dataset.flagra;
  soltosNaFase = 0;
  desenharFila();
  desenharPistas(true);
  moldura.placa(estado);
  falar(estado.fase === 1 ? "Alguém comeu a torta! Toque em quem a pista livra." : "Toque em quem as pistas livram.");
  travar(false);
}

function seguir() {
  const novidade = NOVIDADES[estado.fase];
  prepararCaso();
  if (!novidade || novidadeVista === estado.fase) return;
  novidadeVista = estado.fase;
  travar(true);
  moldura.mostrar(telaNovidade(novidade));
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  seguir();
}


function telaDaFase(concluida: number, bonus: number) {
  const limpa = bonus === bonusDaFase(concluida, true);
  return telaFase({
    fase: concluida,
    pontos: bonus,
    perfeita: limpa,
    frase: limpa ? "Caso resolvido sem soltar ninguém antes da hora!" : "Caso resolvido! A cidade já pode assar outra torta.",
  });
}
