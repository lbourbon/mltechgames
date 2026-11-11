import { porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, pular } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { telaFase, telaNovidade, telaTropeco } from "../kit/telas";
import { criarLaco, esperar, movimentoReduzido } from "../kit/tempo";
import {
  ALTURA,
  FORCA_MINIMA,
  faltam,
  lancar,
  novoJogo,
  passarDeFase,
  PLANETAS,
  ULTIMA_FASE_MANSA,
  type Estado,
  type Fim,
  type Jogada,
  type Ponto,
  type Voo,
} from "./logica";
import { somBateu, somEntregou, somLancou, somMira, somPerdeu, somQueimou } from "./sons";

// Quanto o dedo precisa se afastar do astronauta para a força máxima, na largura do espaço.
const ALCANCE = 0.42;
// Mais perto que isso, soltar desiste do lançamento.
const DESISTE = 0.06;
const RASTROS_GUARDADOS = 5;
// Pontos do voo por segundo: a simulação guarda um a cada dois passos de 1/120 s.
const PONTOS_POR_SEGUNDO = 60;
const ESCALA = 1000;

const NOVIDADES: Record<number, { titulo: string; texto: string }> = {
  2: {
    titulo: "Júpiter, o gigante",
    texto: "Júpiter é o maior planeta do Sistema Solar. Quanto mais massa um planeta tem, mais forte ele puxa o pacote. Use esse puxão para fazer curvas!",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    titulo: "Pacotes contados!",
    texto: "Agora os pacotes têm limite. Olhe o rastro do último lançamento e mude só um pouquinho a mira. E chegou Saturno, com anéis de gelo e pedra!",
  },
  4: {
    titulo: "Dois endereços",
    texto: "Agora são dois planetas esperando pacote. Chegaram também Urano, que gira deitado de lado, e Netuno, o planeta mais longe do Sol.",
  },
  5: {
    titulo: "Cuidado com o Sol!",
    texto: "O Sol não é um planeta: é uma estrela. Ele puxa muito forte e queima qualquer pacote que encostar nele.",
  },
  6: {
    titulo: "Asteroides!",
    texto: "Asteroides são pedras soltas no espaço. Eles puxam tão pouco que nem dá para sentir, mas no caminho atrapalham.",
  },
  9: {
    titulo: "Três endereços",
    texto: "O correio está lotado! Agora são três planetas esperando pacote.",
  },
};

const espaco = porId("espaco");
const corpos = porId("corpos");
const rastros = porId("rastros");
const mira = porId("mira");
const miraPonta = porId("mira-ponta");
const lancador = porId("lancador");
const pacote = porId("pacote");
const fala = porId("fala");
const campoPacotes = porId("pacotes");
const palavraPacotes = porId("palavra-pacotes");
const campoEntregas = porId("entregas");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: seguir });

let estado: Estado = novoJogo();
let travado = true;
let novidadeVista = 0;
let corposNaTela: HTMLElement[] = [];
let pedrasNaTela: HTMLElement[] = [];
let mirando: { angulo: number; forca: number } | null = null;
let ultimaNotaDaMira = -1;
let mapaNaTela: Estado["mapa"] | null = null;

const pct = (valor: number) => `${valor * 100}%`;

function falar(texto: string) {
  fala.textContent = texto;
}

function travar(valor: boolean) {
  travado = valor;
  espaco.dataset.pronto = valor ? "" : "1";
}

function posicionar(el: HTMLElement, { x, y }: Ponto) {
  el.style.left = pct(x);
  el.style.top = pct(y / ALTURA);
}

function desenharCeu() {
  const { mapa } = estado;
  corposNaTela = mapa.corpos.map((corpo) => {
    const el = document.createElement("div");
    el.className = `corpo planeta-${corpo.planeta}${corpo.alvo ? " alvo" : ""}`;
    el.style.width = pct(corpo.raio * 2);
    posicionar(el, corpo);
    el.innerHTML = `<span class="nome">${PLANETAS[corpo.planeta].nome}</span>${corpo.alvo ? `<span class="caixa" aria-hidden="true">📮</span>` : ""}`;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `${PLANETAS[corpo.planeta].nome}${corpo.alvo ? ", esperando pacote" : ""}`);
    return el;
  });
  pedrasNaTela = mapa.pedras.map((pedra) => {
    const el = document.createElement("div");
    el.className = "pedra";
    el.style.width = pct(pedra.raio * 2);
    posicionar(el, pedra);
    return el;
  });
  corpos.replaceChildren(...corposNaTela, ...pedrasNaTela);
  posicionar(lancador, mapa.lancador);
  rastros.replaceChildren();
  esconderPacote();
  desenharEntregas();
}

function desenharEntregas() {
  estado.mapa.corpos.forEach((_, i) => corposNaTela[i].classList.toggle("entregue", estado.entregues[i]));
  const { pacotes } = estado;
  campoPacotes.textContent = pacotes === null ? "∞" : String(pacotes);
  palavraPacotes.textContent = pacotes === 1 ? "pacote" : "pacotes";
  const alvos = estado.mapa.corpos.filter((c) => c.alvo).length;
  campoEntregas.textContent = `${alvos - faltam(estado)} de ${alvos}`;
}

function esconderPacote() {
  pacote.hidden = true;
  posicionar(pacote, estado.mapa.lancador);
}

// Mira ------------------------------------------------------------------------------------------

function pontoDoDedo(evento: PointerEvent): Ponto {
  const caixa = espaco.getBoundingClientRect();
  return { x: (evento.clientX - caixa.left) / caixa.width, y: (evento.clientY - caixa.top) / caixa.width };
}

function apontar(evento: PointerEvent) {
  const { x, y } = pontoDoDedo(evento);
  const origem = estado.mapa.lancador;
  const dx = x - origem.x;
  const dy = y - origem.y;
  const distancia = Math.hypot(dx, dy);
  if (distancia < DESISTE) {
    mirando = null;
    desenharMira();
    return;
  }
  mirando = { angulo: Math.atan2(dy, dx), forca: Math.max(FORCA_MINIMA, Math.min(1, distancia / ALCANCE)) };
  desenharMira();
  const nota = Math.round(mirando.forca * 10);
  if (nota !== ultimaNotaDaMira) somMira(mirando.forca);
  ultimaNotaDaMira = nota;
}

function desenharMira() {
  espaco.dataset.mirando = mirando ? "1" : "";
  if (!mirando) return;
  const { x, y } = estado.mapa.lancador;
  const tamanho = 0.06 + mirando.forca * 0.22;
  const ponta = { x: x + Math.cos(mirando.angulo) * tamanho, y: y + Math.sin(mirando.angulo) * tamanho };
  mira.setAttribute("x1", String(x * ESCALA));
  mira.setAttribute("y1", String(y * ESCALA));
  mira.setAttribute("x2", String(ponta.x * ESCALA));
  mira.setAttribute("y2", String(ponta.y * ESCALA));
  miraPonta.setAttribute("cx", String(ponta.x * ESCALA));
  miraPonta.setAttribute("cy", String(ponta.y * ESCALA));
  espaco.style.setProperty("--forca", String(mirando.forca));
}

espaco.addEventListener("pointerdown", (evento) => {
  if (travado) return;
  espaco.setPointerCapture(evento.pointerId);
  ultimaNotaDaMira = -1;
  apontar(evento);
});

espaco.addEventListener("pointermove", (evento) => {
  if (travado || !espaco.hasPointerCapture(evento.pointerId)) return;
  apontar(evento);
});

espaco.addEventListener("pointerup", (evento) => {
  if (travado || !espaco.hasPointerCapture(evento.pointerId)) return;
  espaco.releasePointerCapture(evento.pointerId);
  apontar(evento);
  const tiro = mirando;
  mirando = null;
  desenharMira();
  if (tiro) disparar(tiro.angulo, tiro.forca);
});

espaco.addEventListener("pointercancel", () => {
  mirando = null;
  desenharMira();
});

// Voo -------------------------------------------------------------------------------------------

function novoRastro() {
  const antigos = [...rastros.children];
  antigos.forEach((el) => el.classList.add("antigo"));
  antigos.slice(0, Math.max(0, antigos.length - RASTROS_GUARDADOS + 1)).forEach((el) => el.remove());
  const linha = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  linha.setAttribute("class", "rastro");
  rastros.append(linha);
  return linha;
}

const emPontos = (pontos: Ponto[]) => pontos.map(({ x, y }) => `${(x * ESCALA).toFixed(1)},${(y * ESCALA).toFixed(1)}`).join(" ");

function animarVoo({ pontos }: Voo) {
  const linha = novoRastro();
  pacote.hidden = false;
  if (movimentoReduzido) {
    linha.setAttribute("points", emPontos(pontos));
    posicionar(pacote, pontos.at(-1)!);
    return Promise.resolve();
  }
  return new Promise<void>((pronto) => {
    let tempo = 0;
    const laco = criarLaco((dt) => {
      tempo += dt;
      const ate = Math.min(pontos.length - 1, Math.floor(tempo * PONTOS_POR_SEGUNDO));
      posicionar(pacote, pontos[ate]);
      linha.setAttribute("points", emPontos(pontos.slice(0, ate + 1)));
      if (ate === pontos.length - 1) {
        laco.desligar();
        pronto();
      }
    });
    laco.ligar();
  });
}

// "na Terra", "na Lua", "em Marte".
function emQual(fim: Fim, mapa: Estado["mapa"]) {
  if (!("corpo" in fim)) return "";
  const planeta = mapa.corpos[fim.corpo].planeta;
  const { nome } = PLANETAS[planeta];
  return planeta === "terra" || planeta === "lua" ? `na ${nome}` : `em ${nome}`;
}

function reagirAoFim(fim: Fim, antes: Estado) {
  const ponto = centroDe(pacote);
  if (fim.tipo === "entregou") {
    somEntregou();
    estourar(ponto, ["📦", "#ffc933", "#ffffff"], 10, 70);
    flutuar(ponto, "Entregue!");
    pular(corposNaTela[fim.corpo], 1.15);
    falar(`Pacote entregue ${emQual(fim, antes.mapa)}!`);
    return;
  }
  if (fim.tipo === "perdeu") {
    somPerdeu();
    falar("O pacote se perdeu no espaço!");
    return;
  }
  if (fim.tipo === "pedra") {
    somBateu();
    estourar(ponto, ["#8a7f99", "#5d5470"], 8, 40);
    // Planetas e pedras se centralizam com translate, que o tremer do kit sobrescreveria.
    pular(pedrasNaTela[fim.pedra], 1.2);
    falar("Bateu num asteroide!");
    return;
  }
  const corpo = antes.mapa.corpos[fim.corpo];
  if (corpo.planeta === "sol") {
    somQueimou();
    estourar(ponto, ["#ff7a00", "#ffc933", "🔥"], 12, 60);
    falar("O Sol queimou o pacote!");
    return;
  }
  somBateu();
  estourar(ponto, ["#c9b8a6", "#8a7f99"], 8, 40);
  pular(corposNaTela[fim.corpo], 1.08);
  falar(antes.entregues[fim.corpo] ? `Esse pacote já foi entregue ${emQual(fim, antes.mapa)}!` : `O pacote caiu ${emQual(fim, antes.mapa)}!`);
}

async function disparar(angulo: number, forca: number) {
  travar(true);
  falar("");
  const antes = estado;
  const jogada = lancar(estado, angulo, forca);
  somLancou(forca);
  pular(lancador, 1.1);
  await animarVoo(jogada.voo);
  reagirAoFim(jogada.voo.fim, antes);
  esconderPacote();
  estado = jogada.estado;
  moldura.placa(estado);
  await depoisDoVoo(jogada, antes);
}

async function depoisDoVoo(jogada: Jogada, antes: Estado) {
  if (jogada.resultado === "entregou" || jogada.resultado === "errou") {
    desenharEntregas();
    travar(false);
    return;
  }
  if (jogada.resultado === "fase") {
    desenharEntregas();
    await esperar(700);
    somVitoria();
    confete();
    if (antes.limpa) flutuar(centroDe(espaco), "Nenhum pacote perdido!", "efeito-ouro");
    await esperar(1300);
    estado = passarDeFase(jogada.estado);
    moldura.placa(estado);
    moldura.salvar(estado);
    moldura.mostrar(telaDaFase(antes.fase, estado.pontos - antes.pontos, antes.limpa));
    return;
  }
  await esperar(900);
  if (jogada.resultado === "fim") {
    moldura.fim(estado, "Os pacotes acabaram, e o correio espacial fechou por hoje.");
    return;
  }
  moldura.mostrar(telaAcabou());
}

// Fases -----------------------------------------------------------------------------------------

function prepararFase() {
  desenharCeu();
  moldura.placa(estado);
  falar(estado.fase === 1 ? "Arraste o dedo para mirar e solte!" : "");
  travar(false);
}

function seguir() {
  // Depois de perder um coração o céu é o mesmo, e os rastros ficam para ajudar na mira.
  if (mapaNaTela === estado.mapa) {
    desenharEntregas();
    moldura.placa(estado);
    falar("");
    travar(false);
  } else {
    mapaNaTela = estado.mapa;
    prepararFase();
  }
  const novidade = NOVIDADES[estado.fase];
  if (!novidade || novidadeVista === estado.fase) return;
  novidadeVista = estado.fase;
  travar(true);
  moldura.mostrar(telaNovidade({ ...novidade, emblema: "🪐" }));
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  mapaNaTela = null;
  seguir();
}


function telaDaFase(concluida: number, bonus: number, limpa: boolean) {
  return telaFase({
    fase: concluida,
    pontos: bonus,
    perfeita: limpa,
    frase: limpa ? "Nenhum pacote perdido no espaço!" : "Todos os planetas receberam o pacote!",
  });
}

const telaAcabou = () =>
  telaTropeco({
    titulo: "Acabaram os pacotes!",
    texto: "Você perdeu uma vida. O céu é o mesmo, e os rastros ficaram para ajudar na mira.",
  });
