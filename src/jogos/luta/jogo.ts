import { medirEmVolta, porId } from "../kit/dom";
import { animar, confete, estourar, flutuar, lancar, pular, tremer, type Ponto } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { estrelas, telaNovidade } from "../kit/telas";
import { esperar, movimentoReduzido } from "../kit/tempo";
import { amostra, aparelhos, CHAO, JEITOS, jeitoDaCrianca, lutador, svgLutador, svgRetrato, type Jeito } from "./desenho";
import { ATRIBUTO, ATRIBUTOS, EQUIPAMENTOS, PECAS, PODER, type Atributo, type Peca, type PoderId } from "./loja";
import {
  agir,
  atributosDe,
  comprarEquipamento,
  configDaFase,
  danoPorSoco,
  encerrar,
  ENERGIA_DO_PODER,
  escolherPoder,
  ESTILOS,
  intencao,
  lutar,
  novoJogo,
  poderesDaFase,
  poderPronto,
  precoDoEquipamento,
  prepararFase,
  refazerTreino,
  temPeca,
  treinar,
  treinosQueFaltam,
  ULTIMA_FASE,
  ULTIMA_FASE_MANSA,
  vestir,
  vivo,
  type Acao,
  type Evento,
  type Resultado,
  type Rival,
} from "./logica";
import {
  somBloqueio,
  somCompra,
  somDefesa,
  somFalta,
  somFogo,
  somGelo,
  somNocaute,
  somPerdeu,
  somRaio,
  somSino,
  somSoco,
  SONS_DO_TREINO,
} from "./sons";

const SVG = "http://www.w3.org/2000/svg";

// Onde cada um fica no octógono (cena de 240 de largura) e o tamanho, que encolhe com mais gente.
const X_DA_CRIANCA = 58;
const X_NO_TREINO = 104;
const POSICOES: Record<number, number[]> = { 1: [176], 2: [160, 210], 3: [146, 184, 222] };
const ESCALAS: Record<number, number> = { 1: 0.92, 2: 0.82, 3: 0.72 };
const ESCALA_DA_CRIANCA = 0.92;
// Até onde a luva vai no soco esticado, e onde começa o corpo, em unidades do desenho.
const ALCANCE = 48;
const PEITO = 22;
const ALTURA_DO_LUTADOR = 108;

// A estreia de cada novidade, antes da ficha.
const NOVIDADES: Record<number, { texto: string; emblema: string }> = {
  2: {
    emblema: "🔥",
    texto: "Novo poder: Bola de fogo! A barra do poder enche a cada rodada. Cheia, toque em Poder: o fogo passa pela técnica do adversário.",
  },
  [ULTIMA_FASE_MANSA + 1]: {
    emblema: "❤️",
    texto: "Daqui em diante, perder uma luta custa um coração. Leia a ficha e treine o que essa luta pede!",
  },
  4: {
    emblema: "💥",
    texto: "Golpe forte! Quando aparecer 💥 em cima de um adversário, ele vai bater dobrado. Toque em 🛡️ Defesa: ela segura o golpe forte inteiro.",
  },
  5: { emblema: "👥", texto: "Dois adversários juntos! Toque em um deles para escolher em quem bater." },
  6: { emblema: "❄️", texto: "Novo poder: Gelo! Congela todos os adversários por duas rodadas. Escolha o poder na ficha da luta." },
  9: { emblema: "⚡", texto: "Novo poder: Raio! Uma rajada de socos num adversário só, que passa pela técnica dele." },
  10: { emblema: "👥", texto: "Três adversários de uma vez! O fogo acerta todos." },
  [ULTIMA_FASE]: { emblema: "🏆", texto: "A final! O campeão Titã nunca perdeu. Vença e o cinturão é seu!" },
};

const cena = porId("cena");
const mundo = porId("mundo") as unknown as SVGSVGElement;
const camadaLutadores = porId("lutadores");
const camadaMarcas = porId("marcas");
const aviso = porId("aviso");
const painelTreino = porId("treino");
const painelAcoes = porId("acoes");
const restam = porId("restam");
const botaoRefazer = porId("refazer") as HTMLButtonElement;
const botaoLutar = porId("lutar") as HTMLButtonElement;
const botaoSoco = porId("socar") as HTMLButtonElement;
const botaoDefesa = porId("defender") as HTMLButtonElement;
const botaoPoder = porId("soltar-poder") as HTMLButtonElement;
const iconePoder = porId("poder-icone");
const energia = porId("energia");
const painel = porId("painel");
const botaoFicha = porId("ver-ficha");
const rostos = porId("rostos");
const palco = cena.closest<HTMLElement>(".jogo")!;
const botoesTreino = [...painelTreino.querySelectorAll<HTMLButtonElement>(".treinar")];

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: () => seguirPara() });
medirEmVolta(cena);

let estado = novoJogo(1);
let modo: "parado" | "treino" | "luta" = "parado";
let ocupado = false;
let alvo = 0;
let seguirPara: () => void = () => {};
let novidadeVista = 0;
let timerAviso = 0;
let fortesSemDefesa = 0;
let dicaDoSoco = false;
let selecionado: { tipo: "equipamento"; id: Atributo } | { tipo: "peca"; peca: Peca; id: string } | null = null;
let avisoDaLoja = "";

type Figura = { el: SVGGElement; mover: SVGGElement; x: number; escala: number; porte: number; espelho: boolean };
let crianca: Figura | null = null;
let rivais: Figura[] = [];

const jeitoDe = (rival: { jeito: number }) => JEITOS[rival.jeito % JEITOS.length];
const minhaFigura = () => jeitoDaCrianca(estado.vestiario);

function avisar(texto: string, ms = 0) {
  aviso.textContent = texto;
  clearTimeout(timerAviso);
  if (ms) timerAviso = window.setTimeout(() => (aviso.textContent = ""), ms);
}

// Do mundo para o palco, onde os efeitos do kit desenham.
function noPalco(x: number, y: number): Ponto {
  const matriz = mundo.getScreenCTM();
  const caixa = palco.getBoundingClientRect();
  if (!matriz) return { x: 0, y: 0 };
  const ponto = new DOMPoint(x, y).matrixTransform(matriz);
  return { x: ponto.x - caixa.left, y: ponto.y - caixa.top };
}

const topo = (figura: Figura) => CHAO - ALTURA_DO_LUTADOR * figura.escala * figura.porte;
const cabecaDe = (figura: Figura) => noPalco(figura.x, topo(figura) + 18 * figura.escala);
const peitoDe = (figura: Figura) => noPalco(figura.x + (figura.espelho ? -8 : 8) * figura.escala, CHAO - 60 * figura.escala * figura.porte);

function figura(jeito: Jeito, x: number, escala: number, espelho: boolean, extra = ""): Figura {
  const el = document.createElementNS(SVG, "g");
  el.setAttribute("class", `lutador${espelho ? " rival" : " voce"}`);
  el.setAttribute("transform", `translate(${x} ${CHAO}) scale(${escala})`);
  el.innerHTML = `<g class="mover"><g transform="scale(${espelho ? -1 : 1} 1)">${extra}${lutador(jeito)}</g></g>`;
  return { el, mover: el.querySelector<SVGGElement>(".mover")!, x, escala, porte: jeito.porte, espelho };
}

// Cena

function montarTreino() {
  camadaLutadores.replaceChildren();
  camadaMarcas.replaceChildren();
  crianca = figura(minhaFigura(), X_NO_TREINO, 1, false, `<g class="aparelhos">${aparelhos()}</g>`);
  camadaLutadores.append(crianca.el);
  rivais = [];
}

function montarLuta() {
  camadaLutadores.replaceChildren();
  camadaMarcas.replaceChildren();
  const luta = estado.luta!;
  const n = luta.rivais.length;
  const escala = ESCALAS[n];
  // Os de trás primeiro, para o mais perto da criança ficar na frente.
  rivais = luta.rivais.map((rival, i) => figura(jeitoDe(rival), POSICOES[n][i], escala, true));
  rivais.forEach((rival, i) => {
    const mira = document.createElementNS(SVG, "ellipse");
    mira.setAttribute("class", "mira");
    mira.setAttribute("cx", String(rival.x));
    mira.setAttribute("cy", String(CHAO));
    mira.setAttribute("rx", String(26 * rival.escala));
    mira.setAttribute("ry", String(6 * rival.escala));
    mira.dataset.rival = String(i);
    camadaLutadores.append(mira);
  });
  [...rivais].reverse().forEach((rival, k) => {
    rival.el.dataset.rival = String(n - 1 - k);
    camadaLutadores.append(rival.el);
  });
  crianca = figura(minhaFigura(), X_DA_CRIANCA, ESCALA_DA_CRIANCA, false);
  camadaLutadores.append(crianca.el);
  alvo = 0;
  desenharMarcas();
}

// As barras de vida, o que cada adversário vai fazer e o alvo escolhido.
function barra(figura: Figura, vida: number, max: number, classe: string, rival = -1) {
  const largura = 46 * Math.max(0.8, figura.escala);
  const y = topo(figura) - 12;
  const x = figura.x - largura / 2;
  const parte = Math.max(0, vida / max);
  return `<g class="barra ${classe}"${rival >= 0 ? ` data-rival="${rival}"` : ""}>
    <rect x="${x}" y="${y}" width="${largura}" height="9" rx="4.5" class="barra-fundo"/>
    <rect x="${x}" y="${y}" width="${(largura * parte).toFixed(2)}" height="9" rx="4.5" class="barra-vida${parte <= 0.3 ? " pouca" : ""}"/>
    <rect x="${x}" y="${y}" width="${largura}" height="9" rx="4.5" class="barra-borda"/>
    <text x="${figura.x}" y="${y + 7.2}" class="barra-numero">${vida}</text>
  </g>`;
}

function balao(figura: Figura, rival: Rival, i: number) {
  const quer = intencao(rival);
  const icone = quer === "gelo" ? "❄️" : quer === "forte" ? "💥" : "👊";
  const y = topo(figura) - 26;
  return `<g class="balao balao-${quer}" data-rival="${i}" transform="translate(${figura.x} ${y})">
    <g class="balao-miolo"><rect x="-10" y="-10" width="20" height="17" rx="6"/><path d="M-3 6.5l3 5 3-5z"/>
    <text y="2.6">${icone}</text></g></g>`;
}

function desenharMarcas() {
  const luta = estado.luta;
  if (!luta || !crianca) return;
  const partes = [barra(crianca, luta.voce.vida, luta.voce.vidaMax, "barra-crianca")];
  luta.rivais.forEach((rival, i) => {
    const fig = rivais[i];
    if (!vivo(rival)) return;
    partes.push(barra(fig, rival.vida, rival.vidaMax, "barra-rival", i));
    partes.push(balao(fig, rival, i));
    fig.el.classList.toggle("congelado", rival.congelado > 0);
  });
  camadaMarcas.innerHTML = partes.join("");
  camadaLutadores.querySelectorAll<SVGElement>(".mira").forEach((mira) => {
    const i = Number(mira.dataset.rival);
    mira.classList.toggle("escolhida", i === alvo && luta.rivais.length > 1 && vivo(luta.rivais[i]));
  });
  desenharAcoes();
}

function desenharAcoes() {
  const luta = estado.luta;
  if (!luta) return;
  const poder = luta.poder;
  botaoPoder.hidden = poder === null;
  if (poder) {
    iconePoder.textContent = PODER[poder].icone;
    botaoPoder.setAttribute("aria-label", `${PODER[poder].nome}: ${luta.voce.energia} de ${ENERGIA_DO_PODER}`);
    energia.innerHTML = Array.from({ length: ENERGIA_DO_PODER }, (_, i) => `<span class="${i < luta.voce.energia ? "cheia" : ""}"></span>`).join("");
  }
  const parado = ocupado || !!luta.fim || modo !== "luta";
  botaoSoco.disabled = parado;
  botaoDefesa.disabled = parado;
  botaoPoder.disabled = parado || !poderPronto(luta);
  botaoPoder.classList.toggle("pronto", poderPronto(luta));
  const forteVindo = luta.rivais.some((rival) => vivo(rival) && intencao(rival) === "forte");
  botaoDefesa.classList.toggle("alerta", forteVindo && !parado);
  crianca?.el.classList.toggle("carregado", poderPronto(luta));
}

function trocarModo(novo: typeof modo) {
  modo = novo;
  botaoFicha.hidden = novo !== "treino";
  cena.classList.toggle("no-treino", novo === "treino");
  cena.classList.toggle("na-luta", novo !== "treino");
  painelTreino.hidden = novo !== "treino";
  painelAcoes.hidden = novo === "treino";
}

// Treino

function desenharTreino() {
  const atributos = atributosDe(estado);
  const faltam = treinosQueFaltam(estado);
  for (const botao of botoesTreino) {
    const atributo = botao.dataset.atributo as Atributo;
    const valores = botao.querySelector<HTMLElement>(".treinar-valores")!;
    const deles = estado.adversarios
      .map((rival) => `<span class="dele" style="--cor: ${jeitoDe(rival).camisa}">${rival.atributos[atributo]}</span>`)
      .join("");
    const ganho = estado.treino[atributo] ? `<small class="ganho">+${estado.treino[atributo]}</small>` : "";
    valores.classList.toggle("muitos", estado.adversarios.length > 2);
    valores.innerHTML = `<span class="meu">${atributos[atributo]}${ganho}</span><span class="contra">contra</span>${deles}`;
    botao.disabled = faltam === 0;
  }
  rostos.innerHTML = estado.adversarios.map((rival) => svgRetrato(jeitoDe(rival), "rosto")).join("");
  restam.textContent = faltam ? `🏋️ ${faltam} ${faltam === 1 ? "treino" : "treinos"}` : "Pronto para lutar!";
  botaoLutar.disabled = faltam > 0;
  botaoRefazer.disabled = faltam === configDaFase(estado.fase).treinos;
  moldura.placa(estado);
}

function entrarNoTreino() {
  trocarModo("treino");
  montarTreino();
  desenharTreino();
  avisar(estado.fase === 1 ? "Toque nos aparelhos para treinar. Compare seus números com os do adversário!" : "");
  botaoFicha.hidden = false;
  cena.focus({ preventScroll: true });
}

let timerExercicio = 0;

function exercitar(atributo: Atributo, botao: HTMLElement) {
  if (modo !== "treino" || !treinar(estado, atributo)) return;
  const el = crianca?.el;
  if (el) {
    ATRIBUTOS.forEach((outro) => el.classList.remove(`exercicio-${outro}`));
    // Recomeça a animação mesmo que seja o mesmo aparelho de novo.
    void el.getBoundingClientRect();
    el.classList.add(`exercicio-${atributo}`);
    clearTimeout(timerExercicio);
    timerExercicio = window.setTimeout(() => el.classList.remove(`exercicio-${atributo}`), 1100);
  }
  SONS_DO_TREINO[atributo]();
  if (crianca) flutuar(cabecaDe(crianca), `+1 ${ATRIBUTO[atributo].icone}`, "efeito-ouro");
  pular(botao, 1.08);
  if (estado.fase === 1 && treinosQueFaltam(estado) === 0) avisar("Treino completo! Agora é hora de lutar.");
  desenharTreino();
}

botoesTreino.forEach((botao) =>
  botao.addEventListener("click", () => exercitar(botao.dataset.atributo as Atributo, botao)),
);

// A ficha abre por cima do treino e volta para ele do mesmo jeito.
botaoFicha.addEventListener("click", () => {
  if (modo === "treino") mostrarFicha();
});

botaoRefazer.addEventListener("click", () => {
  if (modo !== "treino") return;
  refazerTreino(estado);
  desenharTreino();
});

botaoLutar.addEventListener("click", () => {
  if (modo !== "treino" || treinosQueFaltam(estado) > 0) return;
  entrarNaLuta();
});

// Luta

async function entrarNaLuta() {
  lutar(estado);
  fortesSemDefesa = 0;
  ocupado = true;
  trocarModo("luta");
  montarLuta();
  somSino();
  flutuar(noPalco(120, 70), "Lutem!", "efeito-ouro efeito-grande");
  await esperar(700);
  ocupado = false;
  desenharAcoes();
  if (estado.fase === 1) avisar("Toque em 👊 Soco para bater!");
  else if (estado.adversarios.length > 1) avisar("Toque num adversário para escolher em quem bater.", 2600);
  else avisar("");
}

// Desliza uma figura para a frente e de volta, como no bote do soco.
async function bote(fig: Figura, dx: number, ms: number) {
  if (movimentoReduzido) return;
  await fig.mover.animate([{ translate: "0px 0px" }, { translate: `${dx}px 0px` }], { duration: ms, easing: "ease-out", fill: "forwards" }).finished;
}

async function voltar(fig: Figura, ms: number) {
  if (movimentoReduzido) return;
  const atual = fig.mover.getAnimations().at(-1);
  const dx = (atual?.effect as KeyframeEffect | null)?.getKeyframes().at(-1)?.translate ?? "0px 0px";
  await fig.mover.animate([{ translate: String(dx) }, { translate: "0px 0px" }], { duration: ms, easing: "ease-in-out", fill: "forwards" }).finished;
  fig.mover.getAnimations().forEach((animacao) => animacao.cancel());
}

// Distância do bote: a luva para logo antes do peito do outro.
function distancia(de: Figura, ate: Figura) {
  const longe = Math.abs(ate.x - de.x) - ALCANCE * de.escala - PEITO * ate.escala * ate.porte + 2;
  return Math.max(0, longe) * (ate.x > de.x ? 1 : -1);
}

function apanhou(fig: Figura, forte = false) {
  fig.el.classList.remove("apanhando");
  void fig.el.getBoundingClientRect();
  fig.el.classList.add("apanhando");
  setTimeout(() => fig.el.classList.remove("apanhando"), 260);
  animar(fig.el.querySelector(".lutador-corpo")!, [{ translate: "0px 0px" }, { translate: `${forte ? -8 : -4}px 0px` }, { translate: "0px 0px" }], 220);
}

function numero(fig: Figura, dano: number, classe: string) {
  flutuar(cabecaDe(fig), dano ? `-${dano}` : "0", classe);
}

// Uma série de socos com os dois braços, um de cada vez.
async function serie(de: Figura, contra: Figura, danos: number[], aoAcertar: (dano: number, i: number) => void, forte = false) {
  for (const [i, dano] of danos.entries()) {
    const braco = i % 2 ? "socando-tras" : "socando-frente";
    de.el.classList.add(braco);
    aoAcertar(dano, i);
    apanhou(contra, forte);
    await esperar(forte ? 240 : 150);
    de.el.classList.remove(braco);
    await esperar(50);
  }
}

async function mostrarSoco(evento: Extract<Evento, { tipo: "soco" }>) {
  const luta = estado.luta!;
  const contra = rivais[evento.alvo];
  const rival = luta.rivais[evento.alvo];
  const segurou = luta.voce.atributos.forca <= rival.atributos.tecnica;
  let vida = rival.vida + evento.danos.reduce((soma, dano) => soma + dano, 0);
  await bote(crianca!, distancia(crianca!, contra), 180);
  await serie(crianca!, contra, evento.danos, (dano) => {
    vida -= dano;
    numero(contra, dano, segurou ? "efeito-segurou" : "");
    if (segurou) somBloqueio();
    else somSoco();
    redesenharVida(evento.alvo, vida);
  });
  await voltar(crianca!, 160);
  if (segurou && !dicaDoSoco) {
    dicaDoSoco = true;
    avisar(`A técnica de ${rival.nome} segura seus socos: só passa 1 de cada vez!`, 3200);
  }
}

// Atualiza só a barra de um adversário durante a animação: as outras ainda mostram a vida de
// antes dos golpes que vêm depois.
function redesenharVida(i: number, vida: number) {
  const el = camadaMarcas.querySelector(`.barra-rival[data-rival="${i}"]`);
  if (el) el.outerHTML = barra(rivais[i], Math.max(0, vida), estado.luta!.rivais[i].vidaMax, "barra-rival", i);
}

function redesenharMinhaVida(vida: number) {
  const luta = estado.luta!;
  const el = camadaMarcas.querySelector(".barra-crianca");
  if (el && crianca) el.outerHTML = barra(crianca, Math.max(0, vida), luta.voce.vidaMax, "barra-crianca");
}

async function mostrarPoder(evento: Extract<Evento, { tipo: "poder" }>) {
  const fig = crianca!;
  const mao = noPalco(fig.x + 14 * fig.escala, CHAO - 100 * fig.escala);
  fig.el.classList.add("levantando");
  await esperar(250);
  const luta = estado.luta!;
  if (evento.poder === "fogo") {
    somFogo();
    evento.alvos.forEach(({ alvo: i }) => lancar(mao, peitoDe(rivais[i]), "efeito-emoji efeito-poder", "🔥", 450, 40));
    await esperar(450);
    for (const { alvo: i, danos } of evento.alvos) {
      estourar(peitoDe(rivais[i]), ["🔥", "#ff9a2e", "#ffc933"], 10, 60);
      apanhou(rivais[i], true);
      numero(rivais[i], danos[0] ?? 0, "efeito-ouro");
      redesenharVida(i, luta.rivais[i].vida);
    }
  }
  if (evento.poder === "gelo") {
    somGelo();
    evento.alvos.forEach(({ alvo: i }) => lancar(mao, peitoDe(rivais[i]), "efeito-emoji efeito-poder", "❄️", 450, 30));
    await esperar(450);
    for (const { alvo: i } of evento.alvos) {
      estourar(peitoDe(rivais[i]), ["❄️", "#bfe8ff", "#fff"], 8, 50);
      rivais[i].el.classList.add("congelado");
    }
  }
  if (evento.poder === "raio") {
    somRaio();
    cena.classList.remove("relampago");
    void cena.offsetWidth;
    cena.classList.add("relampago");
    const { alvo: i, danos } = evento.alvos[0];
    let vida = luta.rivais[i].vida + danos.reduce((soma, dano) => soma + dano, 0);
    for (const dano of danos) {
      estourar(peitoDe(rivais[i]), ["⚡", "#ffc933", "#fff"], 5, 45);
      apanhou(rivais[i]);
      numero(rivais[i], dano, "efeito-ouro");
      vida -= dano;
      redesenharVida(i, vida);
      await esperar(140);
    }
  }
  await esperar(250);
  fig.el.classList.remove("levantando");
}

async function mostrarAtaque(evento: Extract<Evento, { tipo: "ataque" }>) {
  const luta = estado.luta!;
  const fig = rivais[evento.rival];
  const eu = crianca!;
  let vida = luta.voce.vida + evento.danos.reduce((soma, dano) => soma + dano, 0);
  if (evento.forte) {
    flutuar(cabecaDe(fig), "💥", "efeito-forte");
    fig.el.classList.add("levantando");
    await esperar(320);
    fig.el.classList.remove("levantando");
  }
  if (evento.forte && !evento.defendeu) fortesSemDefesa++;
  await bote(fig, distancia(fig, eu), 180);
  await serie(
    fig,
    eu,
    evento.danos,
    (dano) => {
      vida -= dano;
      if (evento.defendeu && dano === 0) {
        flutuar(cabecaDe(eu), "🛡️", "efeito-segurou");
        somDefesa();
      } else {
        numero(eu, dano, "efeito-erro");
        somSoco(evento.forte);
      }
      redesenharMinhaVida(vida);
    },
    evento.forte,
  );
  if (evento.forte && !evento.defendeu) tremer(cena, 7);
  await voltar(fig, 160);
}

async function mostrar(evento: Evento) {
  if (evento.tipo === "soco") await mostrarSoco(evento);
  if (evento.tipo === "defesa") {
    crianca!.el.classList.add("defendendo");
    somDefesa();
    await esperar(200);
  }
  if (evento.tipo === "poder") await mostrarPoder(evento);
  if (evento.tipo === "ataque") await mostrarAtaque(evento);
  if (evento.tipo === "congelado") {
    tremer(rivais[evento.rival].el, 2);
    flutuar(cabecaDe(rivais[evento.rival]), "❄️", "");
    await esperar(260);
  }
  if (evento.tipo === "nocaute") {
    const fig = rivais[evento.rival];
    fig.el.classList.add("nocaute");
    camadaMarcas.querySelectorAll(`[data-rival="${evento.rival}"]`).forEach((marca) => marca.remove());
    estourar(cabecaDe(fig), ["⭐", "#ffc933", "#fff"], 10, 60);
    somNocaute();
    flutuar(cabecaDe(fig), "Nocaute!", "efeito-ouro");
    await esperar(700);
  }
}

async function jogar(acao: Acao) {
  const luta = estado.luta;
  if (modo !== "luta" || ocupado || !luta || luta.fim) return;
  ocupado = true;
  desenharAcoes();
  if (estado.fase === 1) avisar("");
  const eventos = agir(luta, acao);
  for (const evento of eventos) await mostrar(evento);
  crianca?.el.classList.remove("defendendo");
  if (luta.fim) {
    await terminar();
    return;
  }
  // O alvo que caiu passa para o próximo de pé.
  if (!vivo(luta.rivais[alvo])) alvo = luta.rivais.findIndex(vivo);
  ocupado = false;
  desenharMarcas();
  const forteVindo = luta.rivais.some((rival) => vivo(rival) && intencao(rival) === "forte");
  if (forteVindo && estado.fase <= 5) avisar("💥 Golpe forte vindo! Toque em 🛡️ Defesa.");
  else if (aviso.textContent?.startsWith("💥")) avisar("");
}

aoTocarBotao(botaoSoco, () => jogar({ tipo: "soco", alvo }));
aoTocarBotao(botaoDefesa, () => jogar({ tipo: "defesa" }));
aoTocarBotao(botaoPoder, () => jogar({ tipo: "poder", alvo }));

function aoTocarBotao(botao: HTMLButtonElement, acao: () => void) {
  botao.addEventListener("click", () => {
    if (!botao.disabled) acao();
  });
}

// Tocar num adversário escolhe o alvo.
function escolherAlvo(i: number) {
  const luta = estado.luta;
  if (!luta || !luta.rivais[i] || !vivo(luta.rivais[i])) return;
  alvo = i;
  desenharMarcas();
  pular(rivais[i].el, 1.04);
}

camadaLutadores.addEventListener("pointerdown", (evento) => {
  if (modo !== "luta") return;
  const el = (evento.target as Element).closest<SVGElement>("[data-rival]");
  if (el) escolherAlvo(Number(el.dataset.rival));
});

cena.addEventListener("keydown", (evento) => {
  const luta = estado.luta;
  if (modo !== "luta" || !luta) return;
  if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
  evento.preventDefault();
  const vivos = luta.rivais.map((rival, i) => ({ rival, i })).filter(({ rival }) => vivo(rival));
  const k = vivos.findIndex(({ i }) => i === alvo);
  const passo = evento.key === "ArrowRight" ? 1 : -1;
  escolherAlvo(vivos[(k + passo + vivos.length) % vivos.length].i);
});

async function terminar() {
  const luta = estado.luta!;
  const venceu = luta.fim === "venceu";
  if (venceu) {
    crianca?.el.classList.add("vencedor");
    somVitoria();
    confete(30);
  } else {
    crianca?.el.classList.add("nocaute");
    somPerdeu();
  }
  await esperar(1300);
  const fase = estado.fase;
  const fim = luta.fim!;
  const resultado = encerrar(estado);
  moldura.placa(estado);
  ocupado = false;
  modo = "parado";
  if (resultado.zerou) {
    moldura.fim(estado, `Você venceu todas as ${ULTIMA_FASE} lutas e terminou com 💰 ${estado.moedas}.`, {
      titulo: "🏆 Você é o campeão da Luta Épica!",
      html: `<div class="campeao">${svgLutador(minhaFigura(), "foto-campeao")}<span class="cinturao" aria-hidden="true">🥇</span></div>`,
    });
    return;
  }
  if (resultado.venceu) {
    moldura.salvar(estado);
    seguirPara = proximaFase;
    moldura.mostrar(telaVitoria(resultado, fase));
    return;
  }
  if (estado.vidas <= 0) {
    moldura.fim(estado, "Os corações acabaram. Na próxima, leia bem a ficha antes de treinar!");
    return;
  }
  seguirPara = mostrarFicha;
  moldura.mostrar(telaDerrota(resultado, fim));
}

const botoesDaTela = (seguirTexto: string) =>
  `<div class="botoes-tela"><button class="botao botao-claro" type="button" data-acao="loja">🛒 Loja</button>
   <button class="botao" type="button" data-acao="seguir">${seguirTexto}</button></div>`;

function telaVitoria({ premio, pontos, perfeita }: Resultado, fase: number) {
  return `${estrelas(perfeita)}
    <h2>Você venceu a luta ${fase}!</h2>
    <p class="placar">+${pontos} pontos</p>
    <p>Prêmio da luta: <strong>💰 ${premio}</strong>. Agora você tem <strong>💰 ${estado.moedas}</strong>.</p>
    ${perfeita ? "<p>Venceu de primeira!</p>" : ""}
    ${botoesDaTela("Próxima luta")}`;
}

// Uma pista do que faltou, olhando os números da luta que acabou.
function dicaDaDerrota() {
  const meus = atributosDe(estado);
  const rivaisDaFase = estado.adversarios;
  const guarda = rivaisDaFase.find((rival) => meus.forca <= rival.atributos.tecnica);
  if (guarda) return `Seus socos quase não passavam pela técnica de ${guarda.nome}. Força maior que a técnica faz cada soco tirar mais.`;
  if (fortesSemDefesa >= 2) return "Quando aparecer 💥 em cima do adversário, toque em 🛡️ Defesa e segure o golpe forte.";
  const bruto = [...rivaisDaFase].sort((a, b) => danoPorSoco(b.atributos.forca, meus.tecnica) - danoPorSoco(a.atributos.forca, meus.tecnica))[0];
  if (danoPorSoco(bruto.atributos.forca, meus.tecnica) >= 3)
    return `Os socos de ${bruto.nome} entravam com tudo. Técnica segura uma parte de cada soco dele.`;
  return "Velocidade dá mais socos por vez, e resistência faz você aguentar mais.";
}

// Quem tem dinheiro parado e nenhum equipamento ganha uma lembrança da loja.
function lembrarDaLoja() {
  const equipamentos = ATRIBUTOS.reduce((soma, atributo) => soma + estado.equipamentos[atributo], 0);
  const maisBarato = Math.min(...ATRIBUTOS.map((atributo) => precoDoEquipamento(estado, atributo) ?? Infinity));
  return estado.fase >= 5 && equipamentos < 2 && estado.moedas >= maisBarato
    ? "<p>Na 🛒 Loja, os equipamentos da academia deixam você mais forte em toda luta!</p>"
    : "";
}

function telaDerrota({ perdeuVida }: Resultado, fim: string) {
  return `<div class="emblema emblema-tropeco" aria-hidden="true">${perdeuVida ? "💔" : "🔁"}</div>
    <h2>${fim === "juiz" ? "O juiz encerrou a luta!" : "Você foi para a lona!"}</h2>
    <p>${perdeuVida ? "Você perdeu um coração. " : ""}O mesmo adversário espera você: treine diferente!</p>
    <p class="dica">${dicaDaDerrota()}</p>
    ${lembrarDaLoja()}
    ${botoesDaTela("Treinar de novo")}`;
}

// Ficha do adversário: quem vem aí, os números dele e a escolha do poder.

const REGRAS = `<ul class="regras">
  <li><b>💪 Força</b> Cada soco tira sua força menos a técnica do outro.</li>
  <li><b>💨 Velocidade</b> Quantos socos você dá de uma vez.</li>
  <li><b>🥋 Técnica</b> Segura uma parte de cada soco do outro.</li>
  <li><b>🔋 Resistência</b> Quanto você aguenta.</li>
</ul>`;

function fichaDoRival(rival: (typeof estado.adversarios)[number]) {
  const numeros = ATRIBUTOS.map(
    (atributo) =>
      `<li aria-label="${ATRIBUTO[atributo].nome} ${rival.atributos[atributo]}"><span aria-hidden="true">${ATRIBUTO[atributo].icone} <b>${rival.atributos[atributo]}</b></span></li>`,
  ).join("");
  return `<div class="ficha-rival" style="--cor: ${jeitoDe(rival).camisa}">
    ${svgRetrato(jeitoDe(rival))}
    <div class="ficha-texto"><strong>${rival.nome}</strong><small>${ESTILOS[rival.estilo].frase}</small>
    <ul class="numeros">${numeros}</ul></div>
  </div>`;
}

function escolhaDePoder() {
  const poderes = poderesDaFase(estado.fase);
  if (!poderes.length) return "";
  const botoes = poderes
    .map((id) => {
      const { nome, icone, texto } = PODER[id];
      return `<button class="poder${estado.poder === id ? " escolhido" : ""}" type="button" data-acao="poder" data-id="${id}" aria-pressed="${estado.poder === id}">
        <span class="poder-icone" aria-hidden="true">${icone}</span><span class="sobre"><strong>${nome}</strong><small>${texto}</small></span></button>`;
    })
    .join("");
  return `<p class="titulo-secao">Seu poder nesta luta</p><div class="poderes">${botoes}</div>`;
}

function htmlDaFicha() {
  const { adversarios } = estado;
  const titulo = estado.fase === ULTIMA_FASE ? "A final!" : `Luta ${estado.fase}`;
  return `<div id="ficha" class="tela-ficha">
    <h2>${titulo}</h2>
    <p>${adversarios.length > 1 ? `${adversarios.length} adversários juntos:` : "Seu adversário:"}</p>
    <div class="fichas">${adversarios.map(fichaDoRival).join("")}</div>
    ${estado.fase <= 4 ? REGRAS : ""}
    ${escolhaDePoder()}
    <button class="botao" type="button" data-acao="seguir">Treinar! 🏋️</button>
  </div>`;
}

function mostrarFicha() {
  trocarModo("treino");
  montarTreino();
  desenharTreino();
  seguirPara = entrarNoTreino;
  moldura.mostrar(htmlDaFicha());
}

function mostrarNovidadeOuFicha() {
  const novidade = NOVIDADES[estado.fase];
  if (novidade && novidadeVista !== estado.fase) {
    novidadeVista = estado.fase;
    seguirPara = mostrarFicha;
    moldura.mostrar(telaNovidade({ titulo: "Novidade!", texto: novidade.texto, emblema: novidade.emblema }));
    return;
  }
  mostrarFicha();
}

function proximaFase() {
  prepararFase(estado);
  mostrarNovidadeOuFicha();
}

// Loja: academia e vestiário, num painel do kit. Só o miolo é redesenhado a cada toque.

function cartaoEquipamento(atributo: Atributo) {
  const { nome, texto, precos } = EQUIPAMENTOS[atributo];
  const nivel = estado.equipamentos[atributo];
  const preco = precoDoEquipamento(estado, atributo);
  const escolhido = selecionado?.tipo === "equipamento" && selecionado.id === atributo;
  const pontos = precos.map((_, i) => `<span class="${i < nivel ? "nivel cheio" : "nivel"}"></span>`).join("");
  return `<button class="cartao cartao-equipamento${escolhido ? " escolhido" : ""}${preco === null ? " completo" : ""}" type="button" data-acao="equipamento" data-id="${atributo}">
    <span class="icone" aria-hidden="true">${ATRIBUTO[atributo].icone}</span>
    <span class="sobre"><strong>${nome}</strong><small>${texto}</small><span class="niveis" aria-label="Nível ${nivel} de ${precos.length}">${pontos}</span></span>
    <span class="etiqueta">${preco === null ? "Completo" : `💰 ${preco}`}</span>
  </button>`;
}

function provador(): Jeito {
  const vestiario = { ...estado.vestiario };
  if (selecionado?.tipo === "peca") vestiario[selecionado.peca] = selecionado.id;
  return jeitoDaCrianca(vestiario);
}

function fileira(peca: Peca) {
  const { nome, itens } = PECAS[peca];
  const botoes = itens
    .map((item) => {
      const seu = temPeca(estado, peca, item.id);
      const vestindo = estado.vestiario[peca] === item.id;
      const escolhido = selecionado?.tipo === "peca" && selecionado.peca === peca && selecionado.id === item.id;
      const classes = ["peca", seu && "seu", vestindo && "vestindo", escolhido && "escolhido"].filter(Boolean).join(" ");
      return `<button class="${classes}" type="button" data-acao="peca" data-peca="${peca}" data-id="${item.id}" aria-label="${nome} ${item.nome}${seu ? "" : `, ${item.preco} moedas`}">
        <svg viewBox="-17 -17 34 34" aria-hidden="true">${amostra(peca, item)}</svg>
        <span class="etiqueta">${vestindo ? "✓" : seu ? "Sua" : `💰${item.preco}`}</span>
      </button>`;
    })
    .join("");
  return `<p class="titulo-peca">${nome}</p><div class="pecas">${botoes}</div>`;
}

function precoSelecionado() {
  if (!selecionado) return null;
  if (selecionado.tipo === "equipamento") return precoDoEquipamento(estado, selecionado.id);
  const item = PECAS[selecionado.peca].itens.find((peca) => peca.id === selecionado!.id);
  return item ? item.preco : null;
}

function mioloDaLoja() {
  const preco = precoSelecionado();
  const balcao = selecionado && preco !== null ? `<button class="botao" type="button" data-acao="comprar">Comprar por 💰 ${preco}</button>` : "";
  return `<h2>Loja</h2>
    <p class="titulo-secao">Academia</p>
    <div class="equipamentos">${ATRIBUTOS.map(cartaoEquipamento).join("")}</div>
    <p class="titulo-secao">Vestiário</p>
    <div class="vestiario">
      <div class="provador">${svgLutador(provador())}</div>
      <div class="prateleiras">${fileira("luvas")}${fileira("roupa")}${fileira("faixa")}</div>
    </div>
    <div class="balcao">
      <p class="saldo">Você tem <strong>💰 ${estado.moedas}</strong></p>
      <p class="aviso-loja" aria-live="polite">${avisoDaLoja}</p>
      ${balcao}
      <button class="botao${balcao ? " botao-claro" : ""}" type="button" data-acao="seguir">Pronto</button>
    </div>`;
}

function redesenharLoja() {
  const loja = document.getElementById("loja");
  if (loja) loja.innerHTML = mioloDaLoja();
}

function abrirLoja() {
  selecionado = null;
  avisoDaLoja = "";
  moldura.mostrar(`<div id="loja" class="loja">${mioloDaLoja()}</div>`);
}

function comprarSelecionado() {
  if (!selecionado) return;
  if (selecionado.tipo === "equipamento") {
    const nome = EQUIPAMENTOS[selecionado.id].nome;
    const resposta = comprarEquipamento(estado, selecionado.id);
    if (resposta === "comprou") {
      somCompra();
      confete(20);
      avisoDaLoja = `${nome}: comprado!`;
      selecionado = null;
    } else if (resposta === "falta") {
      somFalta();
      avisoDaLoja = "Ainda faltam moedas para esse.";
    }
    return;
  }
  const { peca, id } = selecionado;
  const item = PECAS[peca].itens.find((coisa) => coisa.id === id)!;
  const resposta = vestir(estado, peca, id, item.preco);
  if (resposta === "falta") {
    somFalta();
    avisoDaLoja = "Ainda faltam moedas para essa.";
    return;
  }
  somCompra();
  confete(16);
  avisoDaLoja = `${PECAS[peca].nome} ${item.nome.toLowerCase()}: é sua!`;
  selecionado = null;
}

painel.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-acao]");
  if (!botao) return;
  const { acao, id, peca } = botao.dataset;
  if (acao === "loja") abrirLoja();
  if (acao === "poder" && id) {
    escolherPoder(estado, id as PoderId);
    const ficha = document.getElementById("ficha");
    if (ficha) ficha.outerHTML = htmlDaFicha();
  }
  if (acao === "equipamento" && id) {
    const atributo = id as Atributo;
    selecionado = precoDoEquipamento(estado, atributo) === null ? null : { tipo: "equipamento", id: atributo };
    avisoDaLoja = selecionado ? "" : "Esse já está no máximo!";
    redesenharLoja();
  }
  if (acao === "peca" && id && peca) {
    const qual = peca as Peca;
    avisoDaLoja = "";
    if (temPeca(estado, qual, id)) {
      vestir(estado, qual, id, 0);
      selecionado = null;
    } else {
      selecionado = { tipo: "peca", peca: qual, id };
    }
    redesenharLoja();
  }
  if (acao === "comprar") {
    comprarSelecionado();
    redesenharLoja();
  }
});

// Começo

function comecar(fase: number) {
  estado = novoJogo(fase);
  novidadeVista = 0;
  dicaDoSoco = false;
  ocupado = false;
  moldura.placa(estado);
  trocarModo("treino");
  montarTreino();
  desenharTreino();
  // Quem continua de uma fase adiantada chega com moedas para a loja.
  if (fase > 1) {
    seguirPara = mostrarNovidadeOuFicha;
    abrirLoja();
    return;
  }
  // A primeira luta começa direto no treino: o adversário está no canto da academia.
  entrarNoTreino();
}

trocarModo("treino");
montarTreino();
desenharTreino();
