import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import { abre, atravessar, novoJogo, passar, type Estado, type Jogada, type Porteira } from "./logica";
import {
  somCarroca,
  somCresceu,
  somEncolheu,
  somFaltou,
  somForca,
  somMugido,
  somPerfeita,
  somPorteira,
  somSaiu,
  somTrancada,
  somTrote,
} from "./sons";

const CORES = [
  ["#fff", "#2b2140"],
  ["#c98a4b", "#7f4519"],
  ["#fff", "#b5692e"],
  ["#8a6248", "#4f3424"],
];

// A tela só cabe uma parte de uma boiada grande: os bois crescem devagar e os de trás saem pela borda.
const MAIS_BOIS_NA_TELA = 36;
const LINHAS = 4;
const PASSOS_DA_CONTAGEM = 14;
const TROCA_DE_CAMINHO = 240;
const PASSAGEM_DA_PORTEIRA = 1000;
const ESPERA_DA_PORTEIRA = 380;
// Faixa da cena, em %, onde ficam as porteiras (.porteiras em jogo.css).
const TOPO_DAS_PORTEIRAS = 33;
const ALTURA_DAS_PORTEIRAS = 65;
const CHEGADA_DA_CARROCA = 800;

const nomeDe = ({ conta, valor }: Porteira) => `${conta}${valor}`;
const bois = (quantos: number) => (quantos === 1 ? "boi" : "bois");

const jogo = document.querySelector(".jogo")!;
const estrada = porId("estrada");
const tropa = porId("tropa");
const rebanho = porId("rebanho");
const xerife = porId("xerife");
const vias = porId("vias");
const carroca = porId("carroca");
const fala = porId("fala");
const fila = porId("fila");
const trilha = porId("trilha");
const porteiras = porId("porteiras");
const contador = porId("boiada");
const palavraBois = porId("bois");
const barra = porId("barra");
const meta = porId("meta");

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: comecarEstrada });

let estado: Estado = novoJogo();
let travado = true;
let botoes: HTMLButtonElement[] = [];
let naTela: HTMLElement[] = [];

function quantosNaTela(boiada: number) {
  if (boiada <= 12) return boiada;
  return Math.min(MAIS_BOIS_NA_TELA, Math.round(12 + 6 * Math.log2(boiada / 12)));
}

function criarBoi(posicao: number) {
  const boi = document.createElement("span");
  const coluna = Math.floor(posicao / LINHAS);
  const linha = posicao % LINHAS;
  const [pelo, mancha] = CORES[posicao % CORES.length];
  boi.className = "boi";
  boi.style.setProperty("--pelo", pelo);
  boi.style.setProperty("--mancha", mancha);
  boi.style.setProperty("--coluna", String(coluna + (linha % 2) / 2));
  boi.style.setProperty("--linha", String(linha));
  boi.style.zIndex = String(LINHAS - linha);
  boi.style.animationDelay = `${-(posicao % 5) * 0.06}s`;
  boi.innerHTML = `<svg viewBox="0 0 100 76"><use href="#boi"></use></svg>`;
  rebanho.append(boi);
  return boi;
}

// Bois novos chegam pulando, e os que saem fogem pelo alto. Só a quantidade muda: quem já
// estava na tela fica no lugar, para a boiada parecer crescer em vez de ser redesenhada.
function ajustarRebanho(boiada: number, festa = true) {
  const quantos = quantosNaTela(boiada);
  while (naTela.length < quantos) {
    const boi = criarBoi(naTela.length);
    naTela.push(boi);
    if (festa) animar(boi, [{ scale: 0 }, { scale: 1.25 }, { scale: 1 }], 260);
  }
  while (naTela.length > quantos) {
    const boi = naTela.pop()!;
    if (festa) boi.classList.add("fugindo");
    esperar(festa ? 400 : 0).then(() => boi.remove());
  }
}

function desenharContagem(boiada: number) {
  contador.textContent = String(boiada);
  palavraBois.textContent = bois(boiada);
  barra.style.width = `${Math.min(100, (boiada / estado.mapa.meta) * 100)}%`;
  barra.dataset.cheia = boiada >= estado.mapa.meta ? "1" : "";
}

function desenharPorteiras() {
  botoes.forEach((botao, i) => {
    const porteira = estado.abertas[i];
    botao.disabled = travado;
    const nome = nomeDe(porteira);
    const fechada = !abre(estado.boiada, porteira);
    botao.classList.toggle("fechada", fechada);
    botao.setAttribute("aria-label", `Porteira ${nome}${fechada ? ", fechada" : ""}`);
    botao.classList.remove("passada");
    const texto = botao.querySelector(".porteira-conta")!;
    if (texto.textContent !== nome) {
      texto.textContent = nome;
      animar(botao, [{ translate: "130% 0", opacity: 0 }, { translate: "0 0", opacity: 1 }], 320);
    }
  });
}

function desenharCaminho() {
  fila.replaceChildren(
    ...(estado.reserva.length > 0 ? estado.reserva : [null]).map((porteira) => {
      const item = document.createElement("span");
      item.className = porteira ? "fila-item" : "fila-item fila-fim";
      item.textContent = porteira ? nomeDe(porteira) : "A carroça!";
      return item;
    }),
  );
  const total = estado.mapa.trechos;
  trilha.setAttribute("aria-label", `Faltam ${estado.trechos} de ${total} porteiras`);
  trilha.replaceChildren(
    ...Array.from({ length: total }, (_, i) => {
      const marca = document.createElement("span");
      marca.className = i < total - estado.trechos ? "marca feita" : "marca";
      return marca;
    }),
  );
}

// A estrada se abre em um caminho para cada porteira. As linhas tracejadas correm na direção dela.
function desenharVias(quantas: number) {
  const centro = TOPO_DAS_PORTEIRAS + ALTURA_DAS_PORTEIRAS / 2;
  const caminhos = Array.from({ length: quantas }, (_, i) => {
    const y = TOPO_DAS_PORTEIRAS + (ALTURA_DAS_PORTEIRAS * (2 * i + 1)) / (2 * quantas);
    return `M0 ${centro} H50 C58 ${centro} 54 ${y} 64 ${y} H100`;
  });
  const camada = (classe: string) =>
    caminhos.map((d) => `<path class="${classe}" d="${d}" vector-effect="non-scaling-stroke"></path>`).join("");
  vias.innerHTML = camada("via-borda") + camada("via-piso") + camada("via-seta");
}

function montarPorteiras() {
  botoes = estado.abertas.map((_, i) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "porteira";
    botao.innerHTML = `<span class="porteira-conta"></span><span class="porteira-tranca" aria-hidden="true">🔒</span>`;
    botao.addEventListener("click", () => escolher(i));
    return botao;
  });
  porteiras.replaceChildren(...botoes);
  porteiras.dataset.quantas = String(botoes.length);
  desenharVias(botoes.length);
}

function travar(valor: boolean) {
  travado = valor;
  desenharPorteiras();
}

function falar(texto: string) {
  fala.textContent = texto;
}

function correr(valor: boolean) {
  estrada.dataset.correndo = valor ? "1" : "";
}

function negar(indice: number) {
  const { conta, valor } = estado.abertas[indice];
  somTrancada();
  tremer(botoes[indice]);
  falar(
    conta === "÷"
      ? `Essa não abre: ${estado.boiada} não dá para dividir certinho em ${valor}.`
      : "Essa não abre: a boiada é pequena demais para ela!",
  );
}

// O número sobe aos poucos, e os bois chegam junto com ele.
async function contar(de: number, ate: number) {
  for (let passo = 1; passo <= PASSOS_DA_CONTAGEM; passo++) {
    const atual = Math.round(de + ((ate - de) * passo) / PASSOS_DA_CONTAGEM);
    desenharContagem(atual);
    ajustarRebanho(atual);
    await esperar(26);
  }
  pular(contador);
}

// A boiada entra no caminho escolhido e a porteira passa por ela. As outras ficam onde estão,
// porque continuam na estrada. Com menos movimento, a porteira só some.
async function atravessarPorteira(indice: number) {
  const botao = botoes[indice];
  const desvio = centroDe(botao).y - centroDe(porteiras).y;
  tropa.style.translate = `0 ${desvio}px`;
  await esperar(TROCA_DE_CAMINHO);
  botao.classList.add("passada");
  animar(
    botao,
    [
      { translate: "0 0", opacity: 1 },
      { translate: `${-estrada.clientWidth}px 0`, opacity: 1 },
    ],
    PASSAGEM_DA_PORTEIRA,
    "linear",
  );
}

async function escolher(indice: number) {
  if (travado) return;
  const porteira = estado.abertas[indice];
  const antes = estado.boiada;
  const jogada = passar(estado, indice);
  if (jogada.resultado === "fechada") {
    negar(indice);
    return;
  }

  travar(true);
  falar("");
  somPorteira();
  somTrote();
  correr(true);
  await atravessarPorteira(indice);
  await esperar(ESPERA_DA_PORTEIRA);

  const depois = atravessar(antes, porteira);
  await mostrarConta(antes, depois, porteira);

  if (jogada.resultado === "passou") {
    estado = jogada.estado;
    await esperar(240);
    correr(false);
    tropa.style.translate = "";
    desenharCaminho();
    travar(false);
    return;
  }

  await chegarNaCarroca(jogada, depois);
}

async function mostrarConta(antes: number, depois: number, porteira: Porteira) {
  const centro = centroDe(xerife);
  const cresceu = depois > antes;
  flutuar(centro, nomeDe(porteira), cresceu ? "efeito-ouro" : "");
  if (cresceu) {
    somCresceu();
    somMugido(depois);
    estourar(centro, ["✨", "#ffc933", "#fff"], 8 + Math.min(20, Math.round((depois - antes) / 8)), 100);
    tremer(tropa, Math.min(8, 2 + (depois - antes) / 30));
  } else {
    somEncolheu();
  }
  await contar(antes, depois);
}

async function chegarNaCarroca(jogada: Jogada, final: number) {
  const { mapa, fase } = estado;
  const anterior = estado;
  trilha.querySelectorAll(".marca").forEach((marca) => marca.classList.add("feita"));
  falar("Olha a carroça!");
  tropa.style.translate = "";
  estrada.dataset.fim = "1";
  somCarroca();
  carroca.dataset.etapa = "chegando";
  await esperar(CHEGADA_DA_CARROCA);
  correr(false);

  falar("Todo mundo puxando!");
  tropa.dataset.puxando = "1";
  carroca.dataset.etapa = "puxando";
  somForca();
  somMugido(final);
  await esperar(1000);

  estado = jogada.estado;
  if (jogada.resultado === "fase") {
    await sairDoBarro(final, final === mapa.melhor);
    moldura.salvar(estado);
    desenharDepois();
    moldura.mostrar(telaFase(fase, estado.pontos - anterior.pontos, final === mapa.melhor));
    return;
  }

  await ficarNoBarro(mapa.meta - final);
  desenharDepois();
  if (jogada.resultado === "fim") {
    moldura.fim(estado, "A carroça ficou no barro e as vidas acabaram.");
  } else {
    moldura.mostrar(telaFaltou(mapa.meta - final));
  }
}

async function sairDoBarro(final: number, perfeita: boolean) {
  const centro = centroDe(carroca);
  carroca.dataset.etapa = "solta";
  tropa.dataset.puxando = "2";
  somSaiu();
  estourar(centro, ["#7f4519", "#5e3216", "#a8743f"], 26, 130);
  tremer(jogo, 6);
  if (perfeita) {
    somPerfeita();
    estourar(centro, ["⭐", "✨", "#ffc933"], 22, 150);
    flutuar(centroDe(estrada), "Boiada perfeita!", "efeito-ouro");
    falar(`${final} bois! Ninguém faria melhor!`);
  } else {
    falar("Saiu do barro!");
  }
  await esperar(500);
  somVitoria();
  confete();
  await esperar(1100);
}

async function ficarNoBarro(faltaram: number) {
  somFaltou();
  tropa.dataset.puxando = "cansou";
  carroca.dataset.etapa = "presa";
  falar(`Faltaram ${faltaram} ${bois(faltaram)}!`);
  tremer(carroca, 4);
  await esperar(1200);
}

// O estado já é o da próxima tentativa: a placa só muda quando o painel vai abrir.
function desenharDepois() {
  moldura.placa(estado);
}

// Apaga a chegada da estrada anterior. Roda com o painel aberto, sem nada para animar.
function comecarEstrada() {
  tropa.dataset.puxando = "";
  carroca.dataset.etapa = "";
  estrada.dataset.fim = "";
  tropa.style.translate = "";
  correr(false);
  naTela = [];
  rebanho.replaceChildren();
  ajustarRebanho(estado.boiada, false);
  meta.textContent = String(estado.mapa.meta);
  montarPorteiras();
  desenharContagem(estado.boiada);
  desenharCaminho();
  moldura.placa(estado);
  falar(estado.fase === 1 ? "Toque em uma porteira!" : `A carroça pede ${estado.mapa.meta} bois!`);
  travar(false);
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  comecarEstrada();
}

function telaFase(concluida: number, bonus: number, perfeita: boolean) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p class="placar">+${bonus} pontos</p>
    <p>${perfeita ? "Boiada perfeita! Não dava para juntar mais nenhum boi." : "Todo mundo puxou, e a carroça saiu do barro!"}</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function telaFaltou(faltaram: number) {
  return `<h2>Faltaram ${faltaram} ${bois(faltaram)}!</h2>
    <p>A carroça ficou no barro e você perdeu uma vida. A estrada é a mesma: tente passar pelas porteiras em outra ordem.</p>
    <button class="botao" type="button" data-acao="seguir">Tentar de novo</button>`;
}
