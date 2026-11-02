import { porId } from "../kit/dom";
import { animar, centroDe, confete, estourar, flutuar, pular, tremer } from "../kit/efeitos";
import { criarMoldura } from "../kit/moldura";
import { somClique, somVitoria } from "../kit/som";
import { esperar } from "../kit/tempo";
import {
  bater,
  cabeNaRota,
  concluir,
  darDica,
  novoJogo,
  rodar,
  SEMPRE,
  TRILHOS,
  type Carta,
  type Estado,
  type Lugar,
  type Passo,
  type Ponto,
  type Resultado,
  type Rota,
  type Trilho,
} from "./logica";
import { somBateu, somFaltou, somMotor, somPorCarta, somSensor, somTesouro, somTirarCarta, somVai, somVirar } from "./sons";

const seta = (caminho: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${caminho}"></path></svg>`;

const SETA_FRENTE = seta("M12 21 V4 M5 11 l7 -7 7 7");
const SETA_ESQUERDA = seta("M18 21 V12 a5 5 0 0 0 -5 -5 H5 M10 2 l-5 5 5 5");
const SETA_DIREITA = seta("M6 21 V12 a5 5 0 0 1 5 -5 h8 M14 2 l5 5 -5 5");
const SETA_VOLTA = seta("M18 3 V13 a5 5 0 0 1 -5 5 H5 M10 13 l-5 5 5 5");

const CARTAS: Record<Carta, { nome: string; desenho: string }> = {
  frente: { nome: "Frente", desenho: SETA_FRENTE },
  esquerda: { nome: "Virar à esquerda", desenho: SETA_ESQUERDA },
  direita: { nome: "Virar à direita", desenho: SETA_DIREITA },
  laco: { nome: "Repetir", desenho: "🔁" },
  truque: { nome: "Truque", desenho: "⭐" },
  seDireita: { nome: "Se tiver pedra, vire à direita", desenho: `<i class="sinal"></i>${SETA_DIREITA}` },
  seEsquerda: { nome: "Se tiver pedra, vire à esquerda", desenho: `<i class="sinal"></i>${SETA_ESQUERDA}` },
};

const mini = (...cartas: Carta[]) =>
  cartas.map((carta) => `<span class="carta" data-carta="${carta}">${CARTAS[carta].desenho}</span>`).join("");

// A estreia de cada carta. O exemplo mostra com as próprias cartas, para quem ainda lê pouco.
const NOVIDADES: Record<number, string> = {
  4: `<p><strong>Nova carta: 🔁 Repetir!</strong></p>
    <p>Tudo o que estiver na caixa 🔁 acontece várias vezes. Toque no número para escolher quantas.</p>
    <div class="exemplo" aria-hidden="true">
      <span class="caixa caixa-laco">🔁×2 ${mini("frente", "direita")}</span>
      = ${mini("frente", "direita", "frente", "direita")}
    </div>`,
  7: `<p><strong>Nova carta: ⭐ Truque!</strong></p>
    <p>Monte uma sequência na caixa ⭐. Cada ⭐ que você puser na rota faz tudo o que está na caixa.</p>
    <div class="exemplo" aria-hidden="true">
      <span class="caixa caixa-truque">⭐ ${mini("frente", "direita")}</span>
    </div>
    <div class="exemplo" aria-hidden="true">
      ${mini("truque", "frente", "truque")} = ${mini("frente", "direita", "frente", "frente", "direita")}
    </div>`,
  10: `<p><strong>Novas cartas: sensores!</strong></p>
    <p>Com pedra ou parede bem na frente, o submarino vira sozinho. Sem nada na frente, ele segue a rota. E agora o 🔁 pode repetir para sempre: ∞</p>`,
};

const DESFECHOS: Record<Exclude<Resultado, "venceu">, string> = {
  bateu: "Bateu! Conserte a rota e tente de novo.",
  faltou: "Ainda falta tesouro! Conserte a rota.",
  circulos: "Ele está andando em círculos!",
};

const PASSO_MS = 300;
const SENSOR_MS = 140;

const mar = porId("mar");
const sub = porId("sub");
const fala = porId("fala");
const fileiras = porId("fileiras");
const baralho = porId("baralho");
const vai = porId("vai") as HTMLButtonElement;
const dica = porId("dica") as HTMLButtonElement;

const moldura = criarMoldura({ aoComecar: comecar, aoSeguir: prepararFase });

let estado: Estado = novoJogo();
let rota: Rota = estado.pronto.rota;
let cursor = { trilho: "principal" as Trilho, indice: 0 };
let tesouros: HTMLElement[] = [];
let rodando = false;
let parar = false;
// O submarino ficou onde a rota terminou, para a criança ver o que deu errado.
let foraDoInicio = false;
let tentativas = 0;
let giro = 0;
let rumo = 0;

const falar = (texto: string) => (fala.textContent = texto);

function posicionar(el: HTMLElement, { x, y }: Ponto) {
  el.style.setProperty("--x", String(x));
  el.style.setProperty("--y", String(y));
}

// O giro acumula, para ir pelo lado mais curto em vez de dar a volta inteira.
function apontar(direcao: number) {
  giro += ((direcao - rumo + 5) % 4) - 1;
  rumo = direcao;
  sub.style.setProperty("--giro", `${giro * 90}deg`);
}

function criarPeca(ponto: Ponto, classe: string, texto = "") {
  const peca = document.createElement("div");
  peca.className = `peca ${classe}`;
  peca.textContent = texto;
  posicionar(peca, ponto);
  return peca;
}

function desenharMapa() {
  const { pedras, tesouros: lista } = estado.mapa;
  tesouros = lista.map((tesouro) => criarPeca(tesouro, "tesouro", "💎"));
  mar.querySelectorAll(".peca").forEach((peca) => peca.remove());
  mar.prepend(...pedras.map((pedra) => criarPeca(pedra, "pedra")), ...tesouros);
}

function criarCarta(carta: Carta) {
  const { nome, desenho } = CARTAS[carta];
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "carta";
  botao.dataset.carta = carta;
  botao.setAttribute("aria-label", nome);
  botao.innerHTML = desenho;
  return botao;
}

const textoVezes = (vezes: number) => (vezes === SEMPRE ? "×∞" : `×${vezes}`);

function criarBotao(classe: string, nome: string, acao: () => void) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.disabled = rodando;
  botao.setAttribute("aria-label", nome);
  botao.addEventListener("click", acao);
  return botao;
}

function criarRotulo(trilho: Trilho) {
  if (trilho === "laco") {
    const nome = rota.vezes === SEMPRE ? "Repetir sempre" : `Repetir ${rota.vezes} vezes`;
    const botao = criarBotao("rotulo vezes", nome, trocarVezes);
    botao.textContent = textoVezes(rota.vezes);
    return botao;
  }
  const rotulo = document.createElement("span");
  rotulo.className = "rotulo";
  rotulo.textContent = "⭐";
  return rotulo;
}

function criarCasa(trilho: Trilho, indice: number) {
  const carta = rota[trilho][indice];
  const casa = carta ? criarCarta(carta) : document.createElement("button");
  casa.type = "button";
  casa.classList.add("carta", "casa");
  casa.classList.toggle("casa-vazia", !carta);
  casa.classList.toggle("cursor", !rodando && cursor.trilho === trilho && cursor.indice === indice);
  casa.dataset.trilho = trilho;
  casa.dataset.indice = String(indice);
  casa.disabled = rodando;
  if (!carta) casa.setAttribute("aria-label", "Espaço vazio");
  casa.addEventListener("click", () => tocarCasa(trilho, indice));
  return casa;
}

function criarFileira(trilho: Trilho, conteudo: HTMLElement[]) {
  const fileira = document.createElement("div");
  fileira.className = `fileira fileira-${trilho}`;
  fileira.dataset.fileira = trilho;
  const casas = document.createElement("div");
  casas.className = "casas";
  casas.append(...conteudo);
  fileira.append(casas);
  return fileira;
}

const casasDe = (trilho: Trilho) => Array.from({ length: estado.vagas[trilho] }, (_, indice) => criarCasa(trilho, indice));

function criarTruque() {
  const bloco = criarFileira("truque", casasDe("truque"));
  bloco.prepend(criarRotulo("truque"));
  return bloco;
}

// O bloco do 🔁 toma o lugar da carta dele na rota: o que vem antes e depois fica à vista.
function criarBloco(indice: number) {
  const bloco = criarFileira("laco", casasDe("laco"));
  bloco.prepend(criarRotulo("laco"));
  bloco.insertAdjacentHTML("beforeend", `<span class="volta-seta">${SETA_VOLTA}</span>`);
  bloco.append(criarBotao("tirar-bloco", "Tirar o bloco", () => tocarCasa("principal", indice)));
  return bloco;
}

// Uma casa só para pôr carta antes do bloco, que não tem como receber o cursor.
function criarCasaAntes(indice: number) {
  const casa = criarBotao("carta casa casa-vazia casa-antes", "Espaço antes do bloco", () => apontarCursor(indice));
  casa.classList.toggle("cursor", !rodando && cursor.trilho === "principal" && cursor.indice === indice);
  return casa;
}

function criarPrincipal() {
  const sobra = estado.vagas.principal > rota.principal.length;
  const conteudo = casasDe("principal").flatMap((casa, indice) => {
    if (rota.principal[indice] !== "laco") return [casa];
    return sobra ? [criarCasaAntes(indice), criarBloco(indice)] : [criarBloco(indice)];
  });
  return criarFileira("principal", conteudo);
}

function desenharBaralho() {
  const cheia = rota[cursor.trilho].length >= estado.vagas[cursor.trilho];
  baralho.querySelectorAll<HTMLButtonElement>(".carta").forEach((botao) => {
    botao.disabled = rodando || cheia || !cabeNaRota(rota, cursor.trilho, botao.dataset.carta as Carta);
  });
}

function desenharRota() {
  fileiras.replaceChildren(criarPrincipal(), ...(estado.vagas.truque > 0 ? [criarTruque()] : []));
  desenharBaralho();
  vai.textContent = rodando ? "Parar" : "Vai!";
  vai.classList.toggle("botao-claro", rodando);
  vai.disabled = !rodando && rota.principal.length === 0;
  dica.hidden = tentativas === 0;
  dica.disabled = rodando;
}

function montarBaralho() {
  const cartas = estado.cartas.map((carta) => {
    const botao = criarCarta(carta);
    botao.addEventListener("click", () => porCarta(carta));
    return botao;
  });
  baralho.replaceChildren(...cartas);
}

function voltarAoInicio() {
  if (!foraDoInicio) return;
  foraDoInicio = false;
  posicionar(sub, estado.mapa.inicio);
  apontar(estado.mapa.direcao);
  tesouros.forEach((tesouro) => (tesouro.hidden = false));
  falar("");
}

function porCarta(carta: Carta) {
  voltarAoInicio();
  const { trilho, indice } = cursor;
  const cartas = rota[trilho];
  rota = { ...rota, [trilho]: [...cartas.slice(0, indice), carta, ...cartas.slice(indice)] };
  cursor = { trilho, indice: indice + 1 };
  // Quem põe a carta de uma fileira ainda vazia quer montar essa fileira agora.
  if (carta === "laco" && rota.laco.length === 0) cursor = { trilho: "laco", indice: 0 };
  if (carta === "truque" && rota.truque.length === 0) cursor = { trilho: "truque", indice: 0 };
  somPorCarta();
  desenharRota();
}

function tocarCasa(trilho: Trilho, indice: number) {
  voltarAoInicio();
  const cartas = rota[trilho];
  if (indice < cartas.length) {
    rota = { ...rota, [trilho]: cartas.filter((_, i) => i !== indice) };
    somTirarCarta();
  } else {
    somClique();
  }
  cursor = { trilho, indice: Math.min(indice, rota[trilho].length) };
  desenharRota();
}

function apontarCursor(indice: number) {
  voltarAoInicio();
  cursor = { trilho: "principal", indice };
  somClique();
  desenharRota();
}

function trocarVezes() {
  voltarAoInicio();
  const { vezes } = estado;
  rota = { ...rota, vezes: vezes[(vezes.indexOf(rota.vezes) + 1) % vezes.length] };
  somClique();
  desenharRota();
}

function casaDe({ trilho, indice }: Lugar) {
  return fileiras.querySelector(`[data-trilho="${trilho}"][data-indice="${indice}"]`);
}

function marcarCasa(casa: Element | null, classe: string) {
  fileiras.querySelectorAll(`.${classe}`).forEach((marcada) => marcada.classList.remove(classe));
  casa?.classList.add(classe);
}

// Acende a carta do passo, as cartas que levaram até ela e o bloco onde ela está.
function acender(passo: Passo) {
  const lugares = [...passo.chamadas, passo];
  marcarCasa(casaDe(passo), "ativa");
  fileiras.querySelectorAll(".chamou").forEach((casa) => casa.classList.remove("chamou"));
  passo.chamadas.forEach((chamada) => casaDe(chamada)?.classList.add("chamou"));
  fileiras.querySelectorAll<HTMLElement>(".fileira").forEach((fileira) => {
    fileira.classList.toggle("rodando", lugares.some(({ trilho }) => trilho === fileira.dataset.fileira));
  });

  const contador = fileiras.querySelector(".vezes");
  const texto = rota.vezes === SEMPRE ? String(passo.volta) : `${passo.volta}/${rota.vezes}`;
  if (contador && passo.volta > 0 && contador.textContent !== texto) {
    contador.textContent = texto;
    pular(contador, 1.08);
  }
}

async function tocarPasso(passo: Passo) {
  acender(passo);
  const sensor = passo.carta === "seDireita" || passo.carta === "seEsquerda";
  if (sensor && !passo.disparou) {
    await esperar(SENSOR_MS);
    return;
  }

  posicionar(sub, passo);
  apontar(passo.direcao);
  if (sensor) somSensor();
  else if (passo.carta === "frente") somMotor();
  else somVirar();
  await esperar(PASSO_MS);

  if (passo.pegou !== null) {
    const tesouro = tesouros[passo.pegou];
    somTesouro();
    estourar(centroDe(tesouro), ["💎", "✨", "#7fe3ff"], 8, 50);
    tesouro.hidden = true;
  }
}

async function mergulhar() {
  if (rodando) {
    parar = true;
    return;
  }
  const voltando = foraDoInicio;
  voltarAoInicio();
  rodando = true;
  parar = false;
  falar("");
  somVai();
  desenharRota();
  if (voltando) await esperar(PASSO_MS);

  const { passos, resultado } = rodar(estado.mapa, rota);
  for (const passo of passos) {
    if (parar) break;
    await tocarPasso(passo);
  }

  foraDoInicio = true;
  if (parar) {
    voltarAoInicio();
    liberar();
    return;
  }
  // Ao vencer, continua travado: o estado já é o da próxima fase, e a tela dela vem a seguir.
  if (resultado === "venceu") {
    await vencer();
    return;
  }
  liberar();
  desfecho(resultado, passos.at(-1));
}

function liberar() {
  rodando = false;
  desenharRota();
}

function desfecho(resultado: Exclude<Resultado, "venceu">, ultimo?: Passo) {
  tentativas++;
  dica.hidden = false;
  falar(DESFECHOS[resultado]);
  if (ultimo) marcarCasa(casaDe(ultimo), "erro");
  if (resultado === "bateu") colidir();
  else somFaltou();
}

async function colidir() {
  estado = bater(estado);
  moldura.placa(estado);
  somBateu();
  tremer(mar, 8);
  estourar(centroDe(sub), ["💥", "#bfe9ff", "#fff"], 10, 70);
  animar(sub, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], 300);
  if (estado.vidas > 0) return;
  rodando = true;
  desenharRota();
  await esperar(900);
  moldura.fim(estado, "O submarino bateu demais e voltou para o porto.");
}

async function vencer() {
  const anterior = estado;
  estado = concluir(estado, rota);
  moldura.salvar(estado);
  falar("Achou tudo!");
  somVitoria();
  confete();
  flutuar(centroDe(sub), "Achou tudo!", "efeito-ouro");
  pular(sub, 1.5);
  await esperar(1200);
  moldura.placa(estado);
  moldura.mostrar(telaFase(anterior.fase, estado.pontos - anterior.pontos));
}

function telaFase(concluida: number, bonus: number) {
  return `<h2>Fase ${concluida} completa!</h2>
    <p class="placar">+${bonus} pontos</p>
    ${NOVIDADES[estado.fase] ?? ""}
    <p>Quanto menos cartas você usar, mais pontos ganha.</p>
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function prepararFase() {
  const { mapa, pronto, fase } = estado;
  rota = pronto.rota;
  cursor = { trilho: pronto.trilho, indice: rota[pronto.trilho].length };
  tentativas = 0;
  rodando = false;
  foraDoInicio = false;
  moldura.placa(estado);
  desenharMapa();
  posicionar(sub, mapa.inicio);
  apontar(mapa.direcao);
  montarBaralho();
  desenharRota();
  const comecada = TRILHOS.some((trilho) => rota[trilho].length > 0);
  falar(fase === 1 ? "Toque nas cartas e aperte Vai!" : comecada ? "Complete a rota!" : "");
}

// Quem volta direto para uma fase de estreia não passou pela tela de fase completa.
function telaEstreia(fase: number) {
  return `<h2>Fase ${fase}</h2>
    ${NOVIDADES[fase]}
    <button class="botao" type="button" data-acao="seguir">Continuar</button>`;
}

function comecar(fase: number) {
  estado = novoJogo(fase);
  prepararFase();
  if (NOVIDADES[fase]) moldura.mostrar(telaEstreia(fase));
}

vai.addEventListener("click", mergulhar);

dica.addEventListener("click", () => {
  voltarAoInicio();
  rota = darDica(rota, estado.solucao);
  estado = { ...estado, dicas: estado.dicas + 1 };
  const noBloco = rota.principal.includes("laco") && rota.laco.length > 0;
  const trilho = rota.truque.length > 0 ? "truque" : noBloco ? "laco" : "principal";
  cursor = { trilho, indice: rota[trilho].length };
  somPorCarta();
  desenharRota();
});

prepararFase();
