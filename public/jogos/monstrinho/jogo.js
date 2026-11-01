import { comer, configDaFase, novoJogo, proximaBolha, tempoEsgotado } from "./logica.js";
import { aoMudarConta, entrar, lerProgresso, registrarResultado, usuarioAtual } from "/js/conta.js";

const JOGO_ID = "monstrinho";
const MAX_BOLHAS = 6;
const INTERVALO_BOLHAS = 1.1;
const CORES = ["#ff5a5f", "#2f7bff", "#ffc933", "#a45cff", "#ff9a3d"];

const ceu = document.getElementById("ceu");
const painel = document.getElementById("painel");
const monstro = document.getElementById("monstro");
const fala = document.getElementById("fala");
const hud = {
  vidas: document.getElementById("vidas"),
  pontos: document.getElementById("pontos"),
  fase: document.getElementById("fase"),
  alvo: document.getElementById("alvo"),
  comeu: document.getElementById("comeu"),
  barriga: document.getElementById("barriga"),
  tempo: document.getElementById("tempo"),
};

let estado = null;
let bolhas = [];
let rodando = false;
let ultimoQuadro = 0;
let tempoRestante = 0;
let proximaEm = 0;
let recordeAnterior = 0;
let telaAtual = null;
let timerHumor = 0;

function desenharHud() {
  hud.vidas.textContent = "❤️".repeat(estado.vidas);
  hud.vidas.setAttribute("aria-label", `${estado.vidas} vidas`);
  hud.pontos.textContent = estado.pontos;
  hud.fase.textContent = estado.fase;
  hud.alvo.textContent = estado.alvo;
  hud.comeu.textContent = estado.comeu;
  hud.barriga.style.width = `${(estado.comeu / estado.alvo) * 100}%`;
}

function reagir(humor, texto) {
  monstro.dataset.humor = humor;
  fala.textContent = texto;
  clearTimeout(timerHumor);
  timerHumor = setTimeout(() => {
    monstro.dataset.humor = "";
    fala.textContent = "";
  }, 900);
}

function removerBolha(bolha) {
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
  el.textContent = valor;
  el.style.left = `${4 + Math.random() * 74}%`;
  el.style.background = CORES[valor % CORES.length];

  const bolha = { el, valor, y: -0.15, velocidade: 0.11 + estado.fase * 0.012 };
  el.addEventListener("pointerdown", () => morder(bolha));
  // detail 0 é o clique vindo do teclado.
  el.addEventListener("click", (evento) => {
    if (evento.detail === 0) morder(bolha);
  });
  ceu.append(el);
  bolhas.push(bolha);
}

function morder(bolha) {
  if (!rodando) return;
  removerBolha(bolha);
  aplicar(comer(estado, bolha.valor));
}

function aplicar({ estado: novoEstado, resultado }) {
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
      mostrar("fase", faseAnterior);
      break;
    case "fim":
      registrarResultado(JOGO_ID, { pontos: estado.pontos, fase: estado.fase });
      pausar();
      mostrar("fim");
      break;
  }
}

function quadro(agora) {
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

function comecar(fase) {
  recordeAnterior = lerProgresso(JOGO_ID).recorde;
  estado = novoJogo(fase);
  desenharHud();
  retomar();
}

const avisoLogin = `<p class="aviso-login">Seu progresso está guardado só neste aparelho.
  Entre com Google para jogar de onde parou em qualquer lugar. Peça ajuda a um adulto!</p>
  <button class="botao botao-claro" type="button" data-acao="entrar">Entrar com Google</button>`;

const telas = {
  inicio() {
    const { recorde, fase } = lerProgresso(JOGO_ID);
    return `<h1>Monstrinho Guloso</h1>
      <p>Toque na comida que cai do céu e encha a barriga dele na medida certa. Se passar, ele passa mal!</p>
      ${recorde ? `<p><strong>Recorde: ${recorde}</strong></p>` : ""}
      ${fase > 1 ? `<button class="botao" type="button" data-acao="jogar" data-fase="${fase}">Continuar da fase ${fase}</button>` : ""}
      <button class="botao ${fase > 1 ? "botao-claro" : ""}" type="button" data-acao="jogar" data-fase="1">${fase > 1 ? "Começar do início" : "Jogar"}</button>`;
  },
  fase(faseConcluida) {
    return `<h2>Fase ${faseConcluida} completa!</h2>
      <p>Agora ele ficou com mais fome. Vem aí a fase ${estado.fase}.</p>
      <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
  },
  fim() {
    const bateu = estado.pontos > recordeAnterior;
    return `<h2>${bateu ? "Novo recorde!" : "Fim de jogo"}</h2>
      <p class="placar">${estado.pontos} pontos</p>
      <p>Você chegou à fase ${estado.fase}.</p>
      <button class="botao" type="button" data-acao="inicio">Jogar de novo</button>
      ${usuarioAtual() ? "" : avisoLogin}`;
  },
};

function mostrar(tela, parametro) {
  telaAtual = { tela, parametro };
  painel.innerHTML = telas[tela](parametro);
  painel.hidden = false;
}

painel.addEventListener("click", (evento) => {
  const botao = evento.target.closest("[data-acao]");
  if (!botao) return;
  const { acao, fase } = botao.dataset;
  if (acao === "jogar") comecar(Number(fase));
  if (acao === "seguir") retomar();
  if (acao === "inicio") mostrar("inicio");
  if (acao === "entrar") entrar();
});

// O login pode chegar com um painel aberto: redesenha com o progresso sincronizado.
aoMudarConta(() => {
  if (telaAtual) mostrar(telaAtual.tela, telaAtual.parametro);
});

mostrar("inicio");
