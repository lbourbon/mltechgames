import { aoTocar, porId } from "../kit/dom";
import { centroDe, confete, estourar, flutuar, lancar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { criarLaco, esperar } from "../kit/tempo";
import {
  comer,
  configDaFase,
  novoJogo,
  proximaBolha,
  tempoEsgotado,
  type Estado,
  type Jogada,
} from "./logica";
import { somDemorou, somNhac, somPassou, somSatisfeito } from "./sons";

type Bolha = { el: HTMLButtonElement; valor: number; y: number; velocidade: number };

const MAX_BOLHAS = 6;
const INTERVALO_BOLHAS = 1.1;
const TEMPO_ACABANDO = 0.25;
// Quanto a barriga fica à vista, cheia, antes de passar para o próximo pedido.
const MOSTRA_CHEIO_MS = 450;
const CORES = ["#ff5a5f", "#2f7bff", "#ffc933", "#a45cff", "#ff9a3d"];

const ceu = porId("ceu");
const monstro = porId("monstro");
const boca = monstro.querySelector(".boca")!;
const fala = porId("fala");
const jogo = document.querySelector(".jogo")!;
const hud = {
  alvo: porId("alvo"),
  comeu: porId("comeu"),
  barriga: porId("barriga"),
  tempo: porId("tempo"),
};

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: retomar });
const laco = criarLaco(quadro);

let estado: Estado = novoJogo();
let bolhas: Bolha[] = [];
let tempoRestante = 0;
let proximaEm = 0;
let timerHumor = 0;

const corDe = (valor: number) => CORES[valor % CORES.length];

// Acima do rosto, para o número não cobrir a boca aberta.
function acimaDoMonstro() {
  const { x, y } = centroDe(monstro);
  return { x, y: y - 44 };
}

function encher(cheio: number) {
  hud.barriga.style.width = `${cheio * 100}%`;
  monstro.style.setProperty("--cheio", String(cheio));
}

function desenharHud() {
  moldura.placa(estado);
  if (hud.alvo.textContent !== String(estado.alvo)) pular(hud.alvo);
  hud.alvo.textContent = String(estado.alvo);
  hud.comeu.textContent = String(estado.comeu);
  encher(estado.comeu / estado.alvo);
}

// O estado já é o do próximo pedido: deixa a criança ver a barriga que acabou de encher.
function mostrarBarrigaCheia() {
  encher(1);
  setTimeout(() => encher(estado.comeu / estado.alvo), MOSTRA_CHEIO_MS);
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
  el.style.backgroundColor = corDe(valor);

  const bolha: Bolha = { el, valor, y: -0.15, velocidade: 0.11 + estado.fase * 0.012 };
  aoTocar(el, () => morder(bolha));
  ceu.append(el);
  bolhas.push(bolha);
}

function morder(bolha: Bolha) {
  if (!laco.rodando()) return;
  const origem = centroDe(bolha.el);
  const cor = corDe(bolha.valor);
  removerBolha(bolha);
  estourar(origem, [cor], 6, 50);
  const voando = lancar(origem, centroDe(boca), "bolha-voando", String(bolha.valor), 180, 30);
  if (voando) voando.style.backgroundColor = cor;
  aplicar(comer(estado, bolha.valor), bolha.valor);
}

function festejarRefeicao() {
  const centro = centroDe(monstro);
  estourar(centro, ["💚", "⭐", "#ffc933", "#18b67e"], 14, 120);
  mostrarBarrigaCheia();
}

async function aplicar({ estado: novoEstado, resultado }: Jogada, valor = 0) {
  const anterior = estado;
  const ganhou = novoEstado.pontos - anterior.pontos;
  estado = novoEstado;
  desenharHud();

  switch (resultado) {
    case "comeu":
      reagir("nhac", "Nhac!");
      somNhac(estado.comeu / estado.alvo);
      flutuar(acimaDoMonstro(), `+${valor}`);
      break;
    case "satisfeito":
      reagir("feliz", estado.sequencia > 1 ? `Que delícia! ${estado.sequencia} seguidas!` : "Que delícia!");
      somNhac(1);
      somSatisfeito(estado.sequencia);
      festejarRefeicao();
      flutuar(acimaDoMonstro(), `+${ganhou}`, "efeito-ouro");
      tempoRestante = configDaFase(estado.fase).tempo;
      break;
    case "passou":
      reagir("enjoado", "Ai, minha barriga!");
      somPassou();
      tremer(jogo, 9);
      tempoRestante = configDaFase(estado.fase).tempo;
      break;
    case "tempo":
      reagir("enjoado", "Demorou demais!");
      somDemorou();
      tempoRestante = configDaFase(estado.fase).tempo;
      break;
    case "fase":
      moldura.salvar(estado);
      pausar();
      reagir("feliz", "Barriga cheia!");
      somNhac(1);
      somVitoria();
      festejarRefeicao();
      confete();
      flutuar(acimaDoMonstro(), `+${ganhou}`, "efeito-ouro");
      await esperar(1100);
      moldura.mostrar(telaFase(anterior.fase));
      break;
    case "fim":
      pausar();
      reagir("enjoado", "Ai, ai, ai...");
      somPassou();
      tremer(jogo, 9);
      await esperar(800);
      moldura.fim(estado);
      break;
  }
}

function quadro(dt: number) {
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
  const tempo = tempoRestante / configDaFase(estado.fase).tempo;
  hud.tempo.style.width = `${tempo * 100}%`;
  hud.tempo.classList.toggle("acabando", tempo < TEMPO_ACABANDO);
  if (tempoRestante <= 0) aplicar(tempoEsgotado(estado));
}

function retomar() {
  limparBolhas();
  tempoRestante = configDaFase(estado.fase).tempo;
  proximaEm = 0;
  laco.ligar();
}

function pausar() {
  laco.desligar();
  limparBolhas();
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  desenharHud();
  retomar();
}

function telaFase(concluida: number) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p>Agora ele ficou com mais fome. Vem aí a fase ${estado.fase}.</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}
