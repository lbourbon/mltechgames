import { aoMudarConta, contaAtual, lerProgresso, registrarResultado } from "../../lib/conta";
import { AVISO_LOGIN } from "../comum";
import {
  comer,
  configDaFase,
  novoJogo,
  proximaBolha,
  tempoEsgotado,
  type Estado,
  type Jogada,
} from "./logica";

type Bolha = { el: HTMLButtonElement; valor: number; y: number; velocidade: number };
type Tela = { nome: "inicio" | "fim" } | { nome: "fase"; concluida: number };

const JOGO_ID = "monstrinho";
const MAX_BOLHAS = 6;
const INTERVALO_BOLHAS = 1.1;
const CORES = ["#ff5a5f", "#2f7bff", "#ffc933", "#a45cff", "#ff9a3d"];

const porId = (id: string) => document.getElementById(id)!;

const ceu = porId("ceu");
const painel = porId("painel");
const monstro = porId("monstro");
const fala = porId("fala");
const hud = {
  vidas: porId("vidas"),
  pontos: porId("pontos"),
  fase: porId("fase"),
  alvo: porId("alvo"),
  comeu: porId("comeu"),
  barriga: porId("barriga"),
  tempo: porId("tempo"),
};

let estado: Estado = novoJogo();
let bolhas: Bolha[] = [];
let rodando = false;
let ultimoQuadro = 0;
let tempoRestante = 0;
let proximaEm = 0;
let recordeAnterior = 0;
let telaAtual: Tela | null = null;
let timerHumor = 0;

function desenharHud() {
  hud.vidas.textContent = "❤️".repeat(estado.vidas);
  hud.vidas.setAttribute("aria-label", `${estado.vidas} vidas`);
  hud.pontos.textContent = String(estado.pontos);
  hud.fase.textContent = String(estado.fase);
  hud.alvo.textContent = String(estado.alvo);
  hud.comeu.textContent = String(estado.comeu);
  hud.barriga.style.width = `${(estado.comeu / estado.alvo) * 100}%`;
}

function reagir(humor: string, texto: string) {
  monstro.dataset.humor = humor;
  fala.textContent = texto;
  clearTimeout(timerHumor);
  timerHumor = window.setTimeout(() => {
    monstro.dataset.humor = "";
    fala.textContent = "";
  }, 900);
}

function removerBolha(bolha: Bolha) {
  bolha.el.remove();
  bolhas = bolhas.filter((outra) => outra !== bolha);
}

function limparBolhas() {
  bolhas.forEach((bolha) => bolha.el.remove());
  bolhas = [];
}

function criarBolha() {
  const restante = estado.alvo - estado.comeu;
  const temUtil = bolhas.some((bolha) => bolha.valor <= restante);
  const valor = proximaBolha(restante, configDaFase(estado.fase), temUtil);

  const el = document.createElement("button");
  el.type = "button";
  el.className = "bolha";
  el.textContent = String(valor);
  el.style.left = `${4 + Math.random() * 74}%`;
  el.style.background = CORES[valor % CORES.length];

  const bolha: Bolha = { el, valor, y: -0.15, velocidade: 0.11 + estado.fase * 0.012 };
  el.addEventListener("pointerdown", () => morder(bolha));
  // detail 0 é o clique vindo do teclado.
  el.addEventListener("click", (evento) => {
    if (evento.detail === 0) morder(bolha);
  });
  ceu.append(el);
  bolhas.push(bolha);
}

function morder(bolha: Bolha) {
  if (!rodando) return;
  removerBolha(bolha);
  aplicar(comer(estado, bolha.valor));
}

function aplicar({ estado: novoEstado, resultado }: Jogada) {
  const faseAnterior = estado.fase;
  estado = novoEstado;
  desenharHud();

  switch (resultado) {
    case "comeu":
      reagir("nhac", "Nhac!");
      break;
    case "satisfeito":
      reagir("feliz", "Que delícia!");
      tempoRestante = configDaFase(estado.fase).tempo;
      break;
    case "passou":
      reagir("enjoado", "Ai, minha barriga!");
      tempoRestante = configDaFase(estado.fase).tempo;
      break;
    case "tempo":
      reagir("enjoado", "Demorou demais!");
      tempoRestante = configDaFase(estado.fase).tempo;
      break;
    case "fase":
      registrarResultado(JOGO_ID, { pontos: estado.pontos, fase: estado.fase });
      pausar();
      mostrar({ nome: "fase", concluida: faseAnterior });
      break;
    case "fim":
      registrarResultado(JOGO_ID, { pontos: estado.pontos, fase: estado.fase });
      pausar();
      mostrar({ nome: "fim" });
      break;
  }
}

function quadro(agora: number) {
  if (!rodando) return;
  // O teto evita um salto das bolhas quando a aba volta de segundo plano.
  const dt = Math.min(agora - ultimoQuadro, 50) / 1000;
  ultimoQuadro = agora;

  proximaEm -= dt;
  if (proximaEm <= 0 && bolhas.length < MAX_BOLHAS) {
    criarBolha();
    proximaEm = INTERVALO_BOLHAS;
  }

  for (const bolha of [...bolhas]) {
    bolha.y += bolha.velocidade * dt;
    if (bolha.y > 1) removerBolha(bolha);
    else bolha.el.style.top = `${bolha.y * 100}%`;
  }

  tempoRestante -= dt;
  hud.tempo.style.width = `${(tempoRestante / configDaFase(estado.fase).tempo) * 100}%`;
  if (tempoRestante <= 0) aplicar(tempoEsgotado(estado));

  if (rodando) requestAnimationFrame(quadro);
}

function retomar() {
  telaAtual = null;
  painel.hidden = true;
  limparBolhas();
  tempoRestante = configDaFase(estado.fase).tempo;
  proximaEm = 0;
  rodando = true;
  ultimoQuadro = performance.now();
  requestAnimationFrame(quadro);
}

function pausar() {
  rodando = false;
  limparBolhas();
}

function comecar(fase: number) {
  recordeAnterior = lerProgresso(JOGO_ID).recorde;
  estado = novoJogo(fase);
  desenharHud();
  retomar();
}

function htmlDaTela(tela: Tela) {
  if (tela.nome === "fase") {
    return `<h2>Fase ${tela.concluida} completa!</h2>
      <p>Agora ele ficou com mais fome. Vem aí a fase ${estado.fase}.</p>
      <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
  }
  if (tela.nome === "fim") {
    return `<h2>${estado.pontos > recordeAnterior ? "Novo recorde!" : "Fim de jogo"}</h2>
      <p class="placar">${estado.pontos} pontos</p>
      <p>Você chegou à fase ${estado.fase}.</p>
      <button class="botao" type="button" data-acao="inicio">Jogar de novo</button>
      ${contaAtual().logado ? "" : AVISO_LOGIN}`;
  }
  const { recorde, fase } = lerProgresso(JOGO_ID);
  const continuar = `<button class="botao" type="button" data-acao="jogar" data-fase="${fase}">Continuar da fase ${fase}</button>`;
  return `<h1>Monstrinho Guloso</h1>
    <p>Toque na comida que cai do céu e encha a barriga dele na medida certa. Se passar, ele passa mal!</p>
    ${recorde ? `<p><strong>Recorde: ${recorde}</strong></p>` : ""}
    ${fase > 1 ? continuar : ""}
    <button class="botao ${fase > 1 ? "botao-claro" : ""}" type="button" data-acao="jogar" data-fase="1">${fase > 1 ? "Começar do início" : "Jogar"}</button>`;
}

function mostrar(tela: Tela) {
  telaAtual = tela;
  painel.innerHTML = htmlDaTela(tela);
  painel.hidden = false;
}

painel.addEventListener("click", (evento) => {
  const botao = (evento.target as HTMLElement).closest<HTMLElement>("[data-acao]");
  if (!botao) return;
  const { acao, fase } = botao.dataset;
  if (acao === "jogar") comecar(Number(fase));
  if (acao === "seguir") retomar();
  if (acao === "inicio") mostrar({ nome: "inicio" });
});

// O login ou a troca de perfil podem chegar com um painel aberto: redesenha com o progresso novo.
aoMudarConta(() => {
  if (telaAtual) mostrar(telaAtual);
});

mostrar({ nome: "inicio" });
